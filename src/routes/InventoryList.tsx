import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useInventory, saveInventoryItem, newInventoryItem, itemTypeLabel, ownershipLabel } from '../store/inventory';
import type { InventoryItemType } from '../types';

const ITEM_TYPES: InventoryItemType[] = ['real_estate', 'financial_account', 'life_insurance', 'vehicle', 'business_interest', 'other'];

export function InventoryList() {
  const items = useInventory();
  const navigate = useNavigate();

  const add = (item_type: InventoryItemType) => {
    const i = newInventoryItem(item_type);
    i.name = `New ${itemTypeLabel(item_type)}`;
    saveInventoryItem(i);
    navigate(`/inventory/${i.id}`);
  };

  const grouped = new Map<InventoryItemType, typeof items>();
  for (const t of ITEM_TYPES) grouped.set(t, []);
  for (const item of items) {
    grouped.get(item.item_type)!.push(item);
  }

  return (
    <div className="container">
      <div className="row" style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Estate Inventory</h2>
        <span className="muted">— assets referenceable by templates via <code>asset</code> / <code>asset-array</code> variables. Matches planning-svc inventory schema.</span>
        <span className="spacer" />
        <div className="row" style={{ gap: 4 }}>
          <span className="muted" style={{ fontSize: 11 }}>add:</span>
          {ITEM_TYPES.map(t => (
            <button key={t} onClick={() => add(t)} style={{ fontSize: 11, padding: '2px 8px' }}>{itemTypeLabel(t)}</button>
          ))}
        </div>
      </div>

      {ITEM_TYPES.map(item_type => {
        const list = grouped.get(item_type) ?? [];
        if (list.length === 0) return null;
        return (
          <div key={item_type} style={{ marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 8px 0' }}>{itemTypeLabel(item_type)} <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>({list.length})</span></h3>
            {list.map(i => (
              <Link key={i.id} to={`/inventory/${i.id}`} className="list-item" style={{ textDecoration: 'none', color: 'inherit', display: 'flex' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>
                    {i.name}
                    {i.is_gift && <span className="badge warn" style={{ marginLeft: 8 }}>GIFT → {i.first_gift_recipient}</span>}
                  </div>
                  <div className="meta">
                    <code>{i.id}</code> · {ownershipLabel(i.ownership_type_id)}
                    {i.item_type === 'real_estate' && i.city && i.state && ` · ${i.city}, ${i.state}`}
                    {i.item_type === 'vehicle' && (i.year || i.make) && ` · ${[i.year, i.make, i.model].filter(Boolean).join(' ')}`}
                    {i.item_type === 'financial_account' && i.institution_name && ` · ${i.institution_name}${i.account_number_last4 ? ' (•••' + i.account_number_last4 + ')' : ''}`}
                    {i.item_type === 'life_insurance' && i.insurer_name && ` · ${i.insurer_name}`}
                    {i.item_type === 'business_interest' && i.asset_sub_type_name && ` · ${i.asset_sub_type_name}`}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        );
      })}
    </div>
  );
}
