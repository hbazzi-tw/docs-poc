// ---------------------------------------------------------------------------
// Per-state vocabulary dictionary used by `defined_term` resolution.
//
// Keys are ISO state codes (MI, CA, ...). Values map term → state-specific
// replacement. Looked up at resolve time against bindings.testator.state.
//
// Adoption guideline: states that adopted the Uniform Probate Code (UPC) use
// "Personal Representative" as the canonical term instead of "Executor". The
// ~18 UPC states include AK, AZ, CO, FL, HI, ID, ME, MI, MN, MT, NE, NM, ND,
// SC, UT, WI, plus partial adopters. We model a handful here as a smoke test
// of the multi-state dictionary structure — Michigan is the explicit
// requirement (the forcing function for promoting `defined_term` out of v2).
//
// States NOT in this dictionary fall back to the clause's default content
// (e.g. the literal "Executor"), so anything not listed here keeps working.
// ---------------------------------------------------------------------------

export const TERM_DICTIONARY: Record<string, Record<string, string>> = {
  // UPC states — "Personal Representative" instead of "Executor"
  MI: { executor: 'Personal Representative', executors: 'Personal Representatives' },
  MN: { executor: 'Personal Representative', executors: 'Personal Representatives' },
  NE: { executor: 'Personal Representative', executors: 'Personal Representatives' },
  CO: { executor: 'Personal Representative', executors: 'Personal Representatives' },

  // Louisiana civil-law tradition uses a distinct term for the estate's
  // fiduciary administrator.
  LA: { executor: 'Succession Representative', executors: 'Succession Representatives' },
};

// State-name → ISO-abbreviation map. The bindings carry the full name (e.g.
// "Michigan") to match the legacy `getStateNameByAbbreviation` flow, but the
// dictionary is keyed by abbreviation for compactness.
export const STATE_NAME_TO_ABBREV: Record<string, string> = {
  Alabama: 'AL',
  Alaska: 'AK',
  Arizona: 'AZ',
  Arkansas: 'AR',
  California: 'CA',
  Colorado: 'CO',
  Connecticut: 'CT',
  Delaware: 'DE',
  'District of Columbia': 'DC',
  Florida: 'FL',
  Georgia: 'GA',
  Hawaii: 'HI',
  Idaho: 'ID',
  Illinois: 'IL',
  Indiana: 'IN',
  Iowa: 'IA',
  Kansas: 'KS',
  Kentucky: 'KY',
  Louisiana: 'LA',
  Maine: 'ME',
  Maryland: 'MD',
  Massachusetts: 'MA',
  Michigan: 'MI',
  Minnesota: 'MN',
  Mississippi: 'MS',
  Missouri: 'MO',
  Montana: 'MT',
  Nebraska: 'NE',
  Nevada: 'NV',
  'New Hampshire': 'NH',
  'New Jersey': 'NJ',
  'New Mexico': 'NM',
  'New York': 'NY',
  'North Carolina': 'NC',
  'North Dakota': 'ND',
  Ohio: 'OH',
  Oklahoma: 'OK',
  Oregon: 'OR',
  Pennsylvania: 'PA',
  'Rhode Island': 'RI',
  'South Carolina': 'SC',
  'South Dakota': 'SD',
  Tennessee: 'TN',
  Texas: 'TX',
  Utah: 'UT',
  Vermont: 'VT',
  Virginia: 'VA',
  Washington: 'WA',
  'West Virginia': 'WV',
  Wisconsin: 'WI',
  Wyoming: 'WY',
};

export function getStateAbbrev(name: string | undefined | null): string | null {
  if (!name) return null;
  // Accept either the full state name or an already-abbreviated code.
  if (name.length === 2) return name.toUpperCase();
  return STATE_NAME_TO_ABBREV[name] ?? null;
}

export function lookupTerm(term: string, stateName: string | undefined | null): string | null {
  const abbrev = getStateAbbrev(stateName);
  if (!abbrev) return null;
  return TERM_DICTIONARY[abbrev]?.[term] ?? null;
}
