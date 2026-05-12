import React from 'react';
import { Link } from 'react-router-dom';
import { useTemplates } from '../store/store';

export function TemplateList() {
  const templates = useTemplates();
  return (
    <div className="container">
      <div className="row" style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Templates</h2>
        <span className="muted">— reusable document definitions composed of clauses + variables + conditionals</span>
      </div>
      {templates.length === 0 && <div className="empty-state">No templates yet.</div>}
      {templates.map(t => (
        <Link key={t.id} to={`/templates/${t.id}`} className="list-item" style={{ textDecoration: 'none', color: 'inherit', display: 'flex' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>{t.name}</div>
            <div className="meta">
              {t.instrumentType} · v{t.version} · <span className={`badge ${t.status === 'published' ? 'ok' : 'warn'}`}>{t.status}</span>
              {t.jurisdiction ? ` · ${t.jurisdiction}` : ''}
            </div>
            {t.purpose && <div className="meta" style={{ marginTop: 4 }}>{t.purpose}</div>}
          </div>
          <div className="meta">
            {t.variables.length} variables · {countClauseRefs(t.ast)} clause refs
          </div>
        </Link>
      ))}
    </div>
  );
}

function countClauseRefs(node: any): number {
  if (!node) return 0;
  let n = 0;
  if (node.type === 'clause_ref') n++;
  if (Array.isArray(node.content)) for (const c of node.content) n += countClauseRefs(c);
  return n;
}
