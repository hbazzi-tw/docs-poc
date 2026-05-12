import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import React, { useEffect, useState } from 'react';
import { getClause, getClauses, saveClause, forkClause } from '../../store/store';
import { RenderResolvedDoc } from '../../renderer/HtmlRenderer';
import { TiptapEditor } from '../TiptapEditor';
import type { PMDoc, ResolvedPMDoc } from '../../types';

export const ClauseRef = Node.create({
  name: 'clause_ref',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      clauseId: { default: '' },
      version: { default: 'latest' },
      pinned: { default: false },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="clause-ref"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-type': 'clause-ref', class: 'pm-clause-ref' }, HTMLAttributes), `[clause: ${HTMLAttributes.clauseId}]`];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ClauseRefNodeView);
  },
});

function ClauseRefNodeView({ node, updateAttributes, editor }: NodeViewProps) {
  const [picking, setPicking] = useState(false);
  const [editing, setEditing] = useState(false);
  // Bumped on every store-change event so the inline render fetches a fresh
  // clause snapshot when the clause's AST is mutated elsewhere (including
  // by the nested editor inside this very node).
  const [storeTick, setStoreTick] = useState(0);
  useEffect(() => {
    const onChange = () => setStoreTick((t) => t + 1);
    window.addEventListener('tw-poc-store-change', onChange);
    return () => window.removeEventListener('tw-poc-store-change', onChange);
  }, []);
  void storeTick; // referenced so React tracks the dep for the fresh getClause call below

  const { clauseId, version, pinned } = node.attrs;
  const clause = clauseId ? getClause(clauseId, version) : undefined;

  const allClauses = getClauses();
  const grouped = new Map<string, typeof allClauses>();
  for (const c of allClauses) {
    if (!grouped.has(c.id)) grouped.set(c.id, []);
    grouped.get(c.id)!.push(c);
  }

  const canEditOuter = editor.isEditable;

  // Edit flow. Drafts edit directly. Published versions fork first — a new
  // draft is created and this clause_ref is repinned to it — so the
  // frozen-on-publish invariant holds regardless of entry point. Matches
  // ClauseEditor's "Fork as new draft" semantics; difference here is we
  // also flip the ref's `pinned` so the in-template edits show up
  // immediately (otherwise `latest` would keep resolving to the previous
  // published version).
  const startEdit = () => {
    if (!canEditOuter || !clause) return;
    if (clause.status === 'published') {
      const ok = confirm(
        `"${clause.name}" v${clause.version} is published and frozen.\n\n` +
        `Fork to a new draft to edit it inline? This template will pin to the ` +
        `new draft so your edits show up here immediately. Other templates that ` +
        `pin v${clause.version} keep resolving to the current published content.`
      );
      if (!ok) return;
      const next = forkClause(clause);
      if (!next) {
        alert('Could not fork clause — bumped version slot already exists as published.');
        return;
      }
      updateAttributes({ version: next.version, pinned: true });
      setEditing(true);
      return;
    }
    setEditing(true);
  };

  const onClauseAstChange = (ast: PMDoc) => {
    if (!clause || clause.status === 'published') return;
    saveClause({ ...clause, ast });
  };

  return (
    <NodeViewWrapper className="pm-clause-ref pm-clause-ref-inline">
      <div
        className="pm-clause-inline-header"
        contentEditable={false}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <span className="lbl">▸ clause</span>
        <span className="id">{clauseId || '(unset)'}</span>
        <span className="ver">@{version}{pinned ? ' (pinned)' : ''}</span>
        {clause && (
          <span style={{ marginLeft: 8, color: 'var(--ink-2)', fontSize: 11 }}>
            · {clause.name} · v{clause.version} · {clause.status}
            {clause.jurisdiction ? ` · ${clause.jurisdiction}` : ''}
          </span>
        )}
        <span style={{ flex: 1 }} />
        {canEditOuter && !picking && !editing && (
          <>
            {clause && (
              <button
                onClick={(e) => { e.stopPropagation(); startEdit(); }}
                className="ghost"
                style={{ fontSize: 11 }}
                title={clause.status === 'published'
                  ? 'Edit clause — published versions are frozen, so this will fork a new draft first and pin this reference to it'
                  : 'Edit this draft clause inline'}
              >
                ✎ edit clause
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); setPicking(true); }}
              className="ghost"
              style={{ fontSize: 11 }}
              title="Change which clause this reference points to"
            >
              change ref
            </button>
          </>
        )}
        {editing && (
          <button
            onClick={(e) => { e.stopPropagation(); setEditing(false); }}
            className="primary"
            style={{ fontSize: 11 }}
            title="Stop editing the clause. Changes are already saved."
          >
            ✓ done
          </button>
        )}
      </div>

      {picking ? (
        <div
          contentEditable={false}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}
        >
          <div className="lbl">Pick clause</div>
          <select
            value={clauseId}
            onChange={(e) => updateAttributes({ clauseId: e.target.value })}
            style={{ minWidth: 320 }}
          >
            <option value="">— select clause —</option>
            {[...grouped.keys()].sort().map((id) => {
              const c = grouped.get(id)![0];
              return <option key={id} value={id}>{c.name} ({id})</option>;
            })}
          </select>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ fontSize: 11 }}>Version</label>
            <select
              value={version}
              onChange={(e) => updateAttributes({ version: e.target.value, pinned: e.target.value !== 'latest' })}
            >
              <option value="latest">latest</option>
              {clauseId && (grouped.get(clauseId) ?? []).map((c) => (
                <option key={c.version} value={c.version}>
                  {c.version} · {c.status}
                </option>
              ))}
            </select>
            <label style={{ fontSize: 11 }}>
              <input
                type="checkbox"
                checked={pinned}
                onChange={(e) => updateAttributes({ pinned: e.target.checked })}
              /> pinned
            </label>
            <button onClick={() => setPicking(false)} style={{ marginLeft: 'auto' }}>done</button>
          </div>
        </div>
      ) : editing && clause ? (
        <div
          contentEditable={false}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className="pm-clause-inline-edit"
        >
          <TiptapEditor
            mode="clause"
            initialDoc={clause.ast}
            onChange={onClauseAstChange}
            editable={true}
          />
          <div className="muted" style={{ fontSize: 11, padding: '6px 10px 8px' }}>
            Editing <code>{clause.id}</code> v{clause.version} ({clause.status}) — changes save to the clause store automatically. Click <strong>done</strong> to return to read-only view.
          </div>
        </div>
      ) : clause ? (
        <div
          contentEditable={false}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className="pm-clause-inline-body"
        >
          <RenderResolvedDoc doc={clause.ast as ResolvedPMDoc} unresolvedAs="chip" />
        </div>
      ) : clauseId ? (
        <div
          contentEditable={false}
          onClick={(e) => e.stopPropagation()}
          style={{ padding: 8, color: '#a33', fontSize: 12 }}
        >
          ⚠️ clause not found — pick a different reference, or check the clause has a published version (`latest` only resolves to published).
        </div>
      ) : (
        <div
          contentEditable={false}
          onClick={(e) => e.stopPropagation()}
          style={{ padding: 8, color: 'var(--ink-2)', fontSize: 12 }}
        >
          No clause selected — click <strong>change ref</strong> to pick one.
        </div>
      )}
    </NodeViewWrapper>
  );
}
