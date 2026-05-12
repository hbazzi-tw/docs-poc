import React from 'react';
import { Link } from 'react-router-dom';
import { useInventory, toBinding, getInventoryItem, itemTypeLabel } from '../store/inventory';
import type { InventoryItemBinding } from '../types';

// ---------------------------------------------------------------------------
// InventoryPicker — single asset reference in a binding.
// ---------------------------------------------------------------------------

export function InventoryPicker({
  value,
  onChange,
  filter,
}: {
  value: InventoryItemBinding | undefined;
  onChange: (val: InventoryItemBinding | undefined) => void;
  filter?: (i: InventoryItemBinding) => boolean;
}) {
  const items = useInventory();

  return (
    <div className="row" style={{ gap: 6 }}>
      <select
        value={value?.id ?? ''}
        onChange={(e) => {
          if (!e.target.value) { onChange(undefined); return; }
          const i = getInventoryItem(e.target.value);
          if (i) {
            const b = toBinding(i);
            if (!filter || filter(b)) onChange(b);
          }
        }}
        style={{ flex: 1 }}
      >
        <option value="">— select asset —</option>
        {items.map(i => (
          <option key={i.id} value={i.id}>
            [{itemTypeLabel(i.item_type)}] {i.name}{i.is_gift ? ` → gift to ${i.first_gift_recipient}` : ''}
          </option>
        ))}
      </select>
      {value && (
        <Link to={`/inventory/${value.id}`} title="Open asset record" style={{ alignSelf: 'center', fontSize: 12 }}>
          edit ↗
        </Link>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// InventoryArrayPicker — ordered list of asset references.
// ---------------------------------------------------------------------------

export function InventoryArrayPicker({
  value,
  onChange,
}: {
  value: InventoryItemBinding[];
  onChange: (val: InventoryItemBinding[]) => void;
}) {
  return (
    <div style={{ border: '1px dashed var(--line)', padding: 8, borderRadius: 4 }}>
      {value.length === 0 && <div className="muted" style={{ fontSize: 12 }}>(empty)</div>}
      {value.map((p, i) => (
        <div key={i} className="row" style={{ marginBottom: 6 }}>
          <span className="muted" style={{ width: 18, textAlign: 'right' }}>{i + 1}.</span>
          <div style={{ flex: 1 }}>
            <InventoryPicker
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
      <InventoryPicker
        value={undefined}
        onChange={(p) => p && onChange([...value, p])}
      />
    </div>
  );
}
