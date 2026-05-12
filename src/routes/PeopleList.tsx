import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePeople, savePerson, newPerson } from '../store/people';

export function PeopleList() {
  const people = usePeople();
  const navigate = useNavigate();

  const add = () => {
    const p = newPerson();
    p.first_name = 'New';
    p.last_name = 'Person';
    savePerson(p);
    navigate(`/people/${p.guid}`);
  };

  return (
    <div className="container">
      <div className="row" style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>People</h2>
        <span className="muted">— Person records that can be referenced from any template variable (matches <code>PersonCreatedPayload</code> from tw-planning-svc)</span>
        <span className="spacer" />
        <button onClick={add} className="primary">+ new person</button>
      </div>
      {people.length === 0 && <div className="empty-state">No people yet.</div>}
      {people.map(p => (
        <Link key={p.guid} to={`/people/${p.guid}`} className="list-item" style={{ textDecoration: 'none', color: 'inherit', display: 'flex' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>{p.first_name} {p.last_name}</div>
            <div className="meta">
              <code>{p.guid}</code>
              {p.relationship && ` · ${p.relationship}`}
              {p.dob && ` · b. ${p.dob}`}
              {p.email && ` · ${p.email}`}
            </div>
            {(p.address_line_one || p.city) && (
              <div className="meta" style={{ marginTop: 4 }}>
                {[p.address_line_one, p.address_line_two, p.city, p.state, p.postal_code].filter(Boolean).join(', ')}
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
