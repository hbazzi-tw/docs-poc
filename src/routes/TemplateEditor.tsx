import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { TiptapEditor } from '../editor/TiptapEditor';
import { getTemplate, saveTemplate } from '../store/store';
import type { PMDoc, VariableDef, VariableType } from '../types';

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
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const toggle = (i: number) => {
    const next = new Set(expanded);
    if (next.has(i)) next.delete(i); else next.add(i);
    setExpanded(next);
  };
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
      {variables.map((v, i) => {
        const isOpen = expanded.has(i);
        return (
          <div key={i} style={{ marginBottom: 6, border: '1px solid var(--rule)', borderRadius: 4, background: isOpen ? '#fafaf6' : 'transparent' }}>
            <div className="row" style={{ gap: 6, padding: 4 }}>
              <button
                className="ghost"
                onClick={() => toggle(i)}
                title={isOpen ? 'Collapse' : 'Expand — show available fields & example usage'}
                style={{ width: 24, padding: 0, fontFamily: 'var(--mono)' }}
              >
                {isOpen ? '▾' : '▸'}
              </button>
              <input style={{ flex: 1 }} value={v.displayName} onChange={(e) => update(i, { displayName: e.target.value })} />
              <input style={{ width: 200, fontFamily: 'var(--mono)' }} value={v.path} onChange={(e) => update(i, { path: e.target.value })} />
              <select value={v.type} onChange={(e) => update(i, { type: e.target.value as VariableType })}>
                <option value="string">string</option>
                <option value="number">number</option>
                <option value="boolean">boolean</option>
                <option value="date">date</option>
                <option value="enum">enum</option>
                <option value="object">object</option>
                <option value="array">array</option>
                <option value="person">person</option>
                <option value="person-array">person-array</option>
                <option value="asset">asset</option>
                <option value="asset-array">asset-array</option>
              </select>
              <button className="danger ghost" onClick={() => remove(i)} title="Delete">✕</button>
            </div>
            {isOpen && (
              <div style={{ padding: '4px 8px 10px 32px', fontSize: 12 }}>
                <VariableDetails variable={v} onChange={(patch) => update(i, patch)} />
              </div>
            )}
          </div>
        );
      })}
      <button onClick={add}>+ add variable</button>
    </div>
  );
}

// Per-variable expander: editable description + required toggle, plus a
// read-only schema reference driven by the selected `type`. The goal is so
// template authors don't have to spelunk types.ts to know "what fields does
// a `person` have" or "how do I iterate a `person-array`".
function VariableDetails({ variable, onChange }: { variable: VariableDef; onChange: (patch: Partial<VariableDef>) => void }) {
  const info = TYPE_INFO[variable.type];
  const exampleText = info.example.replace(/\{path\}/g, variable.path);
  return (
    <div>
      <div className="field" style={{ marginTop: 4 }}>
        <label style={{ fontSize: 11 }}>Description</label>
        <textarea
          value={variable.description ?? ''}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={2}
          placeholder="Optional — what is this value? When is it set?"
        />
      </div>
      <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
        <input
          type="checkbox"
          checked={!!variable.required}
          onChange={(e) => onChange({ required: e.target.checked })}
        />
        Required
      </label>

      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-2)' }}>
          Type · {variable.type}
        </div>
        <div style={{ marginTop: 4 }}>{info.summary}</div>
      </div>

      {info.fields && info.fields.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-2)' }}>
            Available subfields
          </div>
          <pre style={{ background: '#f5f3ee', padding: 8, marginTop: 4, fontSize: 11, whiteSpace: 'pre-wrap', overflow: 'auto' }}>
{info.fields.map(f => `${variable.path}.${f.name.padEnd(28)} ${f.desc}`).join('\n')}
          </pre>
        </div>
      )}

      {variable.itemSchema && variable.itemSchema.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-2)' }}>
            Item schema {variable.type === 'array' ? '(per item)' : ''}
          </div>
          <pre style={{ background: '#f5f3ee', padding: 8, marginTop: 4, fontSize: 11, whiteSpace: 'pre-wrap', overflow: 'auto' }}>
{variable.itemSchema.map(s => `${s.path.padEnd(28)} ${s.type.padEnd(12)} ${s.description ?? s.displayName}`).join('\n')}
          </pre>
        </div>
      )}

      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-2)' }}>
          Example template usage
        </div>
        <pre style={{ background: '#f5f3ee', padding: 8, marginTop: 4, fontSize: 11, whiteSpace: 'pre-wrap', overflow: 'auto' }}>
{exampleText}
        </pre>
      </div>
    </div>
  );
}

type TypeInfo = {
  summary: string;
  fields?: Array<{ name: string; desc: string }>;
  example: string;
};

const TYPE_INFO: Record<VariableType, TypeInfo> = {
  string: {
    summary: 'Scalar text value. Inserted via variable_ref. Optional transform: upper | lower | title.',
    example: 'variable_ref path="{path}"',
  },
  number: {
    summary: 'Numeric value. Renders as-is via variable_ref. Useful in conditional expressions, e.g. `{path} > 0`.',
    example: 'variable_ref path="{path}"\nconditional condition="{path} > 0"',
  },
  boolean: {
    summary: 'true/false flag. Almost always used inside a conditional rather than rendered directly.',
    example: 'conditional condition="{path}"',
  },
  date: {
    summary: 'ISO-8601 date string. Inserted via variable_ref (no formatting yet — POC limitation).',
    example: 'variable_ref path="{path}"',
  },
  enum: {
    summary: 'String constrained to a fixed set. Use enumValues to document allowed values. Often gates conditionals.',
    example: 'conditional condition="{path} == \'some-value\'"',
  },
  object: {
    summary: 'Plain object. Access subfields via dot notation. Provide an itemSchema below to document its shape.',
    example: 'variable_ref path="{path}.subfield"',
  },
  array: {
    summary: 'Array of values or objects. Iterate with for_each, or access by index. Use `.length` in conditionals.',
    example: 'for_each over="{path}" as="item"\n  variable_ref path="item.subfield"\nend_for_each',
  },
  person: {
    summary: 'PersonBinding — Trust & Will\'s canonical person shape, enriched with synthesized `name` (first + last) and `full_address` (formatted single-line) fields.',
    fields: [
      { name: 'name', desc: 'Full name — synthesized "first_name last_name"' },
      { name: 'first_name', desc: 'First name' },
      { name: 'last_name', desc: 'Last name' },
      { name: 'email', desc: 'Email (nullable)' },
      { name: 'phone_number', desc: 'Phone (nullable)' },
      { name: 'full_address', desc: 'Formatted single-line address' },
      { name: 'address_line_one', desc: 'Street line 1' },
      { name: 'address_line_two', desc: 'Street line 2 (nullable)' },
      { name: 'city', desc: 'City' },
      { name: 'state', desc: 'State / region' },
      { name: 'postal_code', desc: 'Postal code' },
      { name: 'country', desc: 'Country' },
      { name: 'relationship', desc: 'Relationship label (e.g. "spouse", "child")' },
      { name: 'related_to', desc: 'GUID of related person' },
      { name: 'dob', desc: 'Date of birth (ISO)' },
      { name: 'guid', desc: 'Stable person GUID' },
    ],
    example: 'variable_ref path="{path}.name"           → "Jane Smith"\nvariable_ref path="{path}.full_address"',
  },
  'person-array': {
    summary: 'Array of PersonBinding (same fields as `person`). Iterate with for_each; or access by index. Use `.length` in conditionals to gate inclusion.',
    fields: [
      { name: '[i].name', desc: 'Name of person at index i' },
      { name: '[i].<any person field>', desc: 'Any PersonBinding field on the indexed person' },
      { name: 'length', desc: 'Number of persons (use in `conditional`)' },
    ],
    example: 'for_each over="{path}" as="p"\n  variable_ref path="p.name", variable_ref path="p.relationship"\nend_for_each\n\nconditional condition="{path}.length > 0"',
  },
  asset: {
    summary: 'EstateInventoryItem — discriminated by `item_type`. The binding includes synthesized display strings used by the Will body and Schedule of Assets.',
    fields: [
      { name: 'name', desc: 'Display name / shortname' },
      { name: 'description', desc: 'Free-form description' },
      { name: 'item_type', desc: 'real_estate | financial_account | life_insurance | vehicle | business_interest | other' },
      { name: 'gift_display', desc: 'Pre-formatted gift narrative (Will body)' },
      { name: 'ownership_display', desc: 'Pre-formatted ownership phrase' },
      { name: 'soa_display', desc: 'Primary line for Schedule of Assets row' },
      { name: 'soa_secondary', desc: 'Secondary SoA line (e.g. account ••1234, VIN)' },
      { name: 'is_gift / gift_from', desc: 'Gift flag + 1=User / 2=Spouse / 3=Both' },
      { name: 'first_gift_recipient', desc: 'Primary specific-gift recipient (when is_gift)' },
      { name: 'address_line_one / city / state / zipcode', desc: 'Real estate only' },
      { name: 'year / make / model / vin', desc: 'Vehicle only' },
      { name: 'institution_name / account_number_last4', desc: 'Financial account only' },
      { name: 'insurer_name / policy_number', desc: 'Life insurance only' },
      { name: 'asset_sub_type_name / state_of_formation', desc: 'Business interest only' },
    ],
    example: 'variable_ref path="{path}.soa_display"\nvariable_ref path="{path}.gift_display"',
  },
  'asset-array': {
    summary: 'Array of EstateInventoryItem (same fields as `asset`). Iterate with for_each — common pattern: filter via conditional on `item.item_type` or `item.is_gift`.',
    fields: [
      { name: '[i].soa_display', desc: 'SoA row line for indexed item' },
      { name: '[i].gift_display', desc: 'Will body gift narrative' },
      { name: '[i].<any asset field>', desc: 'Any EstateInventoryItem field' },
      { name: 'length', desc: 'Item count' },
    ],
    example: 'for_each over="{path}" as="item"\n  variable_ref path="item.gift_display"\nend_for_each\n\nconditional condition="{path}.length > 0"',
  },
};
