// ---------------------------------------------------------------------------
// People store. Person record shape matches tw-planning-svc's
// `PersonCreatedPayload` exactly. The library is the single source of truth
// for who can be referenced as a testator/spouse/executor/guardian/etc.
//
// When a Person is materialized into bindings (toBinding) we add synthesized
// `name` and `full_address` fields so existing clauses that use
// `{{spouse.name}}` keep working without forcing every clause author to
// stitch first_name + last_name by hand.
// ---------------------------------------------------------------------------

import { useEffect, useState } from 'react';
import type { Person, PersonBinding } from '../types';

const K_PEOPLE = 'tw-poc.people';
const K_SEEDED = 'tw-poc.people.seeded.v2'; // bump when SEED_PEOPLE changes

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent('tw-poc-store-change', { detail: { key } }));
}

// ---------------------------------------------------------------------------
// Seed data — the Smith family from the existing sample bindings, plus a few
// extras so the People library doesn't look thin on first open.
// ---------------------------------------------------------------------------

const SEED_PEOPLE: Person[] = [
  {
    guid: 'p-john-smith',
    user_id: 1001,
    user_guid: 'u-1001',
    first_name: 'John',
    last_name: 'Smith',
    email: 'john@example.com',
    phone_number: '+1-619-555-0101',
    address_line_one: '123 Main St',
    address_line_two: null,
    country: 'United States',
    city: 'San Diego',
    state: 'California',
    postal_code: '92101',
    relationship: 'self',
    related_to: null,
    dob: '1980-04-15',
    type: 'individual',
  },
  {
    guid: 'p-jane-smith',
    user_id: 1001,
    user_guid: 'u-1001',
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane@example.com',
    phone_number: '+1-619-555-0102',
    address_line_one: '123 Main St',
    address_line_two: null,
    country: 'United States',
    city: 'San Diego',
    state: 'California',
    postal_code: '92101',
    relationship: 'spouse',
    related_to: 'p-john-smith',
    dob: '1982-08-22',
    type: 'individual',
  },
  {
    guid: 'p-johnny-smith',
    user_id: 1001,
    user_guid: 'u-1001',
    first_name: 'Johnny',
    last_name: 'Smith',
    email: null,
    phone_number: null,
    address_line_one: '123 Main St',
    address_line_two: null,
    country: 'United States',
    city: 'San Diego',
    state: 'California',
    postal_code: '92101',
    relationship: 'child',
    related_to: 'p-john-smith',
    dob: '2015-06-12',
    type: 'individual',
  },
  {
    guid: 'p-sally-smith',
    user_id: 1001,
    user_guid: 'u-1001',
    first_name: 'Sally',
    last_name: 'Smith',
    email: null,
    phone_number: null,
    address_line_one: '123 Main St',
    address_line_two: null,
    country: 'United States',
    city: 'San Diego',
    state: 'California',
    postal_code: '92101',
    relationship: 'child',
    related_to: 'p-john-smith',
    dob: '2018-09-04',
    type: 'individual',
  },
  {
    guid: 'p-tom-smith',
    user_id: 1001,
    user_guid: 'u-1001',
    first_name: 'Tom',
    last_name: 'Smith',
    email: 'tom@example.com',
    phone_number: '+1-619-555-0103',
    address_line_one: '456 Oak Ave',
    address_line_two: null,
    country: 'United States',
    city: 'San Diego',
    state: 'California',
    postal_code: '92103',
    relationship: 'brother',
    related_to: 'p-john-smith',
    dob: '1985-02-14',
    type: 'individual',
  },
  {
    guid: 'p-margaret-cornerstone',
    user_id: 1001,
    user_guid: 'u-1001',
    first_name: 'Margaret',
    last_name: 'Cornerstone',
    email: 'margaret@example.com',
    phone_number: null,
    address_line_one: '789 Elm Blvd',
    address_line_two: 'Apt 4B',
    country: 'United States',
    city: 'Los Angeles',
    state: 'California',
    postal_code: '90001',
    relationship: 'aunt',
    related_to: 'p-john-smith',
    dob: '1955-11-03',
    type: 'individual',
  },
  {
    guid: 'p-george-moss',
    user_id: 1001,
    user_guid: 'u-1001',
    first_name: 'George',
    last_name: 'Moss',
    email: 'george@example.com',
    phone_number: null,
    address_line_one: '321 Birch Rd',
    address_line_two: null,
    country: 'United States',
    city: 'San Francisco',
    state: 'California',
    postal_code: '94102',
    relationship: 'friend',
    related_to: 'p-john-smith',
    dob: '1978-12-30',
    type: 'individual',
  },
  // Michigan-resident testator — used to exercise the defined_term flow.
  // In Michigan (a UPC state) the canonical term is "Personal Representative",
  // not "Executor", so re-generating the Will with Patricia as testator should
  // swap every "Executor" mention via the TERM_DICTIONARY lookup.
  {
    guid: 'p-patricia-miller',
    user_id: 2001,
    user_guid: 'u-2001',
    first_name: 'Patricia',
    last_name: 'Miller',
    email: 'patricia@example.com',
    phone_number: '+1-313-555-0188',
    address_line_one: '1421 Lakeshore Dr',
    address_line_two: null,
    country: 'United States',
    city: 'Ann Arbor',
    state: 'Michigan',
    postal_code: '48104',
    relationship: 'self',
    related_to: null,
    dob: '1972-03-09',
    type: 'individual',
  },
  {
    guid: 'p-david-miller',
    user_id: 2001,
    user_guid: 'u-2001',
    first_name: 'David',
    last_name: 'Miller',
    email: 'david@example.com',
    phone_number: '+1-313-555-0189',
    address_line_one: '1421 Lakeshore Dr',
    address_line_two: null,
    country: 'United States',
    city: 'Ann Arbor',
    state: 'Michigan',
    postal_code: '48104',
    relationship: 'spouse',
    related_to: 'p-patricia-miller',
    dob: '1970-11-22',
    type: 'individual',
  },
  {
    guid: 'p-bill-cornerstone',
    user_id: 1001,
    user_guid: 'u-1001',
    first_name: 'Bill',
    last_name: 'Cornerstone',
    email: 'bill@example.com',
    phone_number: null,
    address_line_one: '789 Elm Blvd',
    address_line_two: 'Apt 4B',
    country: 'United States',
    city: 'Los Angeles',
    state: 'California',
    postal_code: '90001',
    relationship: 'uncle',
    related_to: 'p-john-smith',
    dob: '1953-07-19',
    type: 'individual',
  },
];

function ensureSeeded() {
  if (localStorage.getItem(K_SEEDED) === '1') return;
  write(K_PEOPLE, SEED_PEOPLE);
  localStorage.setItem(K_SEEDED, '1');
}

export function getPeople(): Person[] {
  ensureSeeded();
  return read<Person[]>(K_PEOPLE, []);
}

export function getPerson(guid: string): Person | undefined {
  return getPeople().find(p => p.guid === guid);
}

export function savePerson(person: Person) {
  const all = getPeople();
  const idx = all.findIndex(p => p.guid === person.guid);
  if (idx >= 0) all[idx] = person;
  else all.push(person);
  write(K_PEOPLE, all);
}

export function deletePerson(guid: string) {
  write(K_PEOPLE, getPeople().filter(p => p.guid !== guid));
}

export function resetPeople() {
  localStorage.removeItem(K_PEOPLE);
  localStorage.removeItem(K_SEEDED);
  ensureSeeded();
}

// ---------------------------------------------------------------------------
// Binding materialization
// ---------------------------------------------------------------------------

export function toBinding(person: Person): PersonBinding {
  return {
    ...person,
    name: `${person.first_name ?? ''} ${person.last_name ?? ''}`.trim(),
    full_address: formatAddress(person),
  };
}

export function newPerson(): Person {
  return {
    guid: `p-${Math.random().toString(36).slice(2, 10)}`,
    user_id: 1001,
    user_guid: 'u-1001',
    first_name: '',
    last_name: '',
    email: null,
    phone_number: null,
    address_line_one: null,
    address_line_two: null,
    country: null,
    city: null,
    state: null,
    postal_code: null,
    relationship: null,
    related_to: null,
    dob: null,
    type: 'individual',
  };
}

function formatAddress(p: Person): string {
  const parts: string[] = [];
  if (p.address_line_one) parts.push(p.address_line_one);
  if (p.address_line_two) parts.push(p.address_line_two);
  const cityState = [p.city, p.state].filter(Boolean).join(', ');
  if (cityState) parts.push(cityState);
  if (p.postal_code) parts.push(p.postal_code);
  return parts.join(', ');
}

// ---------------------------------------------------------------------------
// React hook
// ---------------------------------------------------------------------------

export function usePeople() {
  const [people, setPeople] = useState<Person[]>(() => getPeople());
  useEffect(() => {
    const onChange = () => setPeople(getPeople());
    window.addEventListener('tw-poc-store-change', onChange);
    return () => window.removeEventListener('tw-poc-store-change', onChange);
  }, []);
  return people;
}
