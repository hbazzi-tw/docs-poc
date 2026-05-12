import React, { useEffect } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import type { Extensions } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { VariableRef } from './extensions/VariableRef';
import { ClauseRef } from './extensions/ClauseRef';
import { Conditional } from './extensions/Conditional';
import { ForEach } from './extensions/ForEach';
import { SignatureBlock } from './extensions/SignatureBlock';
import { DefinedTerm } from './extensions/DefinedTerm';
import { SlashPalette } from './SlashPalette';
import type { PMDoc } from '../types';
import { getClauses } from '../store/store';

export type TiptapMode = 'template' | 'document' | 'clause';

export type TiptapEditorProps = {
  initialDoc: PMDoc;
  onChange?: (doc: PMDoc) => void;
  mode: TiptapMode;
  editable?: boolean;
  // When true, the .ProseMirror element renders with legal-document styling
  // (serif body, US Letter margins) so the editor looks like the final
  // printed page. Used in the document generator's Review stage so review
  // and editing are the same surface.
  docStyle?: boolean;
};

export function TiptapEditor({ initialDoc, onChange, mode, editable = true, docStyle = false }: TiptapEditorProps) {
  const extensions: Extensions = [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
    }),
  ];

  // The document editor uses StarterKit only — no custom AST nodes. The
  // template + clause editors enable the full custom-node set.
  if (mode !== 'document') {
    extensions.push(VariableRef, ClauseRef, Conditional, ForEach, SignatureBlock, DefinedTerm);
  } else {
    // Document editor needs signature_block to round-trip resolved docs.
    extensions.push(SignatureBlock);
  }

  const editor = useEditor({
    extensions,
    content: initialDoc as any,
    editable,
    editorProps: docStyle
      ? { attributes: { class: 'ProseMirror doc-style' } }
      : undefined,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON() as PMDoc);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getJSON();
    if (JSON.stringify(current) !== JSON.stringify(initialDoc)) {
      editor.commands.setContent(initialDoc as any, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDoc, editor]);

  // useEditor snapshots `editable` at mount and never re-reads it. Without
  // this, forking a published (read-only) clause to a draft leaves the
  // editor in read-only mode even after the route swaps to the new draft.
  useEffect(() => {
    if (!editor) return;
    if (editor.isEditable !== editable) editor.setEditable(editable);
  }, [editable, editor]);

  if (!editor) return null;

  return (
    <div className={`editor-shell${docStyle ? ' editor-shell-doc' : ''}`}>
      {!docStyle && <EditorToolbar editor={editor} mode={mode} />}
      <EditorContent editor={editor} />
      <SlashPalette editor={editor} mode={mode} />
    </div>
  );
}

function EditorToolbar({ editor, mode }: { editor: Editor; mode: TiptapMode }) {
  const insertVariable = () => {
    const path = prompt('Variable path (e.g. testator.name):');
    if (!path) return;
    editor.chain().focus().insertContent({ type: 'variable_ref', attrs: { path } }).run();
  };

  const insertClauseRef = () => {
    const clauses = getClauses();
    const first = clauses[0];
    editor.chain().focus().insertContent({
      type: 'clause_ref',
      attrs: { clauseId: first?.id ?? '', version: 'latest', pinned: false },
    }).run();
  };

  const wrapConditional = () => {
    const condition = prompt('Condition (e.g. children.length > 0):') ?? '';
    editor.chain().focus().insertContent({
      type: 'conditional',
      attrs: { condition, label: '' },
      content: [{ type: 'paragraph' }],
    }).run();
  };

  const wrapForEach = () => {
    const over = prompt('Collection path (e.g. executors.backups):') ?? '';
    const as = prompt('Item name (e.g. backup):', 'item') ?? 'item';
    editor.chain().focus().insertContent({
      type: 'for_each',
      attrs: { over, as, mode: 'block' },
      content: [{ type: 'paragraph' }],
    }).run();
  };

  const insertSignatureBlock = () => {
    editor.chain().focus().insertContent({
      type: 'signature_block',
      attrs: { witnesses: 2, notaryRequired: false, attestation: null },
    }).run();
  };

  return (
    <div className="editor-toolbar">
      <button onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'primary' : ''}>
        B
      </button>
      <button onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'primary' : ''}>
        I
      </button>
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>H1</button>
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</button>
      <button onClick={() => editor.chain().focus().toggleBulletList().run()}>• list</button>
      <button onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. list</button>

      {mode !== 'document' && (
        <>
          <span className="divider" />
          <button onClick={insertVariable} title="Insert variable_ref">{'{ var }'}</button>
          {mode === 'template' && (
            <>
              <button onClick={insertClauseRef} title="Insert clause_ref">▸ clause</button>
              <button onClick={wrapConditional} title="Wrap in conditional">IF…</button>
              <button onClick={wrapForEach} title="Wrap in for_each">FOR…</button>
            </>
          )}
          <button onClick={insertSignatureBlock} title="Insert signature_block">▢ sig</button>
        </>
      )}

      <span className="spacer" style={{ flex: 1 }} />
      <span className="muted" style={{ fontSize: 11, alignSelf: 'center' }}>
        mode: {mode}
      </span>
    </div>
  );
}
