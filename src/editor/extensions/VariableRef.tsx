import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import React, { useState } from 'react';

export const VariableRef = Node.create({
  name: 'variable_ref',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      path: { default: '' },
      fallback: { default: '' },
      transform: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="variable-ref"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes({ 'data-type': 'variable-ref', class: 'pm-variable' }, HTMLAttributes), `{${HTMLAttributes.path}}`];
  },

  addNodeView() {
    return ReactNodeViewRenderer(VariableNodeView);
  },
});

function VariableNodeView({ node, updateAttributes, editor }: NodeViewProps) {
  const [editing, setEditing] = useState(false);
  const path = node.attrs.path || '?';
  return (
    <NodeViewWrapper as="span" className="pm-variable" onClick={() => editor.isEditable && setEditing(true)}>
      {editing ? (
        <input
          autoFocus
          defaultValue={path === '?' ? '' : path}
          onBlur={(e) => { updateAttributes({ path: e.target.value }); setEditing(false); }}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditing(false); }}
          style={{ font: 'inherit', width: 160, padding: '0 4px' }}
        />
      ) : (
        <>{`{${path}}`}</>
      )}
    </NodeViewWrapper>
  );
}
