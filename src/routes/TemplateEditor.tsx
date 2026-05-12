import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { TiptapEditor } from '../editor/TiptapEditor';
import { getTemplate, saveTemplate } from '../store/store';
import type { PMDoc, VariableDef } from '../types';

export function TemplateEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const initial = useMemo(() => (id ? getTemplate(id) : undefined), [id]);
  const [template, setTemplate] = useState(initial);

  if (!template) {
    return (
      <div className="container">
        <p>Template not found. <Link to="/templates">Back to templates</Link></p>
      </div>
    );
  }

  const update = (patch: Partial<typeof template>) => {
    const next = { ...template, ...patch };
    setTemplate(next);
    saveTemplate(next);
  };

  return (
    <div className="container">
      <div className="row" style={{ marginBottom: 16 }}>
        <Link to="/templates" className="ghost"><button className="ghost">← templates</button></Link>
        <h2 style={{ margin: 0 }}>{template.name}</h2>
        <span className={`badge ${template.status === 'published' ? 'ok' : 'warn'}`}>{template.status}</span>
        <span className="muted">v{template.version}</span>
        <span className="spacer" />
        <Link to={`/generate/${template.id}`}><button className="primary">Generate document →</button></Link>
      </div>

      <div className="grid-2">
        <div>
          <h3>Document AST (Tiptap)</h3>
          <TiptapEditor
            mode="template"
            initialDoc={template.ast}
            onChange={(ast) => update({ ast })}
          />

          <div className="card" style={{ marginTop: 16 }}>
            <h3 style={{ margin: '0 0 8px 0' }}>How to use this editor</h3>
            <ul style={{ fontSize: 12, color: 'var(--ink-2)', margin: 0, paddingLeft: 18 }}>
              <li><strong>{`{ var }`}</strong> — insert a variable reference (click to edit path)</li>
              <li><strong>▸ clause</strong> — insert a clause reference (click to pick clause + version)</li>
              <li><strong>IF…</strong> — wrap selection in a conditional (click <em>IF</em> to edit expression)</li>
              <li><strong>FOR…</strong> — wrap selection in a for_each loop</li>
              <li><strong>▢ sig</strong> — insert a signature block (click to edit attrs)</li>
            </ul>
          </div>
        </div>

        <div>
          <h3>Variables</h3>
          <div className="card">
            <VariablesEditor
              variables={template.variables}
              onChange={(vars) => update({ variables: vars })}
            />
          </div>

          <h3 style={{ marginTop: 16 }}>Metadata</h3>
          <div className="card">
            <div className="field">
              <label>Name</label>
              <input value={template.name} onChange={(e) => update({ name: e.target.value })} />
            </div>
            <div className="field">
              <label>Instrument type</label>
              <select value={template.instrumentType} onChange={(e) => update({ instrumentType: e.target.value as any })}>
                <option value="will">Will</option>
                <option value="trust">Trust</option>
                <option value="poa">POA</option>
                <option value="healthcare-directive">Healthcare Directive</option>
              </select>
            </div>
            <div className="field">
              <label>Version</label>
              <input value={template.version} onChange={(e) => update({ version: e.target.value })} />
            </div>
            <div className="field">
              <label>Status</label>
              <select value={template.status} onChange={(e) => update({ status: e.target.value as any })}>
                <option value="draft">draft</option>
                <option value="published">published</option>
              </select>
            </div>
            <div className="field">
              <label>Purpose</label>
              <textarea value={template.purpose ?? ''} onChange={(e) => update({ purpose: e.target.value })} rows={3} />
            </div>
          </div>

          <h3 style={{ marginTop: 16 }}>Raw AST (debug)</h3>
          <details>
            <summary style={{ cursor: 'pointer', color: 'var(--ink-2)' }}>Show JSON</summary>
            <pre className="ast-tree">{JSON.stringify(template.ast, null, 2)}</pre>
          </details>
        </div>
      </div>
    </div>
  );
}

function VariablesEditor({ variables, onChange }: { variables: VariableDef[]; onChange: (v: VariableDef[]) => void }) {
  const update = (i: number, patch: Partial<VariableDef>) => {
    const next = variables.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const remove = (i: number) => {
    onChange(variables.filter((_, j) => j !== i));
  };
  const add = () => {
    onChange([...variables, { name: 'new-var', displayName: 'New Variable', type: 'string', path: 'new.path' }]);
  };
  return (
    <div>
      {variables.map((v, i) => (
        <div key={i} className="row" style={{ marginBottom: 6, gap: 6 }}>
          <input style={{ flex: 1 }} value={v.displayName} onChange={(e) => update(i, { displayName: e.target.value })} />
          <input style={{ width: 200, fontFamily: 'var(--mono)' }} value={v.path} onChange={(e) => update(i, { path: e.target.value })} />
          <select value={v.type} onChange={(e) => update(i, { type: e.target.value as any })}>
            <option>string</option>
            <option>boolean</option>
            <option>number</option>
            <option>date</option>
            <option>enum</option>
            <option>array</option>
            <option>object</option>
          </select>
          <button className="danger ghost" onClick={() => remove(i)} title="Delete">✕</button>
        </div>
      ))}
      <button onClick={add}>+ add variable</button>
    </div>
  );
}
