// ---------------------------------------------------------------------------
// SlashPalette — a Notion/Linear-style "/" command palette for the template
// + clause editors. Press "/" anywhere in the editor → popup opens at the
// cursor; type to filter; ↑/↓ to navigate; Enter to insert; Esc to dismiss.
//
// Implementation notes:
//  - No additional Tiptap deps. Listens for "/" via keydown on the editor's
//    DOM element, prevents the default so "/" doesn't end up typed.
//  - Each command is a {label, hint, run(editor)} record. run() uses the
//    standard editor.chain().focus().insertContent(...).run() pattern.
//  - The palette filters by case-insensitive substring against label + hint.
// ---------------------------------------------------------------------------

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { getClauses } from '../store/store';

type SlashCommand = {
  id: string;
  label: string;
  hint: string;       // short description shown next to the label
  group: 'structure' | 'logic' | 'inline' | 'execution' | 'clauses';
  run: (editor: Editor) => void;
};

const baseCommands = (mode: 'template' | 'clause' | 'document'): SlashCommand[] => {
  const cmds: SlashCommand[] = [
    {
      id: 'h2', label: 'Heading — Section', hint: 'H2 — top-level section header', group: 'structure',
      run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      id: 'h3', label: 'Heading — Subsection', hint: 'H3 — bold inline subsection header', group: 'structure',
      run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      id: 'paragraph', label: 'Paragraph', hint: 'Plain body paragraph', group: 'structure',
      run: (e) => e.chain().focus().setParagraph().run(),
    },
    {
      id: 'bullet', label: 'Bullet list', hint: '• unordered list', group: 'structure',
      run: (e) => e.chain().focus().toggleBulletList().run(),
    },
    {
      id: 'ordered', label: 'Numbered list', hint: '1. numbered list', group: 'structure',
      run: (e) => e.chain().focus().toggleOrderedList().run(),
    },
  ];

  // Template + clause modes get the AST-specific nodes
  if (mode !== 'document') {
    cmds.push(
      {
        id: 'variable', label: 'Variable reference', hint: '{path.to.value} — pulls from bindings', group: 'inline',
        run: (e) => {
          const path = prompt('Variable path (e.g. testator.name):') ?? '';
          if (!path) return;
          e.chain().focus().insertContent({ type: 'variable_ref', attrs: { path } }).run();
        },
      },
      {
        id: 'defined', label: 'Defined term', hint: 'Jurisdiction-aware vocabulary swap (e.g. Executor → Personal Representative in MI)', group: 'inline',
        run: (e) => {
          const term = prompt('Term key (e.g. executor):') ?? '';
          if (!term) return;
          const defaultText = prompt('Default text (rendered when no state override):', term[0].toUpperCase() + term.slice(1)) ?? term;
          e.chain().focus().insertContent({ type: 'defined_term', attrs: { term, defaultText } }).run();
        },
      },
    );
  }

  if (mode === 'template') {
    cmds.push(
      {
        id: 'conditional', label: 'Conditional (IF)', hint: 'Branch on a binding expression', group: 'logic',
        run: (e) => {
          const condition = prompt('Condition (e.g. children.length > 0):') ?? '';
          e.chain().focus().insertContent({
            type: 'conditional',
            attrs: { condition, label: '' },
            content: [{ type: 'paragraph' }],
          }).run();
        },
      },
      {
        id: 'foreach', label: 'For each (LOOP)', hint: 'Repeat over a collection binding', group: 'logic',
        run: (e) => {
          const over = prompt('Collection path (e.g. executors.backups):') ?? '';
          const as = prompt('Item name (e.g. backup):', 'item') ?? 'item';
          e.chain().focus().insertContent({
            type: 'for_each',
            attrs: { over, as, mode: 'block' },
            content: [{ type: 'paragraph' }],
          }).run();
        },
      },
    );
  }

  if (mode !== 'document') {
    // Clause reference picker — list all clause ids so the attorney can
    // insert by name. Adds one command per clause-id (grouping latest
    // version under each).
    const clauseList = getClauses();
    const byId = new Map<string, typeof clauseList>();
    for (const c of clauseList) {
      if (!byId.has(c.id)) byId.set(c.id, []);
      byId.get(c.id)!.push(c);
    }
    [...byId.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([id, versions]) => {
        const latest = versions.sort((a, b) => b.version.localeCompare(a.version))[0];
        cmds.push({
          id: `clause:${id}`,
          label: `▸ ${latest.name}`,
          hint: `Clause ref — ${id} @latest`,
          group: 'clauses',
          run: (e) => {
            e.chain().focus().insertContent({
              type: 'clause_ref',
              attrs: { clauseId: id, version: 'latest', pinned: false },
            }).run();
          },
        });
      });

    // Signature blocks — each kind a separate command
    const sigKinds: { kind: string; label: string }[] = [
      { kind: 'will-testator-witnesses', label: 'Signature — Will Testator + Witnesses' },
      { kind: 'will-self-proving-affidavit', label: 'Signature — Will Self-Proving Affidavit' },
      { kind: 'hcd-testator', label: 'Signature — HCD Testator' },
      { kind: 'hcd-witnesses', label: 'Signature — HCD Witnesses' },
      { kind: 'hipaa-testator', label: 'Signature — HIPAA Testator' },
      { kind: 'poa-testator', label: 'Signature — POA Signature & Acknowledgment' },
      { kind: 'poa-notary', label: 'Signature — POA Notary' },
    ];
    for (const s of sigKinds) {
      cmds.push({
        id: `sig:${s.kind}`,
        label: s.label,
        hint: `Signature block kind: ${s.kind}`,
        group: 'execution',
        run: (e) => {
          e.chain().focus().insertContent({
            type: 'signature_block',
            attrs: { kind: s.kind, state: null },
          }).run();
        },
      });
    }
  }

  return cmds;
};

const GROUP_LABEL: Record<SlashCommand['group'], string> = {
  structure: 'Structure',
  logic: 'Logic',
  inline: 'Inline',
  execution: 'Execution',
  clauses: 'Library clauses',
};

export type SlashPaletteProps = {
  editor: Editor;
  mode: 'template' | 'clause' | 'document';
};

export function SlashPalette({ editor, mode }: SlashPaletteProps) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands = useMemo(() => baseCommands(mode), [mode, open]);

  const filtered = useMemo(() => {
    if (!query) return commands;
    const q = query.toLowerCase();
    return commands.filter(c =>
      c.label.toLowerCase().includes(q) || c.hint.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
    );
  }, [commands, query]);

  // Reset selection whenever the filtered list shrinks.
  useEffect(() => {
    if (selected >= filtered.length) setSelected(0);
  }, [filtered.length, selected]);

  // Listen for "/" on the editor DOM; open the palette at the cursor.
  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom as HTMLElement;

    const handler = (e: KeyboardEvent) => {
      // Only open on bare "/"; ignore modifier combos so things like "Ctrl+/"
      // still go through to the browser / OS.
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      // Don't trigger inside attribute popovers etc.
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') return;

      e.preventDefault();
      const { from } = editor.state.selection;
      const coords = editor.view.coordsAtPos(from);
      setAnchor({ x: coords.left, y: coords.bottom });
      setQuery('');
      setSelected(0);
      setOpen(true);
    };

    dom.addEventListener('keydown', handler);
    return () => dom.removeEventListener('keydown', handler);
  }, [editor]);

  // Focus input + handle keyboard nav whenever the palette opens.
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  if (!open || !anchor) return null;

  const close = () => { setOpen(false); setAnchor(null); editor.commands.focus(); };

  const run = (cmd: SlashCommand) => {
    close();
    // Defer so the editor regains focus after the popup unmounts.
    setTimeout(() => cmd.run(editor), 0);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(filtered.length - 1, s + 1)); scrollSelected(1); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected((s) => Math.max(0, s - 1)); scrollSelected(-1); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = filtered[selected];
      if (cmd) run(cmd);
      return;
    }
  };

  const scrollSelected = (dir: number) => {
    requestAnimationFrame(() => {
      const list = listRef.current;
      if (!list) return;
      const el = list.querySelector('.slash-item.selected') as HTMLElement | null;
      if (el) el.scrollIntoView({ block: 'nearest' });
    });
  };

  // Group filtered commands for display.
  const groups: { group: SlashCommand['group']; items: SlashCommand[] }[] = [];
  const groupMap = new Map<SlashCommand['group'], SlashCommand[]>();
  for (const c of filtered) {
    if (!groupMap.has(c.group)) groupMap.set(c.group, []);
    groupMap.get(c.group)!.push(c);
  }
  const order: SlashCommand['group'][] = ['structure', 'inline', 'logic', 'clauses', 'execution'];
  for (const g of order) {
    const items = groupMap.get(g);
    if (items && items.length) groups.push({ group: g, items });
  }

  // Position the palette below the cursor, clipped to the viewport.
  const maxLeft = window.innerWidth - 480 - 16;
  const left = Math.min(anchor.x, Math.max(16, maxLeft));
  const top = anchor.y + 6;

  return (
    <>
      <div className="slash-backdrop" onMouseDown={close} />
      <div className="slash-palette" style={{ left, top }} onKeyDown={onKey}>
        <input
          ref={inputRef}
          className="slash-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter commands… (↑↓ navigate, ↵ insert, Esc close)"
        />
        <div className="slash-list" ref={listRef}>
          {filtered.length === 0 && <div className="slash-empty">No matches</div>}
          {(() => {
            let idx = 0;
            return groups.map(({ group, items }) => (
              <div key={group} className="slash-group">
                <div className="slash-group-label">{GROUP_LABEL[group]}</div>
                {items.map((cmd) => {
                  const myIdx = idx++;
                  return (
                    <div
                      key={cmd.id}
                      className={`slash-item ${myIdx === selected ? 'selected' : ''}`}
                      onMouseEnter={() => setSelected(myIdx)}
                      onMouseDown={(e) => { e.preventDefault(); run(cmd); }}
                    >
                      <div className="slash-item-label">{cmd.label}</div>
                      <div className="slash-item-hint">{cmd.hint}</div>
                    </div>
                  );
                })}
              </div>
            ));
          })()}
        </div>
        <div className="slash-footer">
          {filtered.length} command{filtered.length === 1 ? '' : 's'}
        </div>
      </div>
    </>
  );
}
