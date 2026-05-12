import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import React, { useEffect, useRef, useState } from 'react';
import { TERM_DICTIONARY, STATE_NAME_TO_ABBREV } from '../../store/terms';

// Inline defined_term node — a "smart token" in the prose that renders the
// default text in the editor but resolves to a state-specific replacement
// when the testator's state matches a TERM_DICTIONARY entry.
//
// Editor UX:
//   - Default rendering: the defaultText inline, with a subtle bronze
//     underline + small chip indicator on the right. Looks ~like normal
//     prose so headings/paragraphs read naturally.
//   - Click the chip → a labeled popover opens BELOW the token (not inline)
//     showing the term key, default text, an inline help line, and a live
//     preview of every state that currently has an override for this term.
//   - Click outside / Esc / Done → popover closes.
export const DefinedTerm = Node.create({
  name: 'defined_term',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      term: { default: '' },
      defaultText: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="defined-term"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes({ 'data-type': 'defined-term', class: 'pm-defined-term' }, HTMLAttributes), `[${HTMLAttributes.term}]`];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DefinedTermNodeView);
  },
});

function DefinedTermNodeView({ node, updateAttributes, editor }: NodeViewProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);

  const term: string = node.attrs.term || '';
  const defaultText: string = node.attrs.defaultText || '';

  // The chip itself: a token that reads as the default text but is visually
  // distinguished so attorneys can tell it's not a plain literal. The §
  // marker on the right is small and signals "this is a defined term that
  // varies by jurisdiction."
  return (
    <NodeViewWrapper as="span" className="pm-defined-term-wrapper">
      <span
        ref={wrapperRef}
        className="pm-defined-term"
        onClick={(e: React.MouseEvent) => { e.stopPropagation(); editor.isEditable && setOpen(true); }}
        title={`Defined term: ${term || '(unset)'} — click to edit`}
      >
        {defaultText || `[${term || 'defined term'}]`}
        <span className="pm-defined-term-marker" aria-hidden>§</span>
      </span>
      {open && (
        <DefinedTermPopover
          anchorRef={wrapperRef}
          term={term}
          defaultText={defaultText}
          onChange={updateAttributes}
          onClose={() => setOpen(false)}
        />
      )}
    </NodeViewWrapper>
  );
}

function DefinedTermPopover({
  anchorRef,
  term,
  defaultText,
  onChange,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLSpanElement>;
  term: string;
  defaultText: string;
  onChange: (patch: { term?: string; defaultText?: string }) => void;
  onClose: () => void;
}) {
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // Position the popover under the chip, clamped to the viewport.
  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const top = rect.bottom + 6;
    const left = Math.max(8, Math.min(window.innerWidth - 380 - 8, rect.left));
    setPos({ top, left });
  }, [anchorRef]);

  // Close on outside click + Esc.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!popRef.current) return;
      const target = e.target as unknown as globalThis.Node;
      if (popRef.current.contains(target)) return;
      if (anchorRef.current && anchorRef.current.contains(target)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [anchorRef, onClose]);

  if (!pos) return null;

  // Build the per-state preview: which jurisdictions currently override
  // this term, and what they map to.
  const abbrevToName = Object.fromEntries(Object.entries(STATE_NAME_TO_ABBREV).map(([n, a]) => [a, n]));
  const overrides: { abbrev: string; state: string; replacement: string }[] = [];
  for (const [abbrev, terms] of Object.entries(TERM_DICTIONARY)) {
    if (term && terms[term]) {
      overrides.push({ abbrev, state: abbrevToName[abbrev] ?? abbrev, replacement: terms[term] });
    }
  }

  return (
    <div
      ref={popRef}
      className="defined-term-popover"
      style={{ top: pos.top, left: pos.left }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="dt-pop-header">
        <span className="dt-pop-title">Defined Term</span>
        <span className="dt-pop-hint">Jurisdiction-aware vocabulary swap</span>
      </div>
      <div className="dt-pop-body">
        <label className="dt-field">
          <span className="dt-label">Term key</span>
          <input
            autoFocus
            value={term}
            onChange={(e) => onChange({ term: e.target.value })}
            placeholder="e.g. executor"
          />
          <span className="dt-help">Dictionary lookup key (lowercase). Wires this token to TERM_DICTIONARY entries in <code>src/store/terms.ts</code>.</span>
        </label>
        <label className="dt-field">
          <span className="dt-label">Default text</span>
          <input
            value={defaultText}
            onChange={(e) => onChange({ defaultText: e.target.value })}
            placeholder="e.g. Executor"
          />
          <span className="dt-help">Rendered when no state override matches — that is, for any testator state not listed below.</span>
        </label>

        <div className="dt-overrides">
          <div className="dt-overrides-title">
            State overrides
            {term && <span className="dt-overrides-count">{overrides.length}</span>}
          </div>
          {!term && (
            <div className="dt-overrides-empty">Set a term key to see which states override it.</div>
          )}
          {term && overrides.length === 0 && (
            <div className="dt-overrides-empty">
              No states currently override <code>{term}</code> — every testator renders the default text.
              Edit <code>src/store/terms.ts</code> to add state-specific replacements.
            </div>
          )}
          {term && overrides.length > 0 && (
            <ul className="dt-overrides-list">
              {overrides.map((o) => (
                <li key={o.abbrev}>
                  <span className="dt-state-badge">{o.abbrev}</span>
                  <span className="dt-state-name">{o.state}</span>
                  <span className="dt-arrow">→</span>
                  <strong>{o.replacement}</strong>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="dt-pop-footer">
        <span className="dt-help" style={{ flex: 1 }}>Changes save automatically.</span>
        <button onClick={onClose}>Done</button>
      </div>
    </div>
  );
}
