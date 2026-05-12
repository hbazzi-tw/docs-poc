import React from 'react';
import { Link } from 'react-router-dom';
import { useClauses, saveClause } from '../store/store';
import type { Clause } from '../types';

export function ClauseLibrary() {
  const clauses = useClauses();

  const addClause = () => {
    const id = prompt('New clause id (kebab-case):');
    if (!id) return;
    const name = prompt('Display name:') ?? id;
    const cl: Clause = {
      id,
      name,
      version: '1.0.0',
      status: 'draft',
      ast: { type: 'doc', content: [{ type: 'paragraph' }] },
      applicableTo: ['will'],
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveClause(cl);
  };

  const byId = new Map<string, Clause[]>();
  for (const c of clauses) {
    if (!byId.has(c.id)) byId.set(c.id, []);
    byId.get(c.id)!.push(c);
  }

  return (
    <div className="container">
      <div className="row" style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Clause Library</h2>
        <span className="muted">— versioned, reusable AST fragments referenced by templates via clause_ref</span>
        <span className="spacer" />
        <button onClick={addClause}>+ new clause</button>
      </div>

      {[...byId.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([id, versions]) => {
        const sorted = versions.slice().sort((a, b) => b.version.localeCompare(a.version));
        const latest = sorted[0];
        return (
          <div key={id} className="list-item" style={{ display: 'block' }}>
            <Link to={`/clauses/${latest.id}/${latest.version}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
              <div style={{ fontWeight: 600 }}>{latest.name}</div>
              <div className="meta">
                <code>{latest.id}</code>
                {latest.jurisdiction && ` · ${latest.jurisdiction}`}
                {latest.applicableTo?.length ? ` · ${latest.applicableTo.join(', ')}` : ''}
              </div>
              {latest.purpose && <div className="meta" style={{ marginTop: 4 }}>{latest.purpose}</div>}
              {latest.tags?.length ? (
                <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
                  {latest.tags.map(tag => <span key={tag} className="badge" style={{ fontSize: 10 }}>{tag}</span>)}
                </div>
              ) : null}
            </Link>
            <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {sorted.map(v => (
                <Link
                  key={v.version}
                  to={`/clauses/${v.id}/${v.version}`}
                  onClick={(e) => e.stopPropagation()}
                  className="badge"
                  style={{
                    background: v.status === 'published' ? 'var(--ok-soft)' : 'var(--warn-soft)',
                    color: v.status === 'published' ? 'var(--ok)' : 'var(--warn)',
                    textDecoration: 'none',
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                  title={`${v.status} · ${new Date(v.updatedAt).toLocaleDateString()}`}
                >
                  v{v.version} · {v.status}
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
