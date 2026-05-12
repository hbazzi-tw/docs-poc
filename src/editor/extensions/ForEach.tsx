import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent, type NodeViewProps } from '@tiptap/react';
import React, { useState } from 'react';

export const ForEach = Node.create({
  name: 'for_each',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      over: { default: '' },
      as: { default: 'item' },
      mode: { default: 'block' as 'block' | 'inline' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="for-each"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-type': 'for-each', class: 'pm-for-each' }, HTMLAttributes), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ForEachNodeView);
  },
});

function ForEachNodeView({ node, updateAttributes, editor }: NodeViewProps) {
  const [editing, setEditing] = useState(false);
  const { over, as, mode } = node.attrs;

  return (
    <NodeViewWrapper className="pm-for-each">
      <div className="pm-for-each-header" contentEditable={false}>
        <span className="kw">FOR EACH</span>
        {editing ? (
          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            <input
              defaultValue={as}
              onBlur={(e) => updateAttributes({ as: e.target.value })}
              style={{ font: 'inherit', width: 100, padding: '1px 6px' }}
              placeholder="as"
            />
            <span>IN</span>
            <input
              defaultValue={over}
              onBlur={(e) => updateAttributes({ over: e.target.value })}
              style={{ font: 'inherit', width: 200, padding: '1px 6px' }}
              placeholder="collection path"
            />
            <select value={mode} onChange={(e) => updateAttributes({ mode: e.target.value })}>
              <option value="block">block</option>
              <option value="inline">inline</option>
            </select>
            <button onClick={() => setEditing(false)} style={{ padding: '1px 8px', fontSize: 11 }}>done</button>
          </span>
        ) : (
          <span onClick={() => editor.isEditable && setEditing(true)} style={{ cursor: 'pointer' }}>
            <code>{as}</code> IN <code>{over || '(unset)'}</code>
            <span style={{ marginLeft: 8, fontWeight: 400, color: 'var(--ink-2)' }}>· {mode}</span>
          </span>
        )}
      </div>
      <NodeViewContent />
    </NodeViewWrapper>
  );
}
