import React from 'react';
import { Link } from 'react-router-dom';
import { usePeople, toBinding, getPerson } from '../store/people';
import type { PersonBinding } from '../types';

// ---------------------------------------------------------------------------
// PersonPicker — single Person reference in a binding.
//
// Stores the *materialized* PersonBinding (raw payload + name + full_address)
// directly in bindings. Matches RFC §3.5's `bindingsSnapshot` model: store the
// post-resolver computed shape, not a guid that has to be re-looked-up at
// render time. Deterministic re-generation comes for free.
// ---------------------------------------------------------------------------

export function PersonPicker({
  value,
  onChange,
}: {
  value: PersonBinding | undefined;
  onChange: (val: PersonBinding | undefined) => void;
}) {
  const people = usePeople();

  return (
    <div className="row" style={{ gap: 6 }}>
      <select
        value={value?.guid ?? ''}
        onChange={(e) => {
          if (!e.target.value) { onChange(undefined); return; }
          const p = getPerson(e.target.value);
          if (p) onChange(toBinding(p));
        }}
        style={{ flex: 1 }}
      >
        <option value="">— select person —</option>
        {people.map(p => (
          <option key={p.guid} value={p.guid}>
            {p.first_name} {p.last_name}
            {p.relationship ? ` (${p.relationship})` : ''}
          </option>
        ))}
      </select>
      {value && (
        <Link to={`/people/${value.guid}`} title="Open person record" style={{ alignSelf: 'center', fontSize: 12 }}>
          edit ↗
        </Link>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PersonArrayPicker — ordered list of Persons (e.g. backup executors).
// ---------------------------------------------------------------------------

export function PersonArrayPicker({
  value,
  onChange,
}: {
  value: PersonBinding[];
  onChange: (val: PersonBinding[]) => void;
}) {
  return (
    <div style={{ border: '1px dashed var(--line)', padding: 8, borderRadius: 4 }}>
      {value.length === 0 && <div className="muted" style={{ fontSize: 12 }}>(empty)</div>}
      {value.map((p, i) => (
        <div key={i} className="row" style={{ marginBottom: 6 }}>
          <span className="muted" style={{ width: 18, textAlign: 'right' }}>{i + 1}.</span>
          <div style={{ flex: 1 }}>
            <PersonPicker
              value={p}
              onChange={(updated) => {
                const next = value.slice();
                if (updated) next[i] = updated;
                else next.splice(i, 1);
                onChange(next);
              }}
            />
          </div>
          <button
            className="ghost"
            disabled={i === 0}
            onClick={() => {
              const next = value.slice();
              [next[i - 1], next[i]] = [next[i], next[i - 1]];
              onChange(next);
            }}
            title="Move up"
          >↑</button>
          <button
            className="ghost"
            disabled={i === value.length - 1}
            onClick={() => {
              const next = value.slice();
              [next[i + 1], next[i]] = [next[i], next[i + 1]];
              onChange(next);
            }}
            title="Move down"
          >↓</button>
          <button
            className="danger ghost"
            onClick={() => {
              const next = value.slice();
              next.splice(i, 1);
              onChange(next);
            }}
          >✕</button>
        </div>
      ))}
      <PersonPicker
        value={undefined}
        onChange={(p) => p && onChange([...value, p])}
      />
    </div>
  );
}
