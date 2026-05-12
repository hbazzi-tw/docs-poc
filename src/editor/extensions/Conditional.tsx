import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent, type NodeViewProps } from '@tiptap/react';
import React, { useState } from 'react';

export const Conditional = Node.create({
  name: 'conditional',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      condition: { default: '' },
      label: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="conditional"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-type': 'conditional', class: 'pm-conditional' }, HTMLAttributes), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ConditionalNodeView);
  },
});

function ConditionalNodeView({ node, updateAttributes, editor }: NodeViewProps) {
  const [editing, setEditing] = useState(false);
  const { condition, label } = node.attrs;

  return (
    <NodeViewWrapper className="pm-conditional">
      <div className="pm-conditional-header" contentEditable={false}>
        <span className="kw">IF</span>
        {editing ? (
          <input
            autoFocus
            defaultValue={condition}
            onBlur={(e) => { updateAttributes({ condition: e.target.value }); setEditing(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditing(false); }}
            style={{ font: 'inherit', width: 320, padding: '1px 6px' }}
          />
        ) : (
          <span onClick={() => editor.isEditable && setEditing(true)} style={{ cursor: 'pointer' }}>
            {condition || '(set condition)'}
          </span>
        )}
        {label && <span style={{ marginLeft: 12, color: 'var(--ink-2)', fontWeight: 400 }}>— {label}</span>}
      </div>
      <NodeViewContent />
    </NodeViewWrapper>
  );
}
