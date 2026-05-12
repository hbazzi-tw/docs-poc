// ---------------------------------------------------------------------------
// LocalStorage-backed store for templates + clauses. POC-grade: synchronous
// reads, JSON serialization, no migration story. The shape mirrors the
// eventual server model so swapping the backend is mechanical.
// ---------------------------------------------------------------------------

import { useEffect, useState } from 'react';
import type { Template, Clause } from '../types';
import { SEED_TEMPLATES, SEED_CLAUSES } from './seed';

const K_TEMPLATES = 'tw-poc.templates';
const K_CLAUSES = 'tw-poc.clauses';
// Bump this key whenever new templates/clauses get added to the seed so
// existing localStorage caches automatically pick them up.
const K_SEEDED = 'tw-poc.seeded.v11';

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

function ensureSeeded() {
  if (localStorage.getItem(K_SEEDED) === '1') return;
  write(K_TEMPLATES, SEED_TEMPLATES);
  write(K_CLAUSES, SEED_CLAUSES);
  localStorage.setItem(K_SEEDED, '1');
}

export function getTemplates(): Template[] {
  ensureSeeded();
  return read<Template[]>(K_TEMPLATES, []);
}

export function getTemplate(id: string): Template | undefined {
  return getTemplates().find(t => t.id === id);
}

export function saveTemplate(tpl: Template) {
  const all = getTemplates();
  const idx = all.findIndex(t => t.id === tpl.id);
  const updated = { ...tpl, updatedAt: new Date().toISOString() };
  if (idx >= 0) all[idx] = updated;
  else all.push(updated);
  write(K_TEMPLATES, all);
}

export function deleteTemplate(id: string) {
  write(K_TEMPLATES, getTemplates().filter(t => t.id !== id));
}

export function getClauses(): Clause[] {
  ensureSeeded();
  return read<Clause[]>(K_CLAUSES, []);
}

export function getClause(id: string, version?: string): Clause | undefined {
  const clauses = getClauses().filter(c => c.id === id);
  if (clauses.length === 0) return undefined;
  if (!version || version === 'latest') {
    // `latest` means latest PUBLISHED — drafts are explicitly ignored so a
    // half-finished fork doesn't quietly take over document generation.
    // Returns undefined if no published version exists yet; the resolver
    // surfaces that as a "Missing clause" warning, which is the right
    // signal (referencing `latest` of a never-published clause is broken).
    return clauses
      .filter(c => c.status === 'published')
      .sort((a, b) => b.version.localeCompare(a.version))[0];
  }
  return clauses.find(c => c.version === version);
}

// saveClause enforces the published-is-frozen rule at the store level too,
// not just in the editor UI — keeps the invariant if anyone calls
// saveClause from a different code path (e.g. a future API/sync path).
// The one exception: flipping status from draft → published itself, which
// publishes the previously-draft version and freezes it going forward.
export function saveClause(cl: Clause) {
  const all = getClauses();
  const idx = all.findIndex(c => c.id === cl.id && c.version === cl.version);
  if (idx >= 0) {
    const existing = all[idx];
    if (existing.status === 'published') {
      // Block all mutations to a published version. The only allowed
      // change is no change — bail out silently rather than throwing so
      // an unintended call doesn't break the editor flow.
      console.warn(`[clauses] refused to mutate published clause ${cl.id}@${cl.version}`);
      return;
    }
  }
  const updated = { ...cl, updatedAt: new Date().toISOString() };
  if (idx >= 0) all[idx] = updated;
  else all.push(updated);
  write(K_CLAUSES, all);
}

export function deleteClause(id: string, version: string) {
  write(K_CLAUSES, getClauses().filter(c => !(c.id === id && c.version === version)));
}

export function resetStore() {
  localStorage.removeItem(K_TEMPLATES);
  localStorage.removeItem(K_CLAUSES);
  localStorage.removeItem(K_SEEDED);
  ensureSeeded();
}

// ---------------------------------------------------------------------------
// React hooks
// ---------------------------------------------------------------------------

export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>(() => getTemplates());
  useEffect(() => {
    const onChange = () => setTemplates(getTemplates());
    window.addEventListener('tw-poc-store-change', onChange);
    return () => window.removeEventListener('tw-poc-store-change', onChange);
  }, []);
  return templates;
}

export function useClauses() {
  const [clauses, setClauses] = useState<Clause[]>(() => getClauses());
  useEffect(() => {
    const onChange = () => setClauses(getClauses());
    window.addEventListener('tw-poc-store-change', onChange);
    return () => window.removeEventListener('tw-poc-store-change', onChange);
  }, []);
  return clauses;
}
