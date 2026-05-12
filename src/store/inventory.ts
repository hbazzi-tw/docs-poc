// ---------------------------------------------------------------------------
// Estate inventory store. Item shape matches planning-svc's inventory schema
// (real_estate, financial_account, life_insurance, vehicle, business_interest,
// other) so the POC can demonstrate end-to-end binding-to-clause flow with
// realistic data.
//
// `toBinding()` adds two synthesized fields:
//   - gift_display     — preformatted narrative string matching the legacy
//                        asset-gift branches in tw-pdf-svc Will/pageOne.js
//                        (lines 779-839)
//   - ownership_display — preformatted ownership string ("the property of X")
//                         matching tw-pdf-svc ScheduleOfAssets subsections
// ---------------------------------------------------------------------------

import { useEffect, useState } from 'react';
import type { EstateInventoryItem, InventoryItemBinding, InventoryItemType } from '../types';

const K_INVENTORY = 'tw-poc.inventory';
const K_SEEDED = 'tw-poc.inventory.seeded.v1';

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

const baseItem = (): EstateInventoryItem => ({
  id: `inv-${Math.random().toString(36).slice(2, 10)}`,
  user_id: 1001,
  user_guid: 'u-1001',
  item_type: 'other',
  name: '',
  description: null,
  ownership_type_id: 1,
  estate_inventory_item_type_id: 1,
  is_gift: false,
  gift_from: null,
  first_gift_recipient: null,
  second_gift_recipient: null,
  address_line_one: null,
  address_line_two: null,
  city: null,
  state: null,
  country: null,
  zipcode: null,
  year: null,
  make: null,
  model: null,
  vin: null,
  institution_name: null,
  nickname: null,
  account_type_display: null,
  account_number_last4: null,
  insurer_name: null,
  policy_number: null,
  policy_type_display: null,
  beneficiary_name: null,
  asset_sub_type_name: null,
  state_of_formation: null,
  value_of_ownership: null,
});

// ---------------------------------------------------------------------------
// Seed: John Smith's inventory. Mix of owner-only, joint, and one gift.
// ---------------------------------------------------------------------------

const SEED_INVENTORY: EstateInventoryItem[] = [
  {
    ...baseItem(),
    id: 'inv-primary-residence',
    item_type: 'real_estate',
    estate_inventory_item_type_id: 1,
    name: 'Primary Residence',
    ownership_type_id: 2, // joint with spouse
    address_line_one: '123 Main St',
    city: 'San Diego',
    state: 'California',
    country: 'United States',
    zipcode: '92101',
  },
  {
    ...baseItem(),
    id: 'inv-summer-cabin',
    item_type: 'real_estate',
    estate_inventory_item_type_id: 1,
    name: 'Lake Tahoe Cabin',
    description: 'Family vacation home',
    ownership_type_id: 1, // testator only
    is_gift: true,
    gift_from: 1,
    first_gift_recipient: 'Tom Smith',
    address_line_one: '789 Pine Trail',
    city: 'South Lake Tahoe',
    state: 'California',
    country: 'United States',
    zipcode: '96150',
  },
  {
    ...baseItem(),
    id: 'inv-tesla-y',
    item_type: 'vehicle',
    estate_inventory_item_type_id: 1,
    name: '2022 Tesla Model Y',
    ownership_type_id: 2,
    is_gift: true,
    gift_from: 1,
    first_gift_recipient: 'Sally Smith',
    year: 2022,
    make: 'Tesla',
    model: 'Model Y',
    vin: '5YJ3E1EA4NF000001',
  },
  {
    ...baseItem(),
    id: 'inv-honda-accord',
    item_type: 'vehicle',
    estate_inventory_item_type_id: 1,
    name: '2018 Honda Accord',
    ownership_type_id: 1,
    year: 2018,
    make: 'Honda',
    model: 'Accord',
    vin: '1HGCV1F30JA000001',
  },
  {
    ...baseItem(),
    id: 'inv-wells-checking',
    item_type: 'financial_account',
    estate_inventory_item_type_id: 1,
    name: 'Wells Fargo Checking',
    ownership_type_id: 2,
    institution_name: 'Wells Fargo Bank',
    nickname: 'Main Checking',
    account_type_display: 'Checking',
    account_number_last4: '4892',
  },
  {
    ...baseItem(),
    id: 'inv-fidelity-brokerage',
    item_type: 'financial_account',
    estate_inventory_item_type_id: 1,
    name: 'Fidelity Brokerage Account',
    ownership_type_id: 1,
    institution_name: 'Fidelity Investments',
    nickname: 'Long-term Investments',
    account_type_display: 'Brokerage',
    account_number_last4: '1027',
  },
  {
    ...baseItem(),
    id: 'inv-vanguard-ira',
    item_type: 'financial_account',
    estate_inventory_item_type_id: 1,
    name: 'Vanguard Traditional IRA',
    ownership_type_id: 1,
    institution_name: 'Vanguard',
    nickname: null,
    account_type_display: 'IRA',
    account_number_last4: '5511',
  },
  {
    ...baseItem(),
    id: 'inv-nylife-policy',
    item_type: 'life_insurance',
    estate_inventory_item_type_id: 1,
    name: 'New York Life Whole Life Policy',
    ownership_type_id: 1,
    insurer_name: 'New York Life Insurance Company',
    policy_number: 'NYL-2018-0042-1019',
    policy_type_display: 'Whole Life',
    beneficiary_name: 'Jane Smith',
  },
  {
    ...baseItem(),
    id: 'inv-term-policy',
    item_type: 'life_insurance',
    estate_inventory_item_type_id: 1,
    name: 'Pacific Life Term Policy',
    ownership_type_id: 1,
    insurer_name: 'Pacific Life',
    policy_number: 'PAC-T-2020-880411',
    policy_type_display: '20-Year Term',
    beneficiary_name: 'Jane Smith',
  },
  {
    ...baseItem(),
    id: 'inv-smith-consulting',
    item_type: 'business_interest',
    estate_inventory_item_type_id: 2,
    name: 'Smith Consulting Group',
    ownership_type_id: 1,
    asset_sub_type_name: 'LLC',
    state_of_formation: 'Delaware',
    value_of_ownership: '60% membership interest',
  },
  {
    ...baseItem(),
    id: 'inv-art-collection',
    item_type: 'other',
    estate_inventory_item_type_id: 1,
    name: 'Art Collection',
    description: 'Various 20th-century paintings and prints, currently displayed at primary residence',
    ownership_type_id: 1,
    is_gift: true,
    gift_from: 1,
    first_gift_recipient: 'Margaret Cornerstone',
  },
];

function ensureSeeded() {
  if (localStorage.getItem(K_SEEDED) === '1') return;
  write(K_INVENTORY, SEED_INVENTORY);
  localStorage.setItem(K_SEEDED, '1');
}

export function getInventory(): EstateInventoryItem[] {
  ensureSeeded();
  return read<EstateInventoryItem[]>(K_INVENTORY, []);
}

export function getInventoryItem(id: string): EstateInventoryItem | undefined {
  return getInventory().find(i => i.id === id);
}

export function saveInventoryItem(item: EstateInventoryItem) {
  const all = getInventory();
  const idx = all.findIndex(i => i.id === item.id);
  if (idx >= 0) all[idx] = item;
  else all.push(item);
  write(K_INVENTORY, all);
}

export function deleteInventoryItem(id: string) {
  write(K_INVENTORY, getInventory().filter(i => i.id !== id));
}

export function resetInventory() {
  localStorage.removeItem(K_INVENTORY);
  localStorage.removeItem(K_SEEDED);
  ensureSeeded();
}

export function newInventoryItem(item_type: InventoryItemType = 'other'): EstateInventoryItem {
  return { ...baseItem(), item_type };
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

const ITEM_TYPE_LABEL: Record<InventoryItemType, string> = {
  real_estate: 'Real Estate',
  financial_account: 'Financial Account',
  life_insurance: 'Life Insurance',
  vehicle: 'Vehicle',
  business_interest: 'Business Interest',
  other: 'Other',
};
export const itemTypeLabel = (t: InventoryItemType) => ITEM_TYPE_LABEL[t];

const OWNERSHIP_LABEL: Record<number, string> = {
  1: 'Testator only',
  2: 'Testator and Spouse jointly',
  3: 'Testator and someone else',
  4: 'Spouse only',
  5: 'Spouse and someone else',
  99: 'Trust',
};
export const ownershipLabel = (id: number) => OWNERSHIP_LABEL[id] ?? `Unknown (${id})`;

// ---------------------------------------------------------------------------
// Binding materialization. Matches tw-pdf-svc Will/pageOne.js lines 779-839
// for the gift_display string and ScheduleOfAssets subsections for the
// ownership_display string.
// ---------------------------------------------------------------------------

function formatAddress(p: EstateInventoryItem): string {
  const parts: string[] = [];
  if (p.address_line_one) parts.push(p.address_line_one);
  if (p.address_line_two) parts.push(p.address_line_two);
  const cityState = [p.city, p.state].filter(Boolean).join(', ');
  if (cityState) parts.push(cityState);
  if (p.zipcode) parts.push(p.zipcode);
  return parts.join(', ');
}

function buildGiftDisplay(i: EstateInventoryItem): string {
  if (!i.is_gift) return '';
  const recipients = [i.first_gift_recipient, i.second_gift_recipient].filter(Boolean).join(' and ');
  if (!recipients) return '';

  switch (i.item_type) {
    case 'real_estate':
      return `To ${recipients}, I give the real property commonly known as ${formatAddress(i)}.`;
    case 'vehicle': {
      const vehicleStr = [i.year, i.make, i.model].filter(Boolean).join(' ').trim();
      return `To ${recipients}, I give the ${vehicleStr}.`;
    }
    case 'business_interest': {
      let s = `To ${recipients}, I give my interest in ${i.name}`;
      if (i.asset_sub_type_name && i.state_of_formation) {
        s += `, the ${i.asset_sub_type_name} formed in ${i.state_of_formation}`;
      }
      if (i.value_of_ownership) s += `, with interest type: ${i.value_of_ownership}`;
      return s + '.';
    }
    case 'other':
      return i.description
        ? `To ${recipients}, I give the ${i.name}, further described as ${i.description}.`
        : `To ${recipients}, I give the ${i.name}.`;
    case 'financial_account':
      return `To ${recipients}, I give the ${i.account_type_display ?? 'account'} held at ${i.institution_name ?? 'the institution named'}${i.account_number_last4 ? ` (account ending in ${i.account_number_last4})` : ''}.`;
    case 'life_insurance':
      return `To ${recipients}, I give my interest in the life insurance policy held with ${i.insurer_name ?? 'the insurer named'}${i.policy_number ? ` (policy ${i.policy_number})` : ''}.`;
  }
}

function buildOwnershipDisplay(i: EstateInventoryItem): string {
  return ownershipLabel(i.ownership_type_id);
}

export function toBinding(item: EstateInventoryItem): InventoryItemBinding {
  return {
    ...item,
    gift_display: buildGiftDisplay(item),
    ownership_display: buildOwnershipDisplay(item),
    soa_display: buildSoaDisplay(item),
    soa_secondary: buildSoaSecondary(item),
  };
}

// Pre-formatted Schedule-of-Assets primary line. Matches the strings produced
// by tw-pdf-svc/ScheduleOfAssets/sections/exhibitA/subsec*.
function buildSoaDisplay(i: EstateInventoryItem): string {
  switch (i.item_type) {
    case 'real_estate':
      return `The real property commonly known as ${formatAddress(i)}.`;
    case 'vehicle': {
      const vehicleStr = [i.year, i.make, i.model].filter(Boolean).join(' ').trim();
      return `The ${vehicleStr}.`;
    }
    case 'business_interest': {
      let s = `The interest in ${i.name}`;
      if (i.asset_sub_type_name && i.state_of_formation) {
        s += `, the ${i.asset_sub_type_name} formed in ${i.state_of_formation}`;
      }
      if (i.value_of_ownership) s += `, with the following descriptive information: ${i.value_of_ownership}`;
      return s + '.';
    }
    case 'financial_account': {
      const prefix = i.nickname ? `${i.nickname} - ` : '';
      return `${prefix}${i.name}`;
    }
    case 'life_insurance':
      return i.name;
    case 'other':
      return i.description
        ? `The ${i.name} with the following descriptive information: ${i.description}.`
        : `The ${i.name}.`;
  }
}

// Optional secondary line — only used by financial_account / life_insurance
// which display a type label beneath the name in the real PDF.
function buildSoaSecondary(i: EstateInventoryItem): string {
  if (i.item_type === 'financial_account') return i.account_type_display ?? '';
  if (i.item_type === 'life_insurance') return i.policy_type_display ?? '';
  return '';
}

// ---------------------------------------------------------------------------
// React hook
// ---------------------------------------------------------------------------

export function useInventory() {
  const [items, setItems] = useState<EstateInventoryItem[]>(() => getInventory());
  useEffect(() => {
    const onChange = () => setItems(getInventory());
    window.addEventListener('tw-poc-store-change', onChange);
    return () => window.removeEventListener('tw-poc-store-change', onChange);
  }, []);
  return items;
}
