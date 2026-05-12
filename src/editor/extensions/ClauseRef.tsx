import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import React, { useEffect, useRef, useState } from 'react';
import { getClause, getClauses } from '../../store/store';
import { RenderResolvedDoc } from '../../renderer/HtmlRenderer';
import type { ResolvedPMDoc } from '../../types';

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

const HOVER_DELAY_MS = 350;

function ClauseRefNodeView({ node, updateAttributes, editor }: NodeViewProps) {
  const [picking, setPicking] = useState(false);
  const [hovering, setHovering] = useState(false);
  const hoverTimer = useRef<number | undefined>(undefined);
  const { clauseId, version, pinned } = node.attrs;
  const clause = clauseId ? getClause(clauseId, version) : undefined;

  const allClauses = getClauses();
  const grouped = new Map<string, typeof allClauses>();
  for (const c of allClauses) {
    if (!grouped.has(c.id)) grouped.set(c.id, []);
    grouped.get(c.id)!.push(c);
  }

  // Hover state, with a small delay so casual mouse traversal doesn't pop the
  // preview. Hides immediately on leave so it doesn't get stuck.
  const onEnter = () => {
    if (picking) return;
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setHovering(true), HOVER_DELAY_MS);
  };
  const onLeave = () => {
    window.clearTimeout(hoverTimer.current);
    setHovering(false);
  };
  useEffect(() => () => window.clearTimeout(hoverTimer.current), []);

  return (
    <NodeViewWrapper
      className="pm-clause-ref"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={(e: React.MouseEvent) => { e.stopPropagation(); editor.isEditable && setPicking(true); }}
    >
      {picking ? (
        <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="lbl">Pick clause</div>
          <select
            value={clauseId}
            onChange={(e) => updateAttributes({ clauseId: e.target.value })}
            style={{ minWidth: 320 }}
          >
            <option value="">— select clause —</option>
            {[...grouped.keys()].sort().map(id => {
              const c = grouped.get(id)![0];
              return <option key={id} value={id}>{c.name} ({id})</option>;
            })}
          </select>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ fontSize: 11 }}>Version</label>
            <select value={version} onChange={(e) => updateAttributes({ version: e.target.value, pinned: e.target.value !== 'latest' })}>
              <option value="latest">latest</option>
              {clauseId && (grouped.get(clauseId) ?? []).map(c => (
                <option key={c.version} value={c.version}>{c.version}</option>
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
      ) : (
        <>
          <span className="lbl">▸ clause</span>{' '}
          <span className="id">{clauseId || '(unset)'}</span>
          <span className="ver">@{version}{pinned ? ' (pinned)' : ''}</span>
          {clause && <div style={{ marginTop: 4, color: '#806023' }}>{clause.name}</div>}
          {!clause && clauseId && <div style={{ marginTop: 4, color: '#a33' }}>⚠️ clause not found</div>}

          {hovering && clause && (
            <div className="pm-clause-preview" contentEditable={false} onClick={(e) => e.stopPropagation()}>
              <div className="pm-clause-preview-header">
                <strong>{clause.name}</strong>
                <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--ink-2)' }}>
                  v{clause.version} · {clause.status}
                  {clause.jurisdiction ? ` · ${clause.jurisdiction}` : ''}
                </span>
              </div>
              {clause.purpose && (
                <div className="pm-clause-preview-purpose">{clause.purpose}</div>
              )}
              <div className="pm-clause-preview-body">
                <RenderResolvedDoc doc={clause.ast as ResolvedPMDoc} unresolvedAs="chip" />
              </div>
              <div className="pm-clause-preview-footer">
                <span>Click card to change reference</span>
                <a
                  href={`/clauses/${clause.id}/${clause.version}`}
                  onClick={(e) => e.stopPropagation()}
                  style={{ marginLeft: 'auto' }}
                >
                  Edit clause →
                </a>
              </div>
            </div>
          )}
        </>
      )}
    </NodeViewWrapper>
  );
}
