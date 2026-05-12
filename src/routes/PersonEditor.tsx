import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getPerson, savePerson, deletePerson } from '../store/people';
import type { Person } from '../types';

const FIELDS: { key: keyof Person; label: string; type?: string; nullable?: boolean }[] = [
  { key: 'first_name', label: 'First name' },
  { key: 'last_name', label: 'Last name' },
  { key: 'email', label: 'Email', type: 'email', nullable: true },
  { key: 'phone_number', label: 'Phone', nullable: true },
  { key: 'dob', label: 'Date of birth', type: 'date', nullable: true },
  { key: 'relationship', label: 'Relationship', nullable: true },
  { key: 'related_to', label: 'Related to (guid)', nullable: true },
  { key: 'address_line_one', label: 'Address line 1', nullable: true },
  { key: 'address_line_two', label: 'Address line 2', nullable: true },
  { key: 'city', label: 'City', nullable: true },
  { key: 'state', label: 'State', nullable: true },
  { key: 'postal_code', label: 'Postal code', nullable: true },
  { key: 'country', label: 'Country', nullable: true },
  { key: 'type', label: 'Type' },
];

export function PersonEditor() {
  const { guid } = useParams<{ guid: string }>();
  const navigate = useNavigate();
  const initial = useMemo(() => (guid ? getPerson(guid) : undefined), [guid]);
  const [person, setPerson] = useState<Person | undefined>(initial);

  if (!person) {
    return <div className="container"><p>Person not found. <Link to="/people">Back to people</Link></p></div>;
  }

  const update = (patch: Partial<Person>) => {
    const next = { ...person, ...patch };
    setPerson(next);
    savePerson(next);
  };

  const removeMe = () => {
    if (!confirm(`Delete ${person.first_name} ${person.last_name}?`)) return;
    deletePerson(person.guid);
    navigate('/people');
  };

  return (
    <div className="container">
      <div className="row" style={{ marginBottom: 16 }}>
        <Link to="/people"><button className="ghost">← people</button></Link>
        <h2 style={{ margin: 0 }}>{person.first_name} {person.last_name}</h2>
        <span className="muted"><code>{person.guid}</code></span>
        <span className="spacer" />
        <button className="danger ghost" onClick={removeMe}>Delete</button>
      </div>

      <div className="grid-2">
        <div className="card">
          {FIELDS.map(f => (
            <div key={String(f.key)} className="field">
              <label>{f.label} {f.nullable && <span className="muted">(nullable)</span>}</label>
              <input
                type={f.type ?? 'text'}
                value={(person[f.key] as any) ?? ''}
                onChange={(e) => update({ [f.key]: e.target.value || (f.nullable ? null : '') } as Partial<Person>)}
              />
            </div>
          ))}
          <div className="field">
            <label>user_id / user_guid</label>
            <div className="row">
              <input type="number" value={person.user_id} onChange={(e) => update({ user_id: Number(e.target.value) })} style={{ width: 100 }} />
              <input value={person.user_guid} onChange={(e) => update({ user_guid: e.target.value })} style={{ flex: 1 }} />
            </div>
          </div>
        </div>

        <div>
          <h3>JSON shape (matches <code>PersonCreatedPayload</code>)</h3>
          <pre className="ast-tree">{JSON.stringify(person, null, 2)}</pre>
          <div className="muted" style={{ marginTop: 12, fontSize: 12 }}>
            When this Person is selected as a binding (e.g. <code>testator</code>, <code>spouse</code>, <code>executors.primary</code>),
            the resolver gets this object plus two synthesized fields: <code>name</code> (first + last) and
            <code> full_address</code> (one-line formatted address). Existing clauses can use either the raw fields
            (<code>{`{{spouse.first_name}}`}</code>) or the synthesized ones (<code>{`{{spouse.name}}`}</code>).
          </div>
        </div>
      </div>
    </div>
  );
}
