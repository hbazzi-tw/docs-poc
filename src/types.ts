// ---------------------------------------------------------------------------
// PM-JSON-shaped AST node types. Mirrors the design in RFC-001 §3.1:
//   - One canonical shape, used at authoring time and post-resolution
//   - `ResolvedPMDoc` is a TypeScript branded type; structurally same shape
//   - Custom node types: variable_ref, clause_ref, conditional, for_each,
//     signature_block. Standard PM nodes: doc, paragraph, heading, text,
//     bulletList, orderedList, listItem.
// ---------------------------------------------------------------------------

export type PMTextNode = {
  type: 'text';
  text: string;
  marks?: PMMark[];
};

export type PMMark =
  | { type: 'bold' }
  | { type: 'italic' }
  | { type: 'underline' };

export type PMVariableRef = {
  type: 'variable_ref';
  attrs: {
    path: string;          // e.g. "testator.name"
    fallback?: string;     // text shown if path is empty/missing
    transform?: 'upper' | 'lower' | 'title' | null;
  };
};

// Inline jurisdiction-aware vocabulary swap. The resolver checks
// TERM_DICTIONARY[testator.state-abbreviation][term]; if found, emits that
// string. Otherwise falls back to `content` (any inline nodes — typically a
// single text node with the canonical default like "Executor").
//
// Promoted from RFC §3.1's "deferred to v2" list because Michigan (and the
// other ~18 UPC states) require "Personal Representative" instead of
// "Executor" — without `defined_term` the prose has to be forked per state,
// which defeats the whole composition story.
export type PMDefinedTerm = {
  type: 'defined_term';
  attrs: {
    term: string;            // dictionary key, e.g. 'executor', 'executors'
    defaultText: string;     // fallback rendered when no dictionary hit
  };
};

export type PMClauseRef = {
  type: 'clause_ref';
  attrs: {
    clauseId: string;
    version: string | 'latest';
    pinned: boolean;
  };
};

export type PMConditional = {
  type: 'conditional';
  attrs: {
    condition: string;     // e.g. "children.length > 0"
    label?: string;        // optional human-readable hint shown in editor
  };
  content?: PMNode[];      // the 'then' branch in this simple POC
};

export type PMForEach = {
  type: 'for_each';
  attrs: {
    over: string;          // e.g. "executors.backups"
    as: string;            // e.g. "executor"
    mode?: 'block' | 'inline';
  };
  content?: PMNode[];
};

// Signature blocks dispatch on `kind`. Each kind is a well-known layout
// modeled after the real Trust & Will finalized PDFs:
//   - will-testator-witnesses        (Your Signature, Please + Witnesses)
//   - will-self-proving-affidavit    (State/County + 3-party notary affidavit)
//   - hcd-testator                   (HCD: Signature header + testator attest)
//   - hcd-witnesses                  (HCD: 8-item disqualification + witness blocks)
//   - hipaa-testator                 (HIPAA: short attest + signature/date only)
//   - poa-testator                   (POA: signature, date, printed name, address, phone)
//   - poa-notary                     (POA: full statutory-form notary block)
// `simple` is the back-compat option used by older signature_block instances.
export type PMSignatureBlock = {
  type: 'signature_block';
  attrs: {
    kind:
      | 'will-testator-witnesses'
      | 'will-self-proving-affidavit'
      | 'hcd-testator'
      | 'hcd-witnesses'
      | 'hipaa-testator'
      | 'poa-testator'
      | 'poa-notary'
      | 'simple';
    state?: string;                // for notary blocks; usually drawn from testator.state
    witnesses?: number;             // legacy / `simple` kind
    notaryRequired?: boolean;       // legacy / `simple` kind
    attestation?: string | null;    // legacy / `simple` kind
  };
};

export type PMHeading = {
  type: 'heading';
  attrs: { level: 1 | 2 | 3 };
  content?: PMInlineNode[];
};

export type PMParagraph = {
  type: 'paragraph';
  content?: PMInlineNode[];
};

export type PMBulletList = {
  type: 'bulletList';
  content?: PMListItem[];
};

export type PMOrderedList = {
  type: 'orderedList';
  content?: PMListItem[];
};

export type PMListItem = {
  type: 'listItem';
  content?: PMBlockNode[];
};

export type PMDoc = {
  type: 'doc';
  content?: PMBlockNode[];
};

export type PMInlineNode = PMTextNode | PMVariableRef | PMDefinedTerm;
export type PMBlockNode =
  | PMParagraph
  | PMHeading
  | PMBulletList
  | PMOrderedList
  | PMConditional
  | PMForEach
  | PMClauseRef
  | PMSignatureBlock;
export type PMNode = PMInlineNode | PMBlockNode | PMListItem | PMDoc;

// Branded type for an AST whose unresolved nodes (variable_ref, conditional,
// for_each, clause_ref) have all been expanded.
export type ResolvedPMDoc = PMDoc & { readonly __brand: 'resolved' };

// ---------------------------------------------------------------------------
// Domain entities
// ---------------------------------------------------------------------------

export type SemVer = string;       // "1.0.0", "1.2.3-draft.4"
export type TemplateStatus = 'draft' | 'published';
export type ClauseStatus = 'draft' | 'published';

export type VariableType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'enum'
  | 'object'
  | 'array'
  | 'person'
  | 'person-array'
  | 'asset'
  | 'asset-array';

export type VariableDef = {
  name: string;              // kebab-case ID
  displayName: string;
  description?: string;
  type: VariableType;
  path: string;              // dot-path into the bindings root
  required?: boolean;
  enumValues?: string[];
  example?: unknown;
  itemSchema?: VariableDef[]; // when type==='array' or 'object'
};

export type Template = {
  id: string;
  name: string;
  instrumentType: 'will' | 'trust' | 'poa' | 'healthcare-directive';
  jurisdiction?: string;
  version: SemVer;
  status: TemplateStatus;
  ast: PMDoc;
  variables: VariableDef[];
  purpose?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type Clause = {
  id: string;                 // stable kebab-case id, e.g. "witness-attest-ca"
  name: string;
  version: SemVer;
  status: ClauseStatus;
  ast: PMDoc;                 // fragment wrapped in a doc node for simplicity
  jurisdiction?: string;
  applicableTo?: string[];    // instrument types
  tags?: string[];
  purpose?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

// ---------------------------------------------------------------------------
// Person — mirrors tw-planning-svc's PersonCreatedPayload exactly. Whenever
// a Person is selected as a binding, the resolver also gets a synthesized
// `name` field (`${first_name} ${last_name}`) so legacy clause text like
// `{{spouse.name}}` keeps working without breaking the canonical shape.
// ---------------------------------------------------------------------------
export interface Person {
  guid: string;
  user_id: number;
  user_guid: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone_number: string | null;
  address_line_one: string | null;
  address_line_two: string | null;
  country: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  relationship: string | null;
  related_to: string | null;
  dob: string | null;
  type: string;
}

// A Person enriched with the synthesized `name` and `full_address` fields used
// by the resolver. Templates always see this shape, never the raw payload.
export type PersonBinding = Person & {
  name: string;            // first_name + ' ' + last_name
  full_address: string;    // formatted single-line address (best-effort)
};

// ---------------------------------------------------------------------------
// EstateInventoryItem — matches the planning-svc inventory schema.
// Discriminated by `item_type`. Common fields cover ownership + gift state;
// type-specific fields cover the parts of `pageOne.js`'s asset-gift branching
// and the Schedule-of-Assets subsections.
//
// ownership_type_id mapping (mirrors planning-svc OwnershipType enum):
//   1 = User only
//   2 = User and Spouse jointly
//   3 = User and Someone Else
//   4 = Spouse only
//   5 = Spouse and Someone Else
//   99 = Trust
//
// gift_from mapping:
//   1 = User
//   2 = Spouse
//   3 = Both (joint gift)
// ---------------------------------------------------------------------------
export type InventoryItemType =
  | 'real_estate'
  | 'financial_account'
  | 'life_insurance'
  | 'vehicle'
  | 'business_interest'
  | 'other';

export interface EstateInventoryItem {
  id: string;
  user_id: number;
  user_guid: string;
  item_type: InventoryItemType;
  name: string;                       // display name / shortname
  description: string | null;         // free-form description (used for "other")
  ownership_type_id: number;          // 1|2|3|4|5|99
  estate_inventory_item_type_id: number; // legacy type discriminator: 1=other, 2=business, etc.

  // ---------- Gift state (drives Specific Gifts in the Will body) ----------
  is_gift: boolean;
  gift_from: number | null;           // 1|2|3
  first_gift_recipient: string | null;
  second_gift_recipient: string | null;

  // ---------- Real estate ----------
  address_line_one: string | null;
  address_line_two: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zipcode: string | null;

  // ---------- Vehicle ----------
  year: number | null;
  make: string | null;
  model: string | null;
  vin: string | null;

  // ---------- Financial account ----------
  institution_name: string | null;
  nickname: string | null;
  account_type_display: string | null; // e.g. "Checking", "Brokerage", "IRA"
  account_number_last4: string | null;

  // ---------- Life insurance ----------
  insurer_name: string | null;
  policy_number: string | null;
  policy_type_display: string | null;  // e.g. "Term", "Whole Life"
  beneficiary_name: string | null;

  // ---------- Business interest ----------
  asset_sub_type_name: string | null;  // e.g. "LLC", "Corporation", "Partnership"
  state_of_formation: string | null;
  value_of_ownership: string | null;   // e.g. "25% membership interest"
}

// Binding form: passed through unchanged plus derived display strings matching
// the legacy text from pageOne.js (gift_display) and the ScheduleOfAssets
// subsections (soa_display, soa_secondary).
export type InventoryItemBinding = EstateInventoryItem & {
  gift_display: string;
  ownership_display: string;
  soa_display: string;
  soa_secondary: string;
};

// Computed bindings — opaque object, walked via dot-path expressions.
export type Bindings = Record<string, unknown>;

export type GeneratedDocument = {
  id: string;
  templateId: string;
  templateVersion: SemVer;
  bindingsSnapshot: Bindings;
  ast: PMDoc;                 // freely editable post-generation
  resolvedAt: string;
  finalizedAt?: string;
};
