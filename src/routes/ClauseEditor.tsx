import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { TiptapEditor } from '../editor/TiptapEditor';
import { getClause, getClauses, saveClause, deleteClause, forkClause } from '../store/store';

export function ClauseEditor() {
  const { id, version } = useParams<{ id: string; version: string }>();
  const navigate = useNavigate();
  const initial = useMemo(() => (id && version ? getClause(id, version) : undefined), [id, version]);
  const [clause, setClause] = useState(initial);

  // Re-sync local state when the route params change (e.g. after Fork
  // navigates from v1.0.0 → v1.1.0). Without this, useState keeps the
  // first-mount value forever and the URL silently disagrees with the
  // editor contents.
  useEffect(() => {
    setClause(initial);
  }, [id, version, initial]);

  if (!clause) {
    return (
      <div className="container">
        <p>Clause not found. <Link to="/clauses">Back to clauses</Link></p>
      </div>
    );
  }

  // Published clauses are FROZEN — no field can change (RFC §3.6: "Published
  // versions are frozen. Legal reproducibility: a Will finalized against
  // v1.2 must be reproducible from v1.2 forever."). The only path forward
  // is "Fork as new draft" which makes a fresh editable version while
  // leaving the published one untouched.
  const isFrozen = clause.status === 'published';

  const update = (patch: Partial<typeof clause>) => {
    if (isFrozen) return;
    const next = { ...clause, ...patch };
    setClause(next);
    saveClause(next);
  };

  // List all existing versions of this clause id so users can navigate between
  // them and see how `clause_ref`'s version pinning behaves end-to-end.
  const allVersions = useMemo(() => {
    if (!clause) return [];
    return getClauses()
      .filter(c => c.id === clause.id)
      .sort((a, b) => b.version.localeCompare(a.version));
  }, [clause?.id, clause?.version, clause?.updatedAt]);

  // Fork creates a new draft version. Source clause stays untouched —
  // existing pinned clause_refs continue to resolve to it. Floating
  // `latest` refs keep resolving to the previous published version until
  // the new draft is promoted to published.
  const fork = () => {
    if (!clause) return;
    const next = forkClause(clause);
    if (!next) {
      alert(
        `Couldn't create fork — the bumped version slot is already taken by a ` +
        `published clause. Use the topbar "↻ reset seed" to start fresh, or ` +
        `delete the conflicting version.`
      );
      return;
    }
    navigate(`/clauses/${next.id}/${next.version}`);
  };

  // One-way transition: draft → published. Once published, the version is
  // immutable (RFC §3.6). We make this an explicit, confirmed action
  // rather than a status dropdown so attorneys don't accidentally publish
  // by clicking the wrong option.
  const publishDraft = () => {
    if (!clause || isFrozen) return;
    const ok = confirm(
      `Publish ${clause.id} v${clause.version}?\n\n` +
      `Once published, this version is FROZEN — its content, metadata, and AST ` +
      `become immutable. Any clause_ref pinned to v${clause.version} will keep ` +
      `resolving to this exact content forever. To make further edits, you'll ` +
      `need to fork a new draft.`
    );
    if (!ok) return;
    const next = { ...clause, status: 'published' as const };
    setClause(next);
    saveClause(next);
  };

  // Drafts can be deleted (published versions cannot — they may be the
  // pin target of clause_refs in the wild).
  const deleteDraft = () => {
    if (!clause || isFrozen) return;
    const ok = confirm(`Delete draft ${clause.id} v${clause.version}?`);
    if (!ok) return;
    deleteClause(clause.id, clause.version);
    navigate('/clauses');
  };

  return (
    <div className="container">
      <div className="row" style={{ marginBottom: 8 }}>
        <Link to="/clauses"><button className="ghost">← clauses</button></Link>
        <h2 style={{ margin: 0 }}>{clause.name}</h2>
        <span className={`badge ${clause.status === 'published' ? 'ok' : 'warn'}`}>{clause.status}</span>
        <span className="muted">v{clause.version}</span>
        {isFrozen && <span style={{ fontSize: 11, color: 'var(--ink-2)' }}>· read-only</span>}
        <span className="spacer" />
        <code style={{ color: 'var(--ink-2)' }}>{clause.id}</code>
        {!isFrozen && (
          <button
            onClick={publishDraft}
            className="primary"
            title="Publish this draft — once published the version becomes immutable"
          >
            Publish draft
          </button>
        )}
        <button
          onClick={fork}
          className={isFrozen ? 'primary' : ''}
          title="Create a new draft version, leaving the current one unchanged so existing pinned references still resolve to it"
        >
          ⑂ Fork as new draft
        </button>
        {!isFrozen && (
          <button
            onClick={deleteDraft}
            className="danger ghost"
            title="Delete this draft. Published versions cannot be deleted."
          >
            Delete draft
          </button>
        )}
      </div>

      {isFrozen && (
        <div className="card" style={{ background: 'var(--ok-soft)', borderColor: 'var(--ok)', padding: '10px 14px', marginBottom: 12 }}>
          <strong style={{ color: 'var(--ok)' }}>🔒 This version is published and frozen.</strong>
          <div style={{ fontSize: 12, marginTop: 4 }}>
            Published clause versions are immutable so any <code>clause_ref</code> pinned to <code>v{clause.version}</code> keeps resolving to this exact content
            — a Will finalized against this version must be reproducible from it forever (RFC §3.6).
            To make edits, click <strong>⑂ Fork as new draft</strong> above. The new draft will start as a copy of this content; existing pinned references stay on the current version.
          </div>
        </div>
      )}

      {allVersions.length > 1 && (
        <div className="card" style={{ padding: '8px 12px', marginBottom: 12, background: '#f7f5ef' }}>
          <strong style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-2)' }}>Version history</strong>
          <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {allVersions.map(v => {
              const isCurrent = v.version === clause.version;
              return (
                <Link
                  key={v.version}
                  to={`/clauses/${v.id}/${v.version}`}
                  className="badge"
                  style={{
                    background: isCurrent ? 'var(--accent)' : (v.status === 'published' ? 'var(--ok-soft)' : 'var(--warn-soft)'),
                    color: isCurrent ? 'white' : (v.status === 'published' ? 'var(--ok)' : 'var(--warn)'),
                    textDecoration: 'none',
                    fontSize: 11,
                    fontWeight: isCurrent ? 600 : 400,
                  }}
                >
                  v{v.version} · {v.status}
                </Link>
              );
            })}
          </div>
          <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>
            Published versions stay frozen — pinned <code>clause_ref</code>s anywhere in the system keep resolving to whichever version they pin to. Floating references (<code>version: "latest"</code>) pick up the newest published version automatically.
          </div>
        </div>
      )}

      <div className="grid-2">
        <div>
          <h3>Clause AST{isFrozen && <span className="muted" style={{ fontWeight: 400, marginLeft: 8, fontSize: 12 }}>(read-only)</span>}</h3>
          <TiptapEditor
            mode="clause"
            initialDoc={clause.ast}
            onChange={(ast) => update({ ast })}
            editable={!isFrozen}
          />
        </div>

        <div>
          <h3>Metadata{isFrozen && <span className="muted" style={{ fontWeight: 400, marginLeft: 8, fontSize: 12 }}>(read-only)</span>}</h3>
          <div className="card">
            <div className="field">
              <label>Name</label>
              <input value={clause.name} onChange={(e) => update({ name: e.target.value })} disabled={isFrozen} />
            </div>
            <div className="field">
              <label>ID (immutable)</label>
              <input value={clause.id} disabled />
            </div>
            <div className="field">
              <label>Version (immutable once saved — fork to create a new one)</label>
              <input value={clause.version} disabled />
            </div>
            <div className="field">
              <label>Status</label>
              <div className="muted" style={{ fontSize: 13 }}>
                {clause.status === 'published' ? '🔒 Published (frozen)' : '✏️ Draft'}
              </div>
              <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                {isFrozen
                  ? 'Once published, status cannot be reverted — published versions are frozen for legal reproducibility.'
                  : 'Use the "Publish draft" button above to lock this version. The action is one-way.'}
              </div>
            </div>
            <div className="field">
              <label>Jurisdiction (optional)</label>
              <input value={clause.jurisdiction ?? ''} onChange={(e) => update({ jurisdiction: e.target.value || undefined })} placeholder="e.g. CA, NY" disabled={isFrozen} />
            </div>
            <div className="field">
              <label>Applicable to (comma-separated)</label>
              <input
                value={(clause.applicableTo ?? []).join(', ')}
                onChange={(e) => update({ applicableTo: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                disabled={isFrozen}
              />
            </div>
            <div className="field">
              <label>Tags (comma-separated)</label>
              <input
                value={(clause.tags ?? []).join(', ')}
                onChange={(e) => update({ tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                disabled={isFrozen}
              />
            </div>
            <div className="field">
              <label>Purpose</label>
              <textarea value={clause.purpose ?? ''} onChange={(e) => update({ purpose: e.target.value })} rows={3} disabled={isFrozen} />
            </div>
          </div>

          <h3 style={{ marginTop: 16 }}>Raw AST (debug)</h3>
          <details>
            <summary style={{ cursor: 'pointer', color: 'var(--ink-2)' }}>Show JSON</summary>
            <pre className="ast-tree">{JSON.stringify(clause.ast, null, 2)}</pre>
          </details>
        </div>
      </div>
    </div>
  );
}

