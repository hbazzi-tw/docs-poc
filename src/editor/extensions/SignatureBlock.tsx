import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import React, { useState } from 'react';

export const SignatureBlock = Node.create({
  name: 'signature_block',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      kind: { default: 'simple' },
      state: { default: null as string | null },
      witnesses: { default: 2 },
      notaryRequired: { default: false },
      attestation: { default: null as string | null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="signature-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-type': 'signature-block', class: 'pm-signature' }, HTMLAttributes), 'signature_block'];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SignatureBlockNodeView);
  },
});

const KIND_LABELS: Record<string, string> = {
  'will-testator-witnesses': 'Will — Your Signature + Witnesses',
  'will-self-proving-affidavit': 'Will — Self-Proving Affidavit (notary)',
  'hcd-testator': 'HCD — Signature',
  'hcd-witnesses': 'HCD — Witnesses (with disqualifications)',
  'hipaa-testator': 'HIPAA — Signature',
  'poa-testator': 'POA — Signature & Acknowledgment',
  'poa-notary': 'POA — Statutory Notary Block',
  'simple': 'Simple (legacy)',
};

function SignatureBlockNodeView({ node, updateAttributes, editor }: NodeViewProps) {
  const [editing, setEditing] = useState(false);
  const { kind, state } = node.attrs;
  const needsState = kind === 'will-self-proving-affidavit' || kind === 'poa-notary';

  return (
    <NodeViewWrapper className="pm-signature" onClick={(e: React.MouseEvent) => { e.stopPropagation(); editor.isEditable && setEditing(true); }}>
      {editing ? (
        <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="lbl">Signature Block</div>
          <label style={{ fontSize: 12 }}>
            Kind:{' '}
            <select
              value={kind ?? 'simple'}
              onChange={(e) => updateAttributes({ kind: e.target.value })}
              style={{ minWidth: 280 }}
            >
              {Object.entries(KIND_LABELS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </label>
          {needsState && (
            <label style={{ fontSize: 12 }}>
              State (for notary header):{' '}
              <input
                value={state ?? ''}
                onChange={(e) => updateAttributes({ state: e.target.value || null })}
                placeholder="e.g. California, or leave blank to draw from testator.state"
                style={{ width: 280 }}
              />
            </label>
          )}
          <button onClick={(e) => { e.stopPropagation(); setEditing(false); }} style={{ alignSelf: 'flex-end' }}>done</button>
        </div>
      ) : (
        <>
          <div className="lbl">▢ signature_block</div>
          <div className="desc">
            {KIND_LABELS[kind] ?? kind}
            {needsState && state ? ` · state: ${state}` : ''}
          </div>
        </>
      )}
    </NodeViewWrapper>
  );
}
