import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTemplates, getTemplate, getClause } from '../store/store';
import { resolveTemplate, isResolved } from '../resolver/resolve';
import { RenderResolvedDoc } from '../renderer/HtmlRenderer';
import { TiptapEditor } from '../editor/TiptapEditor';
import { buildSampleBindings, buildMichiganBindings } from '../store/seed';
import { PersonPicker, PersonArrayPicker } from './PersonPicker';
import { InventoryPicker, InventoryArrayPicker } from './InventoryPicker';
import type { Bindings, PersonBinding, InventoryItemBinding, PMDoc, VariableDef } from '../types';

type Stage = 'input' | 'review';

export function DocumentGenerator() {
  const { templateId } = useParams<{ templateId?: string }>();
  const navigate = useNavigate();
  const templates = useTemplates();
  const template = useMemo(() => (templateId ? getTemplate(templateId) : undefined), [templateId, templates]);

  if (!templateId) {
    return (
      <div className="container">
        <h2>Generate Document — pick a template</h2>
        {templates.map(t => (
          <Link key={t.id} to={`/generate/${t.id}`} className="list-item" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{t.name}</div>
              <div className="meta">v{t.version} · {t.variables.length} variables</div>
            </div>
          </Link>
        ))}
      </div>
    );
  }

  if (!template) {
    return <div className="container"><p>Template not found.</p></div>;
  }

  return <GeneratorBody key={template.id} template={template} onBack={() => navigate('/generate')} />;
}

function GeneratorBody({ template, onBack }: { template: ReturnType<typeof getTemplate> & {}; onBack: () => void }) {
  const [stage, setStage] = useState<Stage>('input');
  const [bindings, setBindings] = useState<Bindings>(() => structuredClone(buildSampleBindings()));
  const [resolved, setResolved] = useState<PMDoc | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [docAst, setDocAst] = useState<PMDoc | null>(null);

  const generate = () => {
    const result = resolveTemplate(template.ast, bindings, (id, version) => getClause(id, version));
    setResolved(result.doc);
    setDocAst(result.doc);
    setWarnings(result.warnings);
    setStage('review');
  };

  const print = () => {
    window.print();
  };

  return (
    <div className="container">
      <div className="row no-print" style={{ marginBottom: 16 }}>
        <button className="ghost" onClick={onBack}>← templates</button>
        <h2 style={{ margin: 0 }}>Generate: {template.name}</h2>
        <span className="muted">v{template.version}</span>
        <span className="spacer" />
        <StageStepper stage={stage} setStage={(s) => { if (s === 'input' || resolved) setStage(s); }} hasResolved={!!resolved} />
      </div>

      {stage === 'input' && (
        <InputStage
          template={template}
          bindings={bindings}
          setBindings={setBindings}
          onGenerate={generate}
        />
      )}

      {stage === 'review' && resolved && docAst && (
        <ReviewStage
          resolved={resolved}
          docAst={docAst}
          setDocAst={setDocAst}
          warnings={warnings}
          template={template}
          onBack={() => setStage('input')}
          onPrint={print}
        />
      )}
    </div>
  );
}

function StageStepper({ stage, setStage, hasResolved }: { stage: Stage; setStage: (s: Stage) => void; hasResolved: boolean }) {
  const Step = ({ label, target, active, enabled }: { label: string; target: Stage; active: boolean; enabled: boolean }) => (
    <button
      className={active ? 'primary' : 'ghost'}
      disabled={!enabled}
      onClick={() => setStage(target)}
      style={{ fontWeight: active ? 600 : 400 }}
    >
      {label}
    </button>
  );
  return (
    <div className="row" style={{ gap: 4 }}>
      <Step label="1. Input" target="input" active={stage === 'input'} enabled />
      <span style={{ color: 'var(--ink-2)' }}>→</span>
      <Step label="2. Review & edit" target="review" active={stage === 'review'} enabled={hasResolved} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stage 1 — input bindings via auto-generated form
// ---------------------------------------------------------------------------

function InputStage({ template, bindings, setBindings, onGenerate }: { template: any; bindings: Bindings; setBindings: (b: Bindings) => void; onGenerate: () => void }) {
  // Live re-resolve as bindings change — the right-hand pane previews the
  // doc that 'Generate' would produce. Tiny template + tiny clauses, so this
  // is cheap enough to do on every keystroke without debouncing.
  const livePreview = useMemo(() => {
    return resolveTemplate(template.ast, bindings, (id, version) => getClause(id, version));
  }, [template.ast, bindings]);

  return (
    <>
      <div className="grid-2">
        <div>
          <h3>Bindings</h3>
          <div className="card">
            <BindingsForm variables={template.variables as VariableDef[]} bindings={bindings} setBindings={setBindings} />
            <div className="row" style={{ marginTop: 12, flexWrap: 'wrap', gap: 6 }}>
              <button onClick={() => setBindings(structuredClone(buildSampleBindings()))} className="ghost">↻ John Smith (CA)</button>
              <button onClick={() => setBindings(structuredClone(buildMichiganBindings()))} className="ghost" title="UPC state — defined_term swaps Executor → Personal Representative">↻ Patricia Miller (MI)</button>
              <span className="spacer" />
              <button className="primary" onClick={onGenerate}>Generate document →</button>
            </div>
          </div>
        </div>

        <div>
          <h3>Live preview</h3>
          {livePreview.warnings.length > 0 && (
            <div className="card" style={{ background: 'var(--warn-soft)', borderColor: 'var(--warn)', padding: '8px 12px', marginBottom: 8 }}>
              <strong style={{ fontSize: 12 }}>{livePreview.warnings.length} warning(s):</strong>
              <ul style={{ margin: '4px 0 0 16px', fontSize: 11, fontFamily: 'var(--mono)' }}>
                {livePreview.warnings.slice(0, 5).map((w, i) => <li key={i}>{w}</li>)}
                {livePreview.warnings.length > 5 && <li>… {livePreview.warnings.length - 5} more</li>}
              </ul>
            </div>
          )}
          <div style={{ transform: 'scale(0.75)', transformOrigin: 'top left', width: '133.33%', maxHeight: 700, overflow: 'auto', border: '1px solid var(--line)', borderRadius: 6, background: 'white' }}>
            <RenderResolvedDoc doc={livePreview.doc} />
          </div>
        </div>
      </div>

      <details style={{ marginTop: 16 }}>
        <summary style={{ cursor: 'pointer', color: 'var(--ink-2)' }}>
          <strong>Bindings JSON</strong> — post-resolver computed shape (drives the template engine)
        </summary>
        <pre className="ast-tree" style={{ marginTop: 8 }}>{JSON.stringify(bindings, null, 2)}</pre>
        <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
          In production this would be the output of a <code>BindingsResolver</code> that derives these values from plan
          state (see RFC §3.3 — replaces the legacy <code>getPrimaryWillOptions</code> in tw-planning-svc).
        </div>
      </details>
    </>
  );
}

function BindingsForm({ variables, bindings, setBindings }: { variables: VariableDef[]; bindings: Bindings; setBindings: (b: Bindings) => void }) {
  const setPath = (path: string, value: unknown) => {
    const next = structuredClone(bindings);
    const parts = path.split('.');
    let cur: any = next;
    for (let i = 0; i < parts.length - 1; i++) {
      if (cur[parts[i]] == null || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
    setBindings(next);
  };
  const getPath = (path: string): unknown => {
    let cur: any = bindings;
    for (const part of path.split('.')) {
      if (cur == null) return undefined;
      cur = cur[part];
    }
    return cur;
  };

  return (
    <div>
      {variables.map(v => (
        <div key={v.name} className="field">
          <label>{v.displayName} <span className="muted" style={{ fontWeight: 400 }}>· <code>{v.path}</code> · {v.type}</span></label>
          {renderInput(v, getPath(v.path), (val) => setPath(v.path, val))}
          {v.description && <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{v.description}</div>}
        </div>
      ))}
    </div>
  );
}

function renderInput(v: VariableDef, value: any, set: (val: any) => void): React.ReactNode {
  switch (v.type) {
    case 'person':
      return <PersonPicker value={value as PersonBinding | undefined} onChange={set} />;
    case 'person-array':
      return <PersonArrayPicker value={Array.isArray(value) ? value : []} onChange={set} />;
    case 'asset':
      return <InventoryPicker value={value as InventoryItemBinding | undefined} onChange={set} />;
    case 'asset-array':
      return <InventoryArrayPicker value={Array.isArray(value) ? value : []} onChange={set} />;
    case 'string':
      return <input value={value ?? ''} onChange={(e) => set(e.target.value)} />;
    case 'number':
      return <input type="number" value={value ?? ''} onChange={(e) => set(Number(e.target.value))} />;
    case 'boolean':
      return (
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" checked={!!value} onChange={(e) => set(e.target.checked)} />
          <span className="muted">{value ? 'true' : 'false'}</span>
        </label>
      );
    case 'date':
      return <input type="date" value={value ?? ''} onChange={(e) => set(e.target.value)} />;
    case 'enum':
      return (
        <select value={value ?? ''} onChange={(e) => set(e.target.value)}>
          <option value="">— select —</option>
          {(v.enumValues ?? []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      );
    case 'array': {
      const arr = Array.isArray(value) ? value : [];
      const itemSchema = v.itemSchema?.[0];
      const isSimple = !v.itemSchema || v.itemSchema.length === 1 && (!itemSchema?.path);
      return (
        <div style={{ border: '1px dashed var(--line)', padding: 8, borderRadius: 4 }}>
          {arr.length === 0 && <div className="muted" style={{ fontSize: 12 }}>empty</div>}
          {arr.map((item, i) => (
            <div key={i} className="row" style={{ marginBottom: 6 }}>
              {isSimple ? (
                <input style={{ flex: 1 }} value={item ?? ''} onChange={(e) => {
                  const next = arr.slice(); next[i] = e.target.value; set(next);
                }} />
              ) : (
                <div style={{ flex: 1, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(v.itemSchema ?? []).map(sub => (
                    <span key={sub.name} style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: 10, color: 'var(--ink-2)' }}>{sub.displayName}</span>
                      <input
                        value={item?.[sub.path] ?? ''}
                        onChange={(e) => {
                          const next = arr.slice();
                          next[i] = { ...next[i], [sub.path]: e.target.value };
                          set(next);
                        }}
                        type={sub.type === 'date' ? 'date' : 'text'}
                      />
                    </span>
                  ))}
                </div>
              )}
              <button className="danger ghost" onClick={() => { const next = arr.slice(); next.splice(i, 1); set(next); }}>✕</button>
            </div>
          ))}
          <button onClick={() => {
            const blank = isSimple ? '' : Object.fromEntries((v.itemSchema ?? []).map(s => [s.path, '']));
            set([...arr, blank]);
          }}>+ add</button>
        </div>
      );
    }
    case 'object':
      return <textarea value={JSON.stringify(value ?? {}, null, 2)} rows={4} onChange={(e) => { try { set(JSON.parse(e.target.value)); } catch {} }} />;
    default:
      return <input value={String(value ?? '')} onChange={(e) => set(e.target.value)} />;
  }
}

// ---------------------------------------------------------------------------
// Stage 2 — review + edit the resolved doc inline
// The Tiptap editor is rendered with .doc-preview-style so it visually
// matches the legal-doc layout (serif body, US Letter margins) while
// staying fully editable. Print/Save as PDF uses the same DOM, so what
// the attorney sees is what gets printed.
// ---------------------------------------------------------------------------

function ReviewStage({ resolved, docAst, setDocAst, warnings, onBack, onPrint }: any) {
  return (
    <>
      <div className="row no-print" style={{ marginBottom: 12 }}>
        <button onClick={onBack} className="ghost">← back to input</button>
        <span className="muted">Click anywhere in the document to edit. Template stays unchanged — these edits only apply to this generated document.</span>
        <span className="spacer" />
        {warnings.length > 0 && (
          <span className="badge warn">{warnings.length} warning{warnings.length === 1 ? '' : 's'}</span>
        )}
        <button onClick={onPrint} className="primary">🖨 Print / Save as PDF</button>
      </div>

      {warnings.length > 0 && (
        <div className="card no-print" style={{ background: 'var(--warn-soft)', borderColor: 'var(--warn)' }}>
          <strong>Resolver warnings</strong>
          <ul style={{ margin: '6px 0 0 16px' }}>
            {warnings.map((w: string, i: number) => <li key={i} style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{w}</li>)}
          </ul>
        </div>
      )}

      <div className="doc-editor-wrap">
        <TiptapEditor
          mode="document"
          initialDoc={docAst}
          onChange={(d) => setDocAst(d)}
          docStyle
        />
      </div>

      <div className="card no-print" style={{ marginTop: 16 }}>
        <h3 style={{ margin: '0 0 8px 0' }}>Resolved AST (debug)</h3>
        <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
          isResolved: <strong>{isResolved(resolved) ? 'true' : 'false'}</strong> —{' '}
          no variable_ref / conditional / for_each / clause_ref nodes remain.
        </div>
        <details>
          <summary style={{ cursor: 'pointer', color: 'var(--ink-2)' }}>Show resolved JSON</summary>
          <pre className="ast-tree">{JSON.stringify(resolved, null, 2)}</pre>
        </details>
        <details style={{ marginTop: 8 }}>
          <summary style={{ cursor: 'pointer', color: 'var(--ink-2)' }}>Show editable JSON (after attorney edits)</summary>
          <pre className="ast-tree">{JSON.stringify(docAst, null, 2)}</pre>
        </details>
      </div>
    </>
  );
}
