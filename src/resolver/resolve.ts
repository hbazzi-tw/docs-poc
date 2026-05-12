// ---------------------------------------------------------------------------
// Template resolver. Mirrors RFC §3.4:
//
//   Template (PM JSON) + Bindings + Active Clause versions
//             │
//             ▼   Resolve conditionals (drop or keep children of then-branch)
//             │
//             ▼   Expand clause_refs (splice clause AST into tree)
//             │
//             ▼   Substitute variable_refs
//             │
//             ▼   Expand for_each loops
//             │
//             ▼   isResolved check → ResolvedPMDoc
//
// In this POC the passes are interleaved in a single recursive walk: a node
// can produce 0..N replacement nodes, and the walker re-runs on the
// replacements so that a `clause_ref` whose body contains a `conditional`
// resolves fully.
// ---------------------------------------------------------------------------

import type {
  Bindings,
  Clause,
  PMDoc,
  PMNode,
  PMBlockNode,
  PMInlineNode,
  PMVariableRef,
  PMDefinedTerm,
  PMClauseRef,
  PMConditional,
  PMForEach,
  PMSignatureBlock,
  PMHeading,
  PMParagraph,
  PMListItem,
  PMTextNode,
  ResolvedPMDoc,
} from '../types';
import { evalBool, evalExpr, resolvePath } from './expression';
import { lookupTerm } from '../store/terms';

type ClauseLookup = (id: string, version: string) => Clause | undefined;

export type ResolveResult = {
  doc: ResolvedPMDoc;
  resolved: boolean;
  warnings: string[];
};

const MAX_DEPTH = 32; // guard against clause_ref cycles

export function resolveTemplate(
  template: PMDoc,
  bindings: Bindings,
  lookupClause: ClauseLookup,
): ResolveResult {
  const warnings: string[] = [];

  const walk = (nodes: PMNode[], scope: Bindings, depth: number): PMNode[] => {
    if (depth > MAX_DEPTH) {
      warnings.push('Max resolver depth exceeded — possible clause cycle');
      return [];
    }
    const out: PMNode[] = [];
    for (const node of nodes) {
      const replacements = resolveNode(node, scope, depth);
      for (const r of replacements) out.push(r);
    }
    return out;
  };

  const resolveNode = (node: PMNode, scope: Bindings, depth: number): PMNode[] => {
    switch (node.type) {
      case 'variable_ref': {
        return [resolveVariable(node, scope, warnings)];
      }
      case 'defined_term': {
        // Always 0..N inline nodes — usually 1 text node, occasionally
        // multiple if fallback content carried marks.
        return resolveDefinedTerm(node, scope, warnings);
      }
      case 'clause_ref': {
        const clauseRef = node as PMClauseRef;
        const clause = lookupClause(clauseRef.attrs.clauseId, clauseRef.attrs.version);
        if (!clause) {
          warnings.push(`Missing clause: ${clauseRef.attrs.clauseId}@${clauseRef.attrs.version}`);
          return [
            paragraph([
              text(`⚠️ [missing clause: ${clauseRef.attrs.clauseId}]`, [{ type: 'italic' }]),
            ]),
          ];
        }
        // Splice the clause's children in place; recurse.
        const inner = clause.ast.content ?? [];
        return walk(inner as PMNode[], scope, depth + 1);
      }
      case 'conditional': {
        const cond = node as PMConditional;
        const keep = evalBool(cond.attrs.condition, scope);
        if (!keep) return [];
        return walk((cond.content ?? []) as PMNode[], scope, depth + 1);
      }
      case 'for_each': {
        const loop = node as PMForEach;
        const collection = resolvePath(loop.attrs.over, scope);
        if (!Array.isArray(collection)) return [];
        const result: PMNode[] = [];
        for (let i = 0; i < collection.length; i++) {
          const item = collection[i];
          const subScope: Bindings = {
            ...scope,
            [loop.attrs.as]: item,
            $index: i,
            $isFirst: i === 0,
            $isLast: i === collection.length - 1,
          };
          for (const r of walk((loop.content ?? []) as PMNode[], subScope, depth + 1)) {
            result.push(r);
          }
        }
        return result;
      }
      case 'paragraph': {
        const p = node as PMParagraph;
        return [{ ...p, content: walkInline(p.content ?? [], scope) } as PMNode];
      }
      case 'heading': {
        const h = node as PMHeading;
        return [{ ...h, content: walkInline(h.content ?? [], scope) } as PMNode];
      }
      case 'bulletList':
      case 'orderedList': {
        const list = node as any;
        return [{ ...list, content: walk(list.content ?? [], scope, depth + 1) }];
      }
      case 'listItem': {
        const li = node as PMListItem;
        return [{ ...li, content: walk((li.content ?? []) as PMNode[], scope, depth + 1) as PMBlockNode[] }];
      }
      case 'signature_block': {
        // Mostly a pure data node, but the resolver does one favor: if the
        // block's `state` attr is null/empty AND the bindings have a
        // `testator.state` value, fill it in. Saves attorneys from setting
        // state in two places (binding + block attr).
        const sb = node as PMSignatureBlock;
        if (!sb.attrs.state) {
          const testatorState = (resolvePath('testator.state', scope) as string | undefined) ?? null;
          if (testatorState) {
            return [{ ...sb, attrs: { ...sb.attrs, state: testatorState } } as PMSignatureBlock];
          }
        }
        return [sb];
      }
      case 'text':
        return [node];
      case 'doc':
        // shouldn't recurse into another doc, but tolerate it
        return walk(((node as PMDoc).content ?? []) as PMNode[], scope, depth + 1);
      default:
        return [node];
    }
  };

  const walkInline = (nodes: PMInlineNode[], scope: Bindings): PMInlineNode[] => {
    const out: PMInlineNode[] = [];
    for (const n of nodes) {
      if (n.type === 'variable_ref') {
        out.push(resolveVariable(n, scope, warnings) as PMInlineNode);
      } else if (n.type === 'defined_term') {
        for (const r of resolveDefinedTerm(n, scope, warnings)) {
          out.push(r as PMInlineNode);
        }
      } else {
        out.push(n);
      }
    }
    return out;
  };

  const resolved: PMDoc = {
    type: 'doc',
    content: walk(template.content ?? [], bindings, 0) as PMBlockNode[],
  };

  const fullyResolved = isResolved(resolved);
  return {
    doc: resolved as ResolvedPMDoc,
    resolved: fullyResolved,
    warnings,
  };
}

// Resolve a defined_term against the per-state dictionary. If the
// testator's state has an override for this term, emit that string.
// Otherwise emit the node's `defaultText` attribute as a single text node.
function resolveDefinedTerm(node: PMDefinedTerm, scope: Bindings, warnings: string[]): PMInlineNode[] {
  const stateName = resolvePath('testator.state', scope) as string | undefined;
  const override = lookupTerm(node.attrs.term, stateName);
  if (override !== null) {
    return [{ type: 'text', text: override }];
  }
  if (node.attrs.defaultText) {
    return [{ type: 'text', text: node.attrs.defaultText }];
  }
  warnings.push(`defined_term '${node.attrs.term}' has no defaultText and no dictionary entry for state '${stateName ?? '(unset)'}'`);
  return [{ type: 'text', text: `[${node.attrs.term}]` }];
}

function resolveVariable(node: PMVariableRef, scope: Bindings, warnings: string[]): PMTextNode {
  const raw = resolvePath(node.attrs.path, scope);
  let val: string;
  // Empty string is a valid binding value (e.g. settlor_plural='' for a
  // single-settlor trust → "Settlor" not "Settlors"). Only undefined/null
  // count as missing. And only warn when the template provided no fallback
  // at all — an explicit fallback of '' means the author chose empty.
  if (raw === undefined || raw === null) {
    val = node.attrs.fallback ?? '';
    if (node.attrs.fallback === undefined || node.attrs.fallback === null) {
      warnings.push(`Missing binding: ${node.attrs.path}`);
    }
  } else {
    val = String(raw);
  }
  switch (node.attrs.transform) {
    case 'upper': val = val.toUpperCase(); break;
    case 'lower': val = val.toLowerCase(); break;
    case 'title': val = val.replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase()); break;
  }
  return { type: 'text', text: val };
}

export function isResolved(doc: PMDoc): boolean {
  const UNRESOLVED = new Set(['variable_ref', 'conditional', 'for_each', 'clause_ref', 'defined_term']);
  const visit = (nodes: PMNode[]): boolean => {
    for (const n of nodes) {
      if (UNRESOLVED.has(n.type)) return false;
      const children = (n as any).content;
      if (Array.isArray(children) && !visit(children)) return false;
    }
    return true;
  };
  return visit(doc.content ?? []);
}

// Convenience: helpers used in the resolver to construct text nodes / paragraphs
function text(value: string, marks?: any[]): PMTextNode {
  return marks ? { type: 'text', text: value, marks } : { type: 'text', text: value };
}
function paragraph(content: PMInlineNode[]): PMParagraph {
  return { type: 'paragraph', content };
}
