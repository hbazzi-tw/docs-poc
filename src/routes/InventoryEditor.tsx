import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getInventoryItem, saveInventoryItem, deleteInventoryItem, itemTypeLabel, ownershipLabel } from '../store/inventory';
import type { EstateInventoryItem, InventoryItemType } from '../types';

const ITEM_TYPES: InventoryItemType[] = ['real_estate', 'financial_account', 'life_insurance', 'vehicle', 'business_interest', 'other'];

// Fields that show for each item_type. Keep the order consistent for editor UX.
const FIELDS_BY_TYPE: Record<InventoryItemType, (keyof EstateInventoryItem)[]> = {
  real_estate: ['name', 'description', 'address_line_one', 'address_line_two', 'city', 'state', 'zipcode', 'country'],
  vehicle: ['name', 'year', 'make', 'model', 'vin'],
  financial_account: ['name', 'nickname', 'institution_name', 'account_type_display', 'account_number_last4'],
  life_insurance: ['name', 'insurer_name', 'policy_number', 'policy_type_display', 'beneficiary_name'],
  business_interest: ['name', 'asset_sub_type_name', 'state_of_formation', 'value_of_ownership', 'description'],
  other: ['name', 'description'],
};

const NUMERIC_KEYS = new Set<keyof EstateInventoryItem>(['year']);

export function InventoryEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const initial = useMemo(() => (id ? getInventoryItem(id) : undefined), [id]);
  const [item, setItem] = useState<EstateInventoryItem | undefined>(initial);

  if (!item) return <div className="container"><p>Inventory item not found. <Link to="/inventory">Back</Link></p></div>;

  const update = (patch: Partial<EstateInventoryItem>) => {
    const next = { ...item, ...patch };
    setItem(next);
    saveInventoryItem(next);
  };

  const removeMe = () => {
    if (!confirm(`Delete inventory item "${item.name}"?`)) return;
    deleteInventoryItem(item.id);
    navigate('/inventory');
  };

  const fields = FIELDS_BY_TYPE[item.item_type] ?? FIELDS_BY_TYPE.other;

  return (
    <div className="container">
      <div className="row" style={{ marginBottom: 16 }}>
        <Link to="/inventory"><button className="ghost">← inventory</button></Link>
        <h2 style={{ margin: 0 }}>{item.name || '(unnamed)'}</h2>
        <span className="badge">{itemTypeLabel(item.item_type)}</span>
        {item.is_gift && <span className="badge warn">GIFT</span>}
        <span className="muted"><code>{item.id}</code></span>
        <span className="spacer" />
        <button className="danger ghost" onClick={removeMe}>Delete</button>
      </div>

      <div className="grid-2">
        <div>
          <div className="card">
            <div className="field">
              <label>Item type</label>
              <select value={item.item_type} onChange={(e) => update({ item_type: e.target.value as InventoryItemType })}>
                {ITEM_TYPES.map(t => <option key={t} value={t}>{itemTypeLabel(t)}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Ownership</label>
              <select value={item.ownership_type_id} onChange={(e) => update({ ownership_type_id: Number(e.target.value) })}>
                <option value={1}>1 — Testator only</option>
                <option value={2}>2 — Testator and Spouse jointly</option>
                <option value={3}>3 — Testator and someone else</option>
                <option value={4}>4 — Spouse only</option>
                <option value={5}>5 — Spouse and someone else</option>
                <option value={99}>99 — Trust</option>
              </select>
              <div className="muted" style={{ fontSize: 11 }}>{ownershipLabel(item.ownership_type_id)}</div>
            </div>

            <h3 style={{ marginTop: 16 }}>{itemTypeLabel(item.item_type)} fields</h3>
            {fields.map(key => {
              const val = (item as any)[key];
              const isNum = NUMERIC_KEYS.has(key);
              return (
                <div key={String(key)} className="field">
                  <label>{String(key).replace(/_/g, ' ')}</label>
                  {key === 'description' ? (
                    <textarea
                      rows={3}
                      value={(val as string | null) ?? ''}
                      onChange={(e) => update({ [key]: e.target.value || null } as any)}
                    />
                  ) : (
                    <input
                      type={isNum ? 'number' : 'text'}
                      value={val ?? ''}
                      onChange={(e) => {
                        const v: any = e.target.value;
                        update({ [key]: isNum ? (v === '' ? null : Number(v)) : (v || null) } as any);
                      }}
                    />
                  )}
                </div>
              );
            })}

            <h3 style={{ marginTop: 16 }}>Gift state</h3>
            <div className="field">
              <label>
                <input type="checkbox" checked={item.is_gift} onChange={(e) => update({ is_gift: e.target.checked })} />
                {' '}Is a specific gift in the Will
              </label>
            </div>
            {item.is_gift && (
              <>
                <div className="field">
                  <label>gift_from</label>
                  <select value={item.gift_from ?? ''} onChange={(e) => update({ gift_from: e.target.value === '' ? null : Number(e.target.value) })}>
                    <option value="">(unset)</option>
                    <option value={1}>1 — From testator</option>
                    <option value={2}>2 — From spouse</option>
                    <option value={3}>3 — From both (joint gift)</option>
                  </select>
                </div>
                <div className="field">
                  <label>first_gift_recipient</label>
                  <input value={item.first_gift_recipient ?? ''} onChange={(e) => update({ first_gift_recipient: e.target.value || null })} />
                </div>
                <div className="field">
                  <label>second_gift_recipient (optional)</label>
                  <input value={item.second_gift_recipient ?? ''} onChange={(e) => update({ second_gift_recipient: e.target.value || null })} />
                </div>
              </>
            )}
          </div>
        </div>

        <div>
          <h3>JSON shape</h3>
          <pre className="ast-tree">{JSON.stringify(item, null, 2)}</pre>
          <div className="muted" style={{ marginTop: 12, fontSize: 12 }}>
            Mirrors planning-svc's EstateInventoryItem schema. When materialized into bindings via
            <code> toBinding()</code>, the resolver also gets a derived <code>gift_display</code> field
            (matches the legacy <code>assetsGift*</code> branches in <code>tw-pdf-svc/Will/pageOne.js</code> lines 779–839)
            and an <code>ownership_display</code> field for Schedule-of-Assets-style narrative.
          </div>
        </div>
      </div>
    </div>
  );
}
