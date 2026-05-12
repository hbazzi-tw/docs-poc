// ---------------------------------------------------------------------------
// Tiny sandboxed expression evaluator. Intentionally narrow surface; no eval.
//
// Supported grammar (BNF-ish):
//   expr     := or
//   or       := and ('||' and)*
//   and      := not ('&&' not)*
//   not      := '!' not | cmp
//   cmp      := add (('==' | '!=' | '>=' | '<=' | '>' | '<') add)?
//   add      := mul (('+' | '-') mul)*
//   mul      := unary (('*' | '/') unary)*
//   unary    := '-' unary | atom
//   atom     := literal | path | '(' expr ')'
//   literal  := number | "'string'" | '"string"' | 'true' | 'false' | 'null'
//   path     := IDENT ('.' IDENT)*    e.g. testator.name, children.length
//
// `children.length` is special-cased: when the path ends in '.length' and the
// preceding value is an array, returns its length.
//
// Falsy bindings: if a path doesn't resolve, evaluates to undefined (treated
// as falsy in boolean position). This matches the legacy `if (willOptions.x)`
// pattern from tw-pdf-svc.
// ---------------------------------------------------------------------------

import type { Bindings } from '../types';

type Tok =
  | { kind: 'num'; value: number }
  | { kind: 'str'; value: string }
  | { kind: 'bool'; value: boolean }
  | { kind: 'null' }
  | { kind: 'ident'; value: string }
  | { kind: 'op'; value: string }
  | { kind: 'lparen' }
  | { kind: 'rparen' }
  | { kind: 'dot' };

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === ' ' || c === '\t' || c === '\n') { i++; continue; }
    if (c === '(') { out.push({ kind: 'lparen' }); i++; continue; }
    if (c === ')') { out.push({ kind: 'rparen' }); i++; continue; }
    if (c === '.') { out.push({ kind: 'dot' }); i++; continue; }
    if (c === "'" || c === '"') {
      const quote = c;
      let j = i + 1;
      let s = '';
      while (j < src.length && src[j] !== quote) {
        if (src[j] === '\\' && j + 1 < src.length) { s += src[j + 1]; j += 2; }
        else { s += src[j]; j++; }
      }
      if (src[j] !== quote) throw new Error(`Unterminated string at ${i}`);
      out.push({ kind: 'str', value: s });
      i = j + 1;
      continue;
    }
    if (/[0-9]/.test(c)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      out.push({ kind: 'num', value: Number(src.slice(i, j)) });
      i = j;
      continue;
    }
    if (/[A-Za-z_$]/.test(c)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_$]/.test(src[j])) j++;
      const word = src.slice(i, j);
      if (word === 'true') out.push({ kind: 'bool', value: true });
      else if (word === 'false') out.push({ kind: 'bool', value: false });
      else if (word === 'null' || word === 'undefined') out.push({ kind: 'null' });
      else out.push({ kind: 'ident', value: word });
      i = j;
      continue;
    }
    const two = src.slice(i, i + 2);
    if (['==', '!=', '>=', '<=', '&&', '||'].includes(two)) {
      out.push({ kind: 'op', value: two });
      i += 2;
      continue;
    }
    if ('+-*/<>!'.includes(c)) {
      out.push({ kind: 'op', value: c });
      i++;
      continue;
    }
    throw new Error(`Unexpected character '${c}' at ${i}`);
  }
  return out;
}

class Parser {
  private pos = 0;
  constructor(private toks: Tok[]) {}

  private peek(): Tok | undefined { return this.toks[this.pos]; }
  private eat(): Tok | undefined { return this.toks[this.pos++]; }
  private match(kind: Tok['kind'], value?: string): boolean {
    const t = this.peek();
    if (!t) return false;
    if (t.kind !== kind) return false;
    if (value !== undefined && (t as any).value !== value) return false;
    return true;
  }
  private consume(kind: Tok['kind'], value?: string): Tok {
    if (!this.match(kind, value)) {
      throw new Error(`Expected ${kind}${value !== undefined ? ` "${value}"` : ''} at position ${this.pos}`);
    }
    return this.eat()!;
  }

  parseExpr(): AstNode {
    const node = this.parseOr();
    if (this.peek()) throw new Error(`Unexpected trailing token at position ${this.pos}`);
    return node;
  }

  private parseOr(): AstNode {
    let left = this.parseAnd();
    while (this.match('op', '||')) { this.eat(); left = { kind: 'binop', op: '||', left, right: this.parseAnd() }; }
    return left;
  }
  private parseAnd(): AstNode {
    let left = this.parseNot();
    while (this.match('op', '&&')) { this.eat(); left = { kind: 'binop', op: '&&', left, right: this.parseNot() }; }
    return left;
  }
  private parseNot(): AstNode {
    if (this.match('op', '!')) { this.eat(); return { kind: 'unop', op: '!', operand: this.parseNot() }; }
    return this.parseCmp();
  }
  private parseCmp(): AstNode {
    const left = this.parseAdd();
    const ops = ['==', '!=', '>=', '<=', '>', '<'];
    for (const op of ops) {
      if (this.match('op', op)) { this.eat(); return { kind: 'binop', op, left, right: this.parseAdd() }; }
    }
    return left;
  }
  private parseAdd(): AstNode {
    let left = this.parseMul();
    while (this.match('op', '+') || this.match('op', '-')) {
      const op = (this.eat() as Tok & { value: string }).value;
      left = { kind: 'binop', op, left, right: this.parseMul() };
    }
    return left;
  }
  private parseMul(): AstNode {
    let left = this.parseUnary();
    while (this.match('op', '*') || this.match('op', '/')) {
      const op = (this.eat() as Tok & { value: string }).value;
      left = { kind: 'binop', op, left, right: this.parseUnary() };
    }
    return left;
  }
  private parseUnary(): AstNode {
    if (this.match('op', '-')) { this.eat(); return { kind: 'unop', op: '-', operand: this.parseUnary() }; }
    return this.parseAtom();
  }
  private parseAtom(): AstNode {
    const t = this.peek();
    if (!t) throw new Error('Unexpected end of expression');
    if (t.kind === 'lparen') { this.eat(); const e = this.parseOr(); this.consume('rparen'); return e; }
    if (t.kind === 'num') { this.eat(); return { kind: 'lit', value: t.value }; }
    if (t.kind === 'str') { this.eat(); return { kind: 'lit', value: t.value }; }
    if (t.kind === 'bool') { this.eat(); return { kind: 'lit', value: t.value }; }
    if (t.kind === 'null') { this.eat(); return { kind: 'lit', value: null }; }
    if (t.kind === 'ident') {
      const parts: string[] = [t.value];
      this.eat();
      while (this.match('dot')) {
        this.eat();
        const id = this.consume('ident');
        parts.push((id as Tok & { value: string }).value);
      }
      return { kind: 'path', parts };
    }
    throw new Error(`Unexpected token at position ${this.pos}: ${JSON.stringify(t)}`);
  }
}

type AstNode =
  | { kind: 'lit'; value: unknown }
  | { kind: 'path'; parts: string[] }
  | { kind: 'unop'; op: string; operand: AstNode }
  | { kind: 'binop'; op: string; left: AstNode; right: AstNode };

function lookupPath(scope: Bindings, parts: string[]): unknown {
  let cur: any = scope;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (cur == null) return undefined;
    if (part === 'length' && Array.isArray(cur)) return cur.length;
    if (part === 'length' && typeof cur === 'string') return cur.length;
    cur = cur[part];
  }
  return cur;
}

function evaluate(node: AstNode, scope: Bindings): unknown {
  switch (node.kind) {
    case 'lit': return node.value;
    case 'path': return lookupPath(scope, node.parts);
    case 'unop': {
      const v = evaluate(node.operand, scope);
      if (node.op === '!') return !v;
      if (node.op === '-') return -(v as number);
      throw new Error(`Unknown unary op: ${node.op}`);
    }
    case 'binop': {
      // short-circuit boolean ops
      if (node.op === '&&') return Boolean(evaluate(node.left, scope)) && Boolean(evaluate(node.right, scope));
      if (node.op === '||') return Boolean(evaluate(node.left, scope)) || Boolean(evaluate(node.right, scope));
      const l = evaluate(node.left, scope);
      const r = evaluate(node.right, scope);
      switch (node.op) {
        case '==': return l === r;
        case '!=': return l !== r;
        case '>': return (l as any) > (r as any);
        case '<': return (l as any) < (r as any);
        case '>=': return (l as any) >= (r as any);
        case '<=': return (l as any) <= (r as any);
        case '+': return (l as any) + (r as any);
        case '-': return (l as any) - (r as any);
        case '*': return (l as any) * (r as any);
        case '/': return (l as any) / (r as any);
        default: throw new Error(`Unknown binary op: ${node.op}`);
      }
    }
  }
}

const cache = new Map<string, AstNode>();

export function evalExpr(src: string, scope: Bindings): unknown {
  let node = cache.get(src);
  if (!node) {
    node = new Parser(tokenize(src)).parseExpr();
    cache.set(src, node);
  }
  return evaluate(node, scope);
}

export function evalBool(src: string, scope: Bindings): boolean {
  try {
    return Boolean(evalExpr(src, scope));
  } catch {
    return false;
  }
}

export function resolvePath(path: string, scope: Bindings): unknown {
  return lookupPath(scope, path.split('.'));
}
