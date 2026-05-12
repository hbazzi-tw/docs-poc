# T&W AST Document Generation — POC

A working proof-of-concept for the AST-based document generation system described in
[RFC-001](https://www.notion.so/35a48fc7182c81aaa855cfcd6d811784) and the
[Design Notes](https://www.notion.so/35948fc7182c81c0a98dc5f6b7d5662d).

End-to-end demo of:

1. **Template editor** — Tiptap-based structural editor with custom AST nodes (`variable_ref`, `clause_ref`, `conditional`, `for_each`, `signature_block`).
2. **Clause library** — versioned, reusable AST fragments referenced by templates.
3. **Bindings input** — auto-generated form derived from the template's variable schema.
4. **Resolver pipeline** — Template + Bindings → ResolvedPMDoc (per RFC §3.4).
5. **Document editor** — post-generation Tiptap (StarterKit) for free-form attorney edits.
6. **HTML preview + print-to-PDF** — styled output, browser print dialog produces PDF.

The seed Will template + ~17 clauses are derived from the real generator at
`tw-pdf-svc/PDF/TemplatePages/Will/` — see `src/store/seed.ts` for the source mapping.

## Run

```bash
npm install
npm run dev
```

Open the URL Vite prints (typically `http://localhost:5174`, may bump to 5175/5176
if other dev servers are running).

## Walkthrough

1. **Templates** — open *Simple Last Will & Testament*. The Tiptap editor shows the
   template AST: `clause_ref` cards, `IF` conditionals, `FOR EACH` loops, a
   `signature_block`. Click any node to edit its attrs.

2. **Clause Library** — open any clause (e.g. *Executor — Nomination*). Edit text,
   add variables (`{ var }`), or change metadata.

3. **Generate Document** — pick the Will template. Fill in bindings (pre-populated
   with sample data: John Smith, California, married, 2 children). Click *Generate
   document →*.

4. **Review** — see the resolved AST rendered as HTML. The debug panel shows
   `isResolved: true` — no `variable_ref`/`conditional`/`for_each`/`clause_ref`
   nodes remain. Resolver warnings (missing bindings/clauses) surface here.

5. **Attorney edits** — continue to the document editor. The resolved doc opens
   in a plain Tiptap (StarterKit only) — type anywhere, add paragraphs, bold,
   lists. The template stays unchanged.

6. **Print** — *🖨 Print / Save as PDF* triggers the browser print dialog. The
   `@media print` stylesheet hides the toolbar/topbar and shows only the document
   preview.

## What this POC demonstrates

- **PM JSON as canonical** (RFC §3.1) — one AST shape end-to-end.
- **`ResolvedPMDoc` via predicate** — branded type + `isResolved()` predicate.
- **Composition over inheritance** for state variants — `executor-independent-admin-ca`
  is a separate clause wrapped in `conditional(state == 'California')`.
- **Bindings → typed variables** — the form is generated from `template.variables`,
  not hand-coded. Adding a variable to the template adds a field to the form.
- **No automatic template propagation** — the generated document is its own thing;
  edits don't flow back to the template; old documents stay old (RFC §3.5).

## What this POC does NOT do (intentionally)

- No persistence beyond `localStorage`.
- No `StateEvent` provenance log (Phase 1).
- No change-request / approval workflow (Phase 2).
- No DOCX import/export (Phase 1).
- No real PDF rendering — uses browser print-to-PDF. The eventual stack would use
  `@react-pdf/renderer` or `docx` for fidelity.

## File map

```
src/
├── types.ts                              # PM JSON schema + entity types
├── resolver/
│   ├── expression.ts                     # Sandboxed expression DSL
│   └── resolve.ts                        # Template + bindings → ResolvedPMDoc
├── renderer/HtmlRenderer.tsx             # ResolvedPMDoc → React/HTML
├── editor/
│   ├── TiptapEditor.tsx                  # Mode-aware editor wrapper
│   └── extensions/                       # variable_ref, clause_ref, conditional,
│                                         #   for_each, signature_block
├── store/
│   ├── seed.ts                           # Will template + clause library
│   └── store.ts                          # localStorage-backed CRUD + hooks
└── routes/
    ├── TemplateList.tsx
    ├── TemplateEditor.tsx
    ├── ClauseLibrary.tsx
    ├── ClauseEditor.tsx
    └── DocumentGenerator.tsx             # Input → Review → Edit stages
```
