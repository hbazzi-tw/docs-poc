// ---------------------------------------------------------------------------
// Seed data: a Last Will & Testament template + a clause library derived from
// the real generator in tw-pdf-svc/PDF/TemplatePages/Will/.
//
// Source mapping (for traceability):
//   - revocation-of-prior-wills    ← pageOne.js `soundMindAndMemory`
//   - family-info-spouse           ← pageOne.js `switch(relationship_status_name)`
//   - family-info-children-named   ← pageOne.js `namedChildrenBlock`
//   - family-info-no-contract      ← pageOne.js `noContractToMakeWill`
//   - guardianship-children        ← pageOne.js `referencesChildrenSameGuardians`
//   - guardianship-bond            ← pageOne.js bond waiver block
//   - guardianship-temporary       ← pageOne.js temporary guardianship block
//   - adopted-descendants          ← pageOne.js `adoptedDescendantsParagraph`
//   - executor-nomination          ← pageFive.js
//   - executor-bond-waiver         ← pageSeven.js
//   - severability                 ← pageEight.js
//   - no-contest                   ← pageEight.js
//   - executor-independent-admin-ca← pageElevenCA.js (state-conditional)
//   - witness-attest-ca / -default ← Signatures/signatureCA + Default
//   - notary-acknowledgment-ca     ← Notary/notaryCA (optional in CA)
// ---------------------------------------------------------------------------

import type { Clause, Template, VariableDef, PMDoc, PersonBinding, InventoryItemBinding } from '../types';
import { getPeople, toBinding } from './people';
import { getInventory, toBinding as toInventoryBinding } from './inventory';

const now = () => new Date().toISOString();

function doc(...content: any[]): PMDoc {
  return { type: 'doc', content };
}
function p(...inline: any[]): any {
  return { type: 'paragraph', content: inline };
}
function t(text: string, marks?: any[]): any {
  return marks ? { type: 'text', text, marks } : { type: 'text', text };
}
function h(level: 1 | 2 | 3, ...inline: any[]): any {
  return { type: 'heading', attrs: { level }, content: inline };
}
function vref(path: string, fallback?: string): any {
  // Preserve undefined fallback (vs coercing to '') so the resolver can
  // distinguish "no fallback specified — warn if binding missing" from
  // "fallback is explicitly empty — silent rendering of empty string".
  return { type: 'variable_ref', attrs: { path, fallback, transform: null } };
}
function cref(clauseId: string, version: string = 'latest'): any {
  return { type: 'clause_ref', attrs: { clauseId, version, pinned: version !== 'latest' } };
}
function cond(condition: string, label: string, ...content: any[]): any {
  return { type: 'conditional', attrs: { condition, label }, content };
}
function loop(over: string, as: string, mode: 'block' | 'inline', ...content: any[]): any {
  return { type: 'for_each', attrs: { over, as, mode }, content };
}
function sig(witnesses: number, notaryRequired: boolean, attestation?: string | null): any {
  return { type: 'signature_block', attrs: { kind: 'simple', witnesses, notaryRequired, attestation: attestation ?? null } };
}
// Jurisdiction-aware vocabulary swap. `defaultText` is what renders when no
// state override exists (e.g. "Executor" in non-UPC states); MI/MN/NE/CO/LA
// get state-specific replacements via TERM_DICTIONARY (see terms.ts).
// Stored as an attribute (not child content) because defined_term is an
// inline atom node — atoms can't have content in ProseMirror.
function dterm(term: string, defaultText: string): any {
  return { type: 'defined_term', attrs: { term, defaultText } };
}
// New kind-discriminated signature block helper. Each kind matches a layout
// modeled after the real finalized T&W PDFs — see HtmlRenderer's
// SignatureBlock dispatch for the actual rendering.
function sigBlock(kind: string, state?: string | null): any {
  return { type: 'signature_block', attrs: { kind, state: state ?? null } };
}
function bullet(...items: any[]): any {
  return { type: 'bulletList', content: items.map(text => ({ type: 'listItem', content: [p(t(text))] })) };
}

// ---------------------------------------------------------------------------
// Clause Library
// ---------------------------------------------------------------------------

export const SEED_CLAUSES: Clause[] = [
  {
    id: 'revocation-of-prior-wills',
    name: 'Revocation of Prior Wills (Sound Mind & Memory)',
    version: '1.0.0',
    status: 'published',
    jurisdiction: undefined,
    applicableTo: ['will'],
    tags: ['intro', 'revocation'],
    purpose: 'Standard opening clause: testator declares sound mind, identifies state of residence, and revokes prior wills.',
    ast: doc(
      p(
        t('I, '),
        vref('testator.name'),
        t(', being of sound mind and memory, presently residing in the State of '),
        vref('testator.state'),
        t(', declare the following instrument as my Last Will and Testament (this "Will"). I hereby revoke all Wills and codicils previously made by me.'),
      ),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'family-info-spouse',
    name: 'Family Information — Spouse',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['will'],
    tags: ['family', 'spouse'],
    purpose: 'Identifies the spouse and defines "my spouse" reference.',
    ast: doc(
      p(
        t('I am married to '),
        vref('spouse.name'),
        t('. Any reference in my Will to "my spouse" is to '),
        vref('spouse.name'),
        t('.'),
      ),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'family-info-children-named',
    name: 'Family Information — Children (Named)',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['will'],
    tags: ['family', 'children'],
    purpose: 'Lists children by name and defines "my children" / "my descendants".',
    ast: doc(
      p(
        t('I have '),
        vref('children_count_word', 'one'),
        t(' '),
        vref('children_count_word_form', 'child'),
        t(': '),
        vref('children_named_list'),
        t('. References in my Will to "my children" are references to my living children listed above, as well as to any children subsequently born to me or adopted by me in a legal proceeding valid in the jurisdiction (domestic or foreign) in which it occurred. References to "my descendants" are to my children and their descendants, including descendants of any deceased child.'),
      ),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'family-info-no-contract',
    name: 'No Contract to Make Will',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['will'],
    tags: ['spouse', 'declaration'],
    purpose: 'Declares that this Will is not the product of a contract with the spouse; defensive against mutual-will challenges.',
    ast: doc(
      p(t('I have not entered into any contract to make this Will or any devise. Any similarity between the provisions or time of execution of this Will and the provisions or time of execution of any Will of my spouse is not to be construed as evidence of such a contract.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'guardianship-children',
    name: 'Guardianship — Children (Same Guardians)',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['will'],
    tags: ['guardianship'],
    purpose: 'Nominates a primary and backup guardian for all minor children.',
    ast: doc(
      p(t('If necessary to appoint a conservator or guardian for any child of mine, I nominate the following Primary Guardian to act as conservator and guardian of the person, the estate, and the property ("Guardian") of each of my children. If the Primary Guardian fails or ceases to act, I nominate the following Backup Guardian(s), in the order named, to act as successor Guardian:')),
      p(t('Primary Guardian: ', [{ type: 'bold' }]), vref('guardians.primary.name')),
      loop('guardians.backups', 'backup', 'block',
        p(t('Backup Guardian: ', [{ type: 'bold' }]), vref('backup.name')),
      ),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'guardianship-bond',
    name: 'Guardianship — Bond Waiver',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['will'],
    tags: ['guardianship', 'bond'],
    ast: doc(
      h(3, t('Bond')),
      p(t('I direct that any Guardian shall not be required to post bond or other security and shall serve free of court supervision, to the extent possible.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'guardianship-temporary',
    name: 'Guardianship — Temporary',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['will'],
    tags: ['guardianship'],
    ast: doc(
      h(3, t('Temporary Guardianship')),
      p(t('If an individual listed above is not immediately available to act as Guardian but is expected to become available within a reasonable time period, I nominate the next-named individuals, in the order named, to act as temporary Guardian until the higher-named individual is available for appointment.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'adopted-descendants',
    name: 'Adopted Descendants',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['will', 'trust'],
    tags: ['descendants', 'adoption'],
    ast: doc(
      h(3, t('Adopted Descendants')),
      p(t('A legally adopted person in any generation and that person\'s descendants, including adopted descendants, have the same rights and will be treated in the same manner under this Will as natural children of the adopting parent if the person is legally adopted before turning 18 years old. If an adoption was legal in the jurisdiction it occurred in at that time, then the adoption is considered legal. A fetus in utero that is later born alive will be considered a person in being during the period of gestation.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'distribution-residuary-spouse-or-descendants',
    name: 'Distribution — Residuary to Spouse or Descendants',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['will'],
    tags: ['distribution'],
    purpose: 'Married + has children: residuary to spouse if living, otherwise per stirpes to descendants.',
    ast: doc(
      p(t('I give all the rest, residue, and remainder of my estate to my spouse, '), vref('spouse.name'), t(', if my spouse survives me by at least 120 hours. If my spouse does not so survive me, I give my residuary estate to my descendants, per stirpes.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'distribution-residuary-spouse-only',
    name: 'Distribution — Residuary to Spouse Only',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['will'],
    tags: ['distribution'],
    ast: doc(
      p(t('I give all the rest, residue, and remainder of my estate to my spouse, '), vref('spouse.name'), t(', if my spouse survives me by at least 120 hours. If my spouse does not so survive me, I give my residuary estate to my heirs-at-law as determined under the laws of the State of '), vref('testator.state'), t(' at the time of my death.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'distribution-residuary-descendants-only',
    name: 'Distribution — Residuary to Descendants',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['will'],
    tags: ['distribution'],
    ast: doc(
      p(t('I give all the rest, residue, and remainder of my estate to my descendants, per stirpes.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'distribution-residuary-no-spouse-no-children',
    name: 'Distribution — Residuary (No Spouse, No Children)',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['will'],
    tags: ['distribution'],
    ast: doc(
      p(t('I give all the rest, residue, and remainder of my estate to my heirs-at-law as determined under the laws of the State of '), vref('testator.state'), t(' at the time of my death.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'executor-nomination',
    name: 'Executor — Nomination',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['will'],
    tags: ['executor'],
    purpose: 'Names primary executor. In non-UPC states (default) renders the verbatim "Executor and Personal Representative (\"Executor\")" synonym phrase from pageFive.js. In UPC states (MI, MN, NE, CO) the dterm dictionary swaps to "Personal Representative" and the synonym phrase collapses naturally.',
    ast: doc(
      p(
        t('I nominate '),
        vref('executors.primary.name'),
        t(' to act as my '),
        dterm('executor', 'Executor'),
        t(' and Personal Representative ("'),
        dterm('executor', 'Executor'),
        t('"). If '),
        vref('executors.primary.name'),
        t(' fails or ceases to act as my '),
        dterm('executor', 'Executor'),
        t(', I nominate the following Backup '),
        dterm('executors', 'Executors'),
        t(', in the order named, to act as my successor '),
        dterm('executor', 'Executor'),
        t(':'),
      ),
      loop('executors.backups', 'backup', 'block',
        p(t('Backup ', [{ type: 'bold' }]), dterm('executor', 'Executor'), t(': ', [{ type: 'bold' }]), vref('backup.name'), t('; then')),
      ),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'executor-powers',
    name: 'Executor — 9-Point Powers List',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['will'],
    tags: ['executor', 'powers'],
    purpose: 'The exact 9-point powers list from pageFive.js — collect/manage, partition/sell, distribute, hold, establish reserves, employ attorneys, execute instruments, fund trusts, ancillary administration. "Executor" wrapped in dterm so UPC states render "Personal Representative".',
    ast: doc(
      p(
        t('My '), dterm('executor', 'Executor'),
        t(' may perform every act reasonably necessary to administer my estate and any trust established under my Will. In addition to all powers and authority given by law or other provision of this Will, my '),
        dterm('executor', 'Executor'),
        t(' has the power and is specifically authorized to:'),
      ),
      { type: 'orderedList', content: [
        { type: 'listItem', content: [p(t('collect, hold, retain, invest, reinvest, sell, and manage any real or personal property, including interests in any form of business entity including limited partnerships and limited liability companies, and life, health, and disability insurance policies, without diversification as to kind, amount, or risk of non-productivity and without limitation by statute or rule of law;'))]},
        { type: 'listItem', content: [p(t('partition, sell, exchange, grant, convey, deliver, assign, transfer, lease, option, mortgage, pledge, abandon, borrow, loan, encumber, insure, manage, control, divide, improve, and contract with respect to any property;'))]},
        { type: 'listItem', content: [p(t('determine the nature and value of distributions and distribute assets of my estate in cash or in kind, or partly in each, at fair market value on the distribution date, without requiring pro rata distribution of specific assets and without requiring pro rata allocation of the tax bases of those assets;'))]},
        { type: 'listItem', content: [p(t('hold any interest in nominee form, continue businesses, carry out agreements, participate in business, vote shares, exercise shareholder rights, and deal with itself, other fiduciaries, and business organizations in which my '), dterm('executor', 'Executor'), t(' may have an interest;'))]},
        { type: 'listItem', content: [p(t('establish reserves, release powers, and prosecute, defend, abandon, pay, settle, or contest claims related to my estate or any property held by me or my estate;'))]},
        { type: 'listItem', content: [p(t('employ attorneys, accountants, custodians for trust assets, and other agents or assistants as my '), dterm('executor', 'Executor'), t(' deems advisable to act with or without discretionary powers, and compensate them and pay their expenses from income or principal;'))]},
        { type: 'listItem', content: [p(t('execute and deliver any instruments needed to carry out the powers of my '), dterm('executor', 'Executor'), t(';'))]},
        { type: 'listItem', content: [p(t('establish, create, and fund trusts to receive property distributable to any beneficiary of this Will, in the discretion of my '), dterm('executor', 'Executor'), t('; and'))]},
        { type: 'listItem', content: [p(t('act as my '), dterm('executor', 'Executor'), t(' or Personal Representative in any ancillary administration that may be required or desired, or to designate, compensate, remove, and transfer or pay property to any natural person or corporation to act as my '), dterm('executor', 'Executor'), t(' or Personal Representative in any such ancillary administration, and delegate any or all of the powers held by my '), dterm('executor', 'Executor'), t(' to the '), dterm('executor', 'Executor'), t(' or Personal Representative in any such ancillary administration, including the right to serve without bond or surety.'))]},
      ]},
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'executor-payment-options',
    name: 'Executor — Payment Options',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['will'],
    tags: ['executor', 'powers'],
    purpose: '4-item list of payment options from pageFive.js.',
    ast: doc(
      p(t('My '), dterm('executor', 'Executor'), t(' may make any payments under my Will:')),
      { type: 'orderedList', content: [
        { type: 'listItem', content: [p(t('directly to a beneficiary;'))]},
        { type: 'listItem', content: [p(t('in any form allowed by applicable state or federal law for gifts or transfers to minors or persons under disability;'))]},
        { type: 'listItem', content: [p(t('to a beneficiary\'s guardian, conservator, or caregiver for the beneficiary\'s benefit; or'))]},
        { type: 'listItem', content: [p(t('by direct payment of the beneficiary\'s expenses.'))]},
      ]},
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'executor-minor-utma',
    name: 'Executor — Minor UTMA Distribution',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['will'],
    tags: ['executor', 'minor', 'utma'],
    purpose: 'State-specific UTMA paragraph for distributions to minors. State name interpolated; "Executor" via dterm.',
    ast: doc(
      p(
        t('If any property is distributable to a minor, my '), dterm('executor', 'Executor'),
        t(' may, in the sole discretion of my '), dterm('executor', 'Executor'),
        t(', pay or transfer any or all of that property to another person for the use or benefit of the minor beneficiary, including a trustee of a trust for the minor beneficiary or a custodian that my '),
        dterm('executor', 'Executor'),
        t(' selects for the minor beneficiary under the '),
        vref('testator.state'),
        t(' Uniform Transfers to Minors Act or a similar law of any other state, until the beneficiary reaches an age selected by my '),
        dterm('executor', 'Executor'),
        t(', but not past the age 25 or the maximum age then allowed under the applicable Uniform Transfers to Minors Act or similar law.'),
      ),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'executor-in-addition-powers',
    name: 'Executor — In Addition Powers',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['will'],
    tags: ['executor', 'powers'],
    ast: doc(
      p(
        t('In addition to the above powers, my '), dterm('executor', 'Executor'),
        t(' may, without prior authority from any court, exercise all powers conferred by my Will, by common law, or by the '),
        vref('testator.state'),
        t(' law or any other jurisdiction whose law applies to my Will. Except as specifically limited by my Will these powers extend to all property held by my '),
        dterm('executor', 'Executor'),
        t(' until the actual distribution of the property.'),
      ),
      p(t('To the extent possible, my '), dterm('executor', 'Executor'), t(' shall be authorized and empowered to exercise all powers independently, without limitation, and without seeking prior judicial approval for any authorized action.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'executor-bond',
    name: 'Executor — Bond Subsection',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['will'],
    tags: ['executor', 'bond'],
    ast: doc(
      h(3, t('Bond')),
      p(t('To the extent permissible, my '), dterm('executor', 'Executor'), t(' is not required to give any bond, surety, or security to any court.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'executor-bond-waiver',
    name: 'Executor — Compensation Subsection',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['will'],
    tags: ['executor', 'compensation'],
    purpose: 'Note: clause ID retained as executor-bond-waiver for backward compatibility; content is now the Compensation subsection from pageFive.js.',
    ast: doc(
      h(3, t('Compensation')),
      p(
        t('My '), dterm('executor', 'Executor'),
        t(' is authorized and entitled to compensation as provided under the laws of any state or other jurisdiction that apply to my Will. In addition, my '),
        dterm('executor', 'Executor'),
        t(' is entitled to reimbursement for reasonable expenses incurred. A receipt by the recipient for any distribution will fully discharge my '),
        dterm('executor', 'Executor'),
        t(' if the distribution is consistent with the proper exercise of my '),
        dterm('executor', 'Executor'),
        t('\'s duties under my Will.'),
      ),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'executor-independent-admin-ca',
    name: 'Executor — Independent Administration (California)',
    version: '1.0.0',
    status: 'published',
    jurisdiction: 'CA',
    applicableTo: ['will'],
    tags: ['executor', 'ca-specific'],
    purpose: 'California-specific clause granting full Independent Administration of Estates Act authority. "Executor" via dterm even though this clause only fires on California (which doesn\'t override the term) — keeps the prose self-consistent if the clause is ever reused.',
    ast: doc(
      h(3, t('Independent Administration of Estates Act')),
      p(t('I authorize my '), dterm('executor', 'Executor'), t(' to administer my estate under the California Independent Administration of Estates Act, with full authority granted thereunder.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'severability',
    name: 'Severability (Will)',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['will', 'trust', 'poa'],
    tags: ['boilerplate'],
    purpose: 'Matches Will pageEight.js Severability — bold inline subsection header.',
    ast: doc(
      p(t('Severability', [{ type: 'bold' }])),
      p(t('If any part of this instrument is determined to be void or invalid, the remaining provisions will continue in full force and effect.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'no-contest',
    name: 'No-Contest Clause',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['will', 'trust'],
    tags: ['boilerplate', 'enforcement'],
    purpose: 'Matches Will pageEight.js No-Contest Clause exactly.',
    ast: doc(
      p(t('No-Contest Clause', [{ type: 'bold' }])),
      p(
        t('If any beneficiary of my estate, alone or with any other persons, contests in court the validity of this Will or any trust receiving property under this Will, or seeks an adjudication in any proceeding in any court that this Will or any of its dispositive provisions are void, or otherwise seek to void, nullify, or set aside any of the provisions of this Will, then the right of that person to take any property, shall be revoked and shall be determined as if that contesting beneficiary had not survived me and left no heirs-at-law that could, in any case, receive the revoked share. My '),
        dterm('executor', 'Executor'),
        t(' is authorized to defend, at the expense of my estate, any contest or other attack on this Will or any of its provisions.'),
      ),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'gender-grammatical-number',
    name: 'Gender and Grammatical Number',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['will', 'trust'],
    tags: ['boilerplate'],
    purpose: 'Matches Will pageEight.js Gender and Grammatical Number.',
    ast: doc(
      p(t('Gender and Grammatical Number', [{ type: 'bold' }])),
      p(t('Unless a different construction is clearly required by the context, the masculine, feminine, and neuter genders shall each include the others, the singular and plural numbers shall include the other, and no distinction is to be drawn from the use of a particular gender or grammatical number.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },

  // -------------------------------------------------------------------------
  // Charity
  // Source: pageOne.js charity block lines 848-879
  // -------------------------------------------------------------------------
  {
    id: 'charity',
    name: 'Charity',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['will'],
    tags: ['charity', 'distribution'],
    purpose: 'Loops over the charity[] binding. Each charity entry: name, ein, percentage|amount.',
    ast: doc(
      h(2, t('Charity')),
      loop('charity', 'c', 'block',
        p(
          t('To '),
          vref('c.name'),
          t(', a nonprofit corporation'),
          vref('c.ein_phrase', ''),
          t(', I leave '),
          vref('c.contribution_phrase'),
          t('.'),
        ),
      ),
    ),
    createdAt: now(),
    updatedAt: now(),
  },

  // -------------------------------------------------------------------------
  // Distribution of Estate (the full structure from pageThree.js)
  // -------------------------------------------------------------------------
  {
    id: 'distribution-preamble-with-gifts',
    name: 'Distribution — Preamble (with prior specific gifts/charity)',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['will'],
    tags: ['distribution'],
    purpose: 'Used when hasSpecificGifts or hasCharity is true. Matches pageThree.js line 75.',
    ast: doc(
      p(t('Except for the gifts listed above, my '), dterm('executor', 'Executor'), t(' shall distribute my estate according to the following:')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'distribution-preamble-no-gifts',
    name: 'Distribution — Preamble (no prior gifts)',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['will'],
    tags: ['distribution'],
    ast: doc(
      p(t('My '), dterm('executor', 'Executor'), t(' shall distribute my estate according to the following:')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'distribution-residuary-named-recipients',
    name: 'Distribution — Residuary Named Recipients with Percentages',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['will'],
    tags: ['distribution'],
    purpose: 'Per-recipient percentage list with grammatical "; and" / "." separators. Matches pageThree.js displayRecipientList.',
    ast: doc(
      p(t('I leave my residuary estate to the following people. If any of the named people do not survive me, the gift to that person shall lapse and be distributed pro rata to those named people that survive me.')),
      loop('estateDistributionRecipients', 'r', 'block',
        p(vref('r.percentage_line')),
      ),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'contingent-distribution',
    name: 'Contingent Distribution',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['will'],
    tags: ['distribution'],
    purpose: 'Backup beneficiary distribution if primary fails. Matches pageThree.js Contingent Distribution.',
    ast: doc(
      p(t('Contingent Distribution', [{ type: 'bold' }])),
      p(t('If any gift or distribution provided above fails or lapses in any way so that there is no beneficiary designated and qualified to receive such gift or distribution, then such portion of my estate shall be distributed as follows:')),
      loop('contingentBeneficiaries', 'r', 'block',
        p(vref('r.percentage_line')),
      ),
      p(t('If any beneficiary listed above does not survive me, the distribution to that beneficiary shall lapse and be distributed pro rata to those named beneficiaries that do survive me.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'disinheritance',
    name: 'Disinheritance',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['will'],
    tags: ['distribution'],
    purpose: 'Standard disinheritance from pageThree.js. Optional disinheritedChildren list extension when doesExclude is true.',
    ast: doc(
      p(t('Disinheritance', [{ type: 'bold' }])),
      p(t('I intentionally and with full knowledge of the consequences omit and do not provide in this Will for any persons, descendants, or heirs that are not named or described in this Will, whether known or unknown to me. I have made no contract or agreement obligating me to leave any gifts to any person and I expressly disinherit anyone who claims otherwise.')),
      cond('doesExclude', 'If user has explicitly disinherited individuals',
        p(
          t(' I intentionally and with full knowledge of the consequences omit, do not provide for in this Will, and expressly disinherit '),
          vref('disinherited_names_joined'),
          t('. Notwithstanding any other provisions or definitions in this Will, I direct that no distributions be made to any such disinherited individual and that any such disinherited individual be excluded from the definitions and classes of "my children" and "my descendants" for purposes of the distribution of my estate.'),
        ),
      ),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'estate-details',
    name: 'Estate Details',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['will'],
    tags: ['distribution'],
    ast: doc(
      p(t('Estate Details', [{ type: 'bold' }])),
      p(t('My entire estate is everything I own at my death that is subject to this Will and that remains after paying all debts, administration expenses, and taxes.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'remote-contingent-distribution-married',
    name: 'Remote Contingent Distribution (Married)',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['will'],
    tags: ['distribution'],
    purpose: 'Matches pageThree.js remoteContingentMarriedParagraph.',
    ast: doc(
      p(t('Remote Contingent Distribution', [{ type: 'bold' }])),
      p(t('If, at any time, there is no person or entity qualified to receive final distribution of my estate or any part of it, then the portion of my estate with respect to which the failure of qualified recipients has occurred shall be distributed one-half to those persons who would inherit it had I then died intestate owning the property, and one-half to those persons who would inherit it had my spouse then died intestate owning such property, all as determined and in the proportions provided by the laws then in effect.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'remote-contingent-distribution-single',
    name: 'Remote Contingent Distribution (Single)',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['will'],
    tags: ['distribution'],
    purpose: 'Matches pageThree.js remoteContingentSingleParagraph.',
    ast: doc(
      p(t('Remote Contingent Distribution', [{ type: 'bold' }])),
      p(t('If, at any time, there is no person or entity qualified to receive final distribution of my estate or any part of it, then the portion of my estate with respect to which the failure of qualified recipients has occurred shall be distributed to those persons who would inherit it had I then died intestate owning the property, as determined and in the proportions provided by the laws then in effect.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'survivorship',
    name: 'Survivorship',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['will'],
    tags: ['distribution'],
    purpose: 'Matches pageThree.js Survivorship.',
    ast: doc(
      p(t('Survivorship', [{ type: 'bold' }])),
      p(t('A beneficiary must survive me for at least 120 hours to receive property under this Will. As used in this Will, to "survive" me means to be alive or in existence as an organization 120 hours after my death.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },

  // -------------------------------------------------------------------------
  // Digital Executor (pageSeven.js)
  // -------------------------------------------------------------------------
  {
    id: 'digital-executor-nomination',
    name: 'Digital Executor — Nomination',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['will'],
    tags: ['executor', 'digital'],
    purpose: 'Matches pageSeven.js digitalExecOpeningParagraph + Backup list.',
    ast: doc(
      p(
        t('I nominate '),
        vref('digitalExecutors.primary.name'),
        t(' to act as my Digital Executor. If '),
        vref('digitalExecutors.primary.name'),
        t(' fails or ceases to act as my Digital Executor, I nominate the following Backup Digital Executors, in the order named, to act as my successor Digital Executors:'),
      ),
      loop('digitalExecutors.backups', 'backup', 'block',
        p(t('Backup Digital Executor: ', [{ type: 'bold' }]), vref('backup.name'), t('; then')),
      ),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'digital-executor-empowered',
    name: 'Digital Executor — Empowered',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['will'],
    tags: ['executor', 'digital'],
    purpose: 'Verbatim from pageSeven.js digitalExecEmpoweredParagraph.',
    ast: doc(
      p(t('My Digital Executor is authorized and empowered to manage, distribute, and/ or terminate my digital assets exercising the judgment and care, under the circumstances then prevailing, that persons of prudence, discretion and intelligence exercise in the management of their own affairs, not in regard to speculation but in regard to the permanent disposition of their digital assets, considering the probable safety of their digital assets.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'digital-executor-auth',
    name: 'Digital Executor — Authority',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['will'],
    tags: ['executor', 'digital'],
    ast: doc(
      p(t('I authorize the custodian of any of my digital assets to disclose and give access to my digital assets to my Digital Executor. My Digital Executor shall have the right to administer my digital assets using informal, unsupervised, or independent probate or equivalent legislation designed to operate without unnecessary intervention by the probate court. No bond or other security of any kind will be required of any Digital Executor appointed in this Will.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'digital-executor-purpose',
    name: 'Digital Executor — Digital Assets Definition',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['will'],
    tags: ['executor', 'digital', 'definitions'],
    ast: doc(
      p(t('For the purposes of this Will, digital assets mean electronic assets that are stored on my computers, electronic devices, or on any online account. Online accounts include, but are not limited to, social-networking sites, online backup services, servers, email accounts, photo and document sharing sites, financial and business accounts, domain names, virtual property, websites, and blogs.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'digital-executor-powers-6',
    name: 'Digital Executor — 6-Point Powers List',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['will'],
    tags: ['executor', 'digital', 'powers'],
    purpose: 'Verbatim list from pageSeven.js.',
    ast: doc(
      p(t('I grant to my Digital Executor the following powers:')),
      { type: 'orderedList', content: [
        { type: 'listItem', content: [p(t('The power to manage, distribute and/ or terminate my digital assets without order of court and without notice to anyone;'))]},
        { type: 'listItem', content: [p(t('The power to access, download, and backup digital assets, to convert file formats, to access any and all devices as necessary to manage digital assets, to clear computer caches, and to delete files;'))]},
        { type: 'listItem', content: [p(t('The power to employ and compensate counsel and other persons deemed necessary by the Digital Executor for proper administration of my digital assets;'))]},
        { type: 'listItem', content: [p(t('The power to delegate authority when such delegation is advantageous to the estate or to the management, distribution and/ or termination of my digital assets;'))]},
        { type: 'listItem', content: [p(t('The power to continue to exercise the powers provided in this Will notwithstanding the termination of my estate until all the digital assets of the estate have been distributed; and'))]},
        { type: 'listItem', content: [p(t('Any additional powers conferred upon digital executors wherever my Digital Executor may act.'))]},
      ]},
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'digital-executor-closing',
    name: 'Digital Executor — Closing / Lawful Consent',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['will'],
    tags: ['executor', 'digital'],
    ast: doc(
      p(t('This authority is intended to constitute "lawful consent" to divulge the contents of any communication or record under the Stored Communications Act, the Computer Fraud and Abuse Act, and any other state or federal law relating to digital assets, data privacy, or computer fraud. My Digital Executor shall be considered an authorized user for purposes of applicable computer-fraud and unauthorized-computer-access laws. My grant of authority is intended to provide my Digital Executor full authority to access and manage my digital assets, digital devices of any type, and online accounts, to the maximum extent permitted under applicable state and federal law and does not limit any authority granted to my Digital Executor under such laws.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },

  // -------------------------------------------------------------------------
  // Taxes, Claims, Debts, and Expenses (pageEight.js)
  // -------------------------------------------------------------------------
  {
    id: 'taxes-claims-debts-expenses',
    name: 'Taxes, Claims, Debts, and Expenses',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['will'],
    tags: ['taxes'],
    purpose: 'Verbatim 4-paragraph cluster from pageEight.js. "Executor" via dterm throughout.',
    ast: doc(
      p(t('I direct that my '), dterm('executor', 'Executor'), t(' pay the expenses of my last illness, of my funeral, of my just debts, and of my estate\'s administration from my residuary estate.')),
      p(t('My '), dterm('executor', 'Executor'), t(' shall pay all estate, inheritance and similar taxes payable with respect to property included in my estate, whether or not passing under my Will, and any interest or penalties, from my residuary estate without apportionment and with no right of reimbursement from any recipient of any estate property.')),
      p(
        t('My '), dterm('executor', 'Executor'),
        t(' may make any elections allowed by the Internal Revenue Code or the laws of any state or other jurisdiction. In making such elections regarding taxes, my '),
        dterm('executor', 'Executor'),
        t(' may make such decisions as my '),
        dterm('executor', 'Executor'),
        t(' deems appropriate considering all circumstances and my '),
        dterm('executor', 'Executor'),
        t(' shall have no liability and shall have no duty to make adjustments as a result of any such election.  My '),
        dterm('executor', 'Executor'),
        t(' may also execute joint tax returns, pay taxes or interest, and deal with refunds, interest, or credits as my '),
        dterm('executor', 'Executor'),
        t(' deems necessary or advisable either in the interest of the other joint taxpayer or in the interest of my estate.'),
      ),
      p(t('If payment would decrease the federal estate tax marital deduction available to my estate or violate the provisions of Treasury Regulation Section 20.2056(b)-4(d), my '), dterm('executor', 'Executor'), t(' may not pay any administrative expenses from the net income of property qualifying for the federal estate tax marital deduction.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'general-provisions-opening',
    name: 'General Provisions — Governing Law Opening',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['will'],
    tags: ['general-provisions'],
    purpose: 'Opens the General Provisions section. Matches pageEight.js with state-specific governing law.',
    ast: doc(
      p(
        t('The validity and construction of my Will will be determined by the laws of the State of '),
        vref('testator.state'),
        t('. I have not entered into any contract, actual or implied, to make a Will.'),
      ),
    ),
    createdAt: now(),
    updatedAt: now(),
  },

  // -------------------------------------------------------------------------
  // Final Arrangements (Will-specific, pageEight.js — different from HCD's)
  // -------------------------------------------------------------------------
  {
    id: 'final-arrangements-will',
    name: 'Final Arrangements (Will)',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['will'],
    tags: ['final-arrangements'],
    purpose: 'Pulls bodyDisposalPreference + servicePreference + optional finalArrangementNote from bindings. Matches pageEight.js exactly.',
    ast: doc(
      p(
        t('I direct that my body '),
        vref('bodyDisposalPreference', 'be disposed of as my Executor sees fit'),
        t('.'),
      ),
      p(
        t('I direct that '),
        vref('servicePreference', 'no formal service be held'),
        t('.'),
      ),
      cond('finalArrangementNote', 'If user provided special-request note',
        p(t('In carrying out my wishes for my final arrangements, I provide the following special requests:')),
        p(vref('finalArrangementNote')),
      ),
      p(t('Any outstanding costs associated with my final arrangements shall be paid out of my estate by my '), dterm('executor', 'Executor'), t('.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },

  // -------------------------------------------------------------------------
  // Appendix — My People (AppendixMyPeople.js)
  // -------------------------------------------------------------------------
  {
    id: 'appendix-my-people-intro',
    name: 'Appendix — My People (Intro)',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['will'],
    tags: ['appendix'],
    ast: doc(
      h(2, t('My People')),
      p(
        t('These are the people '),
        vref('testator.name'),
        t(' appointed to carry out their wishes when this Will was created.'),
      ),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'appendix-executors-list',
    name: 'Appendix — Executors List',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['will'],
    tags: ['appendix'],
    purpose: 'Name + email rows for each executor. Matches AppendixMyPeople.js createPersonLine. Header term swaps per state.',
    ast: doc(
      h(3, dterm('executors', 'Executors')),
      loop('appendix_executors', 'p', 'block',
        p(vref('p.name'), t(' — '), vref('p.email', '')),
      ),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'appendix-guardians-list',
    name: 'Appendix — Guardians List',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['will'],
    tags: ['appendix'],
    ast: doc(
      h(3, t('Guardians')),
      loop('appendix_guardians', 'p', 'block',
        p(vref('p.name'), t(' — '), vref('p.email', '')),
      ),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'appendix-digital-executors-list',
    name: 'Appendix — Digital Executors List',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['will'],
    tags: ['appendix'],
    ast: doc(
      h(3, t('Digital Executors')),
      loop('appendix_digital_executors', 'p', 'block',
        p(vref('p.name'), t(' — '), vref('p.email', '')),
      ),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'appendix-gift-recipients-list',
    name: 'Appendix — Gift Recipients List',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['will'],
    tags: ['appendix'],
    ast: doc(
      h(3, t('Gift Recipients')),
      loop('appendix_gift_recipients', 'p', 'block',
        p(vref('p.name'), t(' — '), vref('p.email', '')),
      ),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'governing-law',
    name: 'Governing Law',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['will', 'trust', 'poa'],
    tags: ['boilerplate'],
    ast: doc(
      h(3, t('Governing Law')),
      p(t('This Will shall be construed and governed in accordance with the laws of the State of '), vref('testator.state'), t('.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },

  // -------------------------------------------------------------------------
  // Healthcare Directive clauses
  // Source: tw-pdf-svc/PDF/TemplatePages/HealthCareDirective/sections/**
  // -------------------------------------------------------------------------
  // -------------------------------------------------------------------------
  // HCD — Opening + Personal Information (PDF page 2)
  // -------------------------------------------------------------------------
  {
    id: 'hcd-make-this-directive',
    name: 'HCD — Make This Directive (Opening)',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['healthcare-directive'],
    tags: ['intro'],
    purpose: 'Opening sentence on PDF page 2. Different from hcd-intent-statement (PDF page 6) which scopes the Instructions for Health Care section.',
    ast: doc(
      p(t('I, '), vref('testator.name'), t(', make this Healthcare Directive to designate a Health Care Agent, specify the powers of my Health Care Agent, and provide other instructions regarding my health care and the authority of my Health Care Agent.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'hcd-personal-information',
    name: 'HCD — Personal Information',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['healthcare-directive'],
    tags: ['identity'],
    purpose: 'Name / date of birth / address block on PDF page 2.',
    ast: doc(
      h(2, t('Personal Information')),
      p(t('My name: ', [{ type: 'bold' }]), vref('testator.name')),
      p(t('My date of birth: ', [{ type: 'bold' }]), vref('testator.dob', '____________________')),
      p(t('My address: ', [{ type: 'bold' }]), vref('testator.full_address', '____________________')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'hcd-designation-primary-agent',
    name: 'HCD — Designation of Primary Health Care Agent',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['healthcare-directive'],
    tags: ['agent', 'appointment'],
    purpose: 'Nominates the primary Health Care Agent (PDF page 2).',
    ast: doc(
      h(2, t('Designation of Health Care Agent')),
      p(t('I nominate the following individual to serve as my Health Care Agent, proxy, surrogate, representative, and any other similar term ("Health Care Agent"):')),
      p(t('Agent’s name: ', [{ type: 'bold' }]), vref('primaryHCAgent.name')),
      p(t('Agent’s address: ', [{ type: 'bold' }]), vref('primaryHCAgent.full_address')),
      p(t('Agent’s phone: ', [{ type: 'bold' }]), vref('primaryHCAgent.phone_number', 'N/A')),
      p(t('Agent’s email: ', [{ type: 'bold' }]), vref('primaryHCAgent.email', 'N/A')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'hcd-designation-backup-agents',
    name: 'HCD — Designation of Alternate Agents',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['healthcare-directive'],
    tags: ['agent', 'appointment'],
    purpose: 'Successor-by-order list of backup Health Care Agents. PDF labels them "First Alternate Agent", "Second Alternate Agent". POC uses for_each + $index for the ordinal.',
    ast: doc(
      p(t('If the primary agent, named above, is unwilling, unable, or ceases to act as my Health Care Agent for any reason, then I nominate the following individuals, in the order named to serve as my Health Care Agent:')),
      loop('backupHCAgents', 'agent', 'block',
        h(3, vref('agent.alternate_label', 'Alternate Agent')),
        p(t('Agent’s name: ', [{ type: 'bold' }]), vref('agent.name')),
        p(t('Agent’s address: ', [{ type: 'bold' }]), vref('agent.full_address')),
        p(t('Agent’s phone: ', [{ type: 'bold' }]), vref('agent.phone_number', 'N/A')),
        p(t('Agent’s email: ', [{ type: 'bold' }]), vref('agent.email', 'N/A')),
      ),
    ),
    createdAt: now(),
    updatedAt: now(),
  },

  // -------------------------------------------------------------------------
  // HCD — Powers of Health Care Agent (PDF pages 3-4)
  // -------------------------------------------------------------------------
  {
    id: 'hcd-powers-list-8',
    name: 'HCD — Powers of Health Care Agent (8-point list)',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['healthcare-directive'],
    tags: ['powers'],
    purpose: 'The main body of the doc — 8 enumerated powers. Item #1 has a special initial-line confirming end-of-life decisions. Ends with crossed-out-text disclaimer.',
    ast: doc(
      h(2, t('Powers of Health Care Agent')),
      p(t('I give my Health Care Agent broad authority to make decisions regarding my health care wishes.')),
      p(t('My Health Care Agent has full authority to make decisions for me about my health care. To the extent my Health Care Agent knows my goals, wishes, and desires based on any oral or written communications or any other written guidance, my Health Care Agent shall make decisions in accordance with my goals, wishes, and desires. In all other instances and in any instance in which it is unclear which decision I would make for myself, my Health Care Agent shall make decisions based on what my Health Care Agent believes to be in my best interests.')),
      p(t('My Health Care Agent shall have broad authority to make decisions for me; to interpret my goals, wishes, and desires; and to determine what is in my best interests. The authority of my Health Care Agent shall include the following:')),
      { type: 'orderedList', content: [
        { type: 'listItem', content: [
          p(t('To agree to, refuse, or withdraw consent to any type of medical care, treatment, surgical procedure, tests, medications, or other activity related to my health care.')),
          p(t('____________ By initialing here, I expressly confirm that this authority includes making decisions about using mechanical or other procedures that may affect any bodily functions, including, but not limited to, artificial respiration, artificially-supplied nutrition and hydration, cardiopulmonary resuscitation, life support, or any type of medical support or procedure, even if the decision could or would result in my death, hasten my death, or otherwise alter the timing of my death', [{ type: 'bold' }])),
        ]},
        { type: 'listItem', content: [p(t('To have access to medical records, health care information, protected medical information and individually identifiable health information as defined under the Health Insurance Portability and Accountability Act of 1996 and relevant state law, and any other information relevant to my Health Care Agent in carrying out the authority of my Health Care Agent, to the same extent that I am or would be entitled to, including the right to disclose any such records or information to others.'))]},
        { type: 'listItem', content: [p(t('To authorize my admission to or discharge from any hospital, nursing home, residential care, assisted-living, or other similar facility or service, even if such admission or discharge is against medical advice.'))]},
        { type: 'listItem', content: [p(t('To contract for any health care related services or facilities for me and to apply for any public or private health care benefits. My Health Care Agent shall not be personally liable or financially responsible for any such contracts.'))]},
        { type: 'listItem', content: [p(t('To hire and fire any medical, social service, or other support personnel who are responsible for or contribute to my care.'))]},
        { type: 'listItem', content: [p(t('To authorize my participation in medical research related to my medical condition, including my participation in or with any experimental or trial treatments, procedures, or medications.'))]},
        { type: 'listItem', content: [p(t('To agree to, refuse, or withdraw consent to using any medication, treatment, or procedure intended to relieve pain or discomfort, even if that use could or would result in physical damage, dependency, or hasten (but not intentionally cause) my death.'))]},
        { type: 'listItem', content: [p(t('To take any other action necessary to do what I authorize or direct in this document or in other written instructions provided to my Health Care Agent, including signing any waivers or other documents, pursuing any dispute resolution process, or taking any action in my name.'))]},
      ]},
      p(t('If I have crossed out, struck, or otherwise negated any portion of or the entirety of any power enumerated above, then such crossed out, struck, or negated text shall have no effect and shall convey no power to my Health Care Agent.', [{ type: 'bold' }])),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'hcd-special-instructions-limitations',
    name: 'HCD — Special Instructions or Limitations',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['healthcare-directive'],
    tags: ['custom'],
    purpose: 'PDF page 4. Preamble + free-text instructions block (or 4 blank lines if no instructions provided). Replaces old hcd-personal-instructions.',
    ast: doc(
      h(2, t('Special Instructions or Limitations')),
      p(t('Notwithstanding any other provision of this document, my Health Care Agent shall abide by the following instructions. To the extent that any of the following provisions limit the authority of my Health Care Agent described above, the provisions here shall control and supersede any provisions listed above.')),
      cond('instructionsNote', 'If user provided special instructions',
        p(vref('instructionsNote')),
      ),
      cond('!instructionsNote', 'Default: 4 blank lines',
        p(t('______________________________________________________________________')),
        p(t('______________________________________________________________________')),
        p(t('______________________________________________________________________')),
        p(t('______________________________________________________________________')),
      ),
    ),
    createdAt: now(),
    updatedAt: now(),
  },

  // -------------------------------------------------------------------------
  // HCD — Effectiveness + Additional Provisions (PDF page 5)
  // -------------------------------------------------------------------------
  {
    id: 'hcd-effectiveness',
    name: 'HCD — Effectiveness',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['healthcare-directive'],
    tags: ['effectiveness'],
    purpose: 'When the directive takes effect — incapacity trigger.',
    ast: doc(
      h(2, t('Effectiveness')),
      p(t('This Healthcare Directive shall become effective at any time that I am unable, in the opinion of my Health Care Agent and my attending physician, to make or communicate a choice about a particular health care decision. This Healthcare Directive becomes effective upon the incapacity of the principal. This Healthcare Directive shall be durable and shall remain in effect during any period of my incapacity or disability.')),
      p(t('If I am unable to make or communicate a choice about a particular health care decision, my Health Care Agent shall have any and all powers and authority to carry out and effectuate my decision.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'hcd-additional-provisions',
    name: 'HCD — Additional Provisions',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['healthcare-directive'],
    tags: ['boilerplate'],
    purpose: 'PDF page 5: rely-on-agent / revoke-prior / execute-in-state / copies / no-compensation paragraphs.',
    ast: doc(
      h(2, t('Additional Provisions')),
      p(t('I authorize and instruct any health care provider to rely on my Health Care Agent. No health care provider, other individual, or other institution who, in good faith, reasonably relies on any representations by my Health Care Agent will be liable to me, my estate, my heirs, or my assigns for recognizing the actual or apparent authority of my Health Care Agent.')),
      p(t('I revoke and rescind any prior Healthcare Directive, Power of Attorney for Health Care, or other designation of agent to make health care decisions for me.')),
      p(t('I complete and execute this form in the state of '), vref('testator.state'), t(' on the date indicated below. I intend this Healthcare Directive to be universal and valid in any jurisdiction in which it is presented.')),
      p(t('I authorize my Health Care Agent to make one or more copies of this Healthcare Directive. I intend copies of this document to have the same effect as the original. My Health Care Agent is authorized to provide copies to any health care provider.')),
      p(t('My Health Care Agent is not entitled to receive compensation for services performed under or in connection with this Healthcare Directive. My Health Care Agent is entitled to reimbursement for reasonable expenses incurred in connection with or as a result of carrying out any provision of this Healthcare Directive or in exercising any authority granted to my Health Care Agent by this document.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },

  // -------------------------------------------------------------------------
  // HCD — Instructions for Health Care (PDF page 6)
  // -------------------------------------------------------------------------
  {
    id: 'hcd-intent-statement',
    name: 'HCD — Intent Statement (Instructions for Health Care opener)',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['healthcare-directive'],
    tags: ['intro'],
    purpose: 'Opens the "Instructions for Health Care" section on PDF page 6.',
    ast: doc(
      h(2, t('Instructions for Health Care')),
      p(t('I intend this document to be a health care directive to my Health Care Agent, my doctors, and my other Health Care Providers. If the provisions are not enforceable as a health care directive, I intend these provisions be construed and given effect as a written expression of my intentions, desires, and preferences.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'hcd-general-provisions-for-care',
    name: 'HCD — General Provisions for Health Care',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['healthcare-directive'],
    tags: ['general-provisions'],
    purpose: 'Home-care preferences subsection on PDF page 6.',
    ast: doc(
      h(3, t('General Provisions for Health Care')),
      p(t('I desire to remain in my home as long as possible. My Health Care Agent is authorized to take any actions necessary for me to remain in my home for as long as it is reasonable for me to do so. My Health Care Agent shall ensure that funds are available to pay for any in-home care provided, but my desire is to remain in my home regardless of the costs or expenses.')),
      p(t('If it is necessary to receive Care and Treatment outside of my home, my Health Care Agent is authorized to arrange for my care at any medical facility, hospital, hospice care, nursing home, or other similar facility. My Health Care Agent shall ensure that all of my essential needs are provided for and that I maintain a comfortable standard of living and hygiene. My Health Care Agent is authorized to facilitate the reasonable payment for any such services.')),
      p(t('My Health Care Agent is authorized to facilitate any activities and the involvement of any individuals in accordance with my established beliefs and customary activities known to my Health Care Agent. My Health Care Agent may facilitate the presence of any clergy or other individuals to support my beliefs and may facilitate any associated activities, materials, or services.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'hcd-eol-intro',
    name: 'HCD — End of Life Decisions (Intro / Options Preamble)',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['healthcare-directive'],
    tags: ['end-of-life'],
    purpose: '"By initialing one of the options below..." preamble shared by all 4 EOL options.',
    ast: doc(
      h(3, t('End of Life Decisions')),
      p(t('By initialing one of the options below, I expressly confirm that the initialed option reflects my authorization, instructions, and desires regarding my Care and Treatment.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'hcd-eol-in-all-cases',
    name: 'HCD — End of Life Option 1: Care in All Cases',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['healthcare-directive'],
    tags: ['end-of-life', 'option-1'],
    purpose: 'PDF Option 1. Aggressive treatment branch.',
    ast: doc(
      h(3, t('Option 1')),
      p(t('____________ I desire Care and Treatment in all cases, as described below:', [{ type: 'bold' }])),
      p(t('I desire that my life be prolonged to the greatest possible extent, regardless of my physical or mental condition, the likelihood of my suffering, or the expenses incurred.')),
      p(t('I authorize and direct any type of Care and Treatment, including life-sustaining Care and Treatment, even if it will only prolong my life or delay the timing of my death without improving my condition.')),
      p(t('I authorize the administration of nutrition and hydration in all ways possible, including artificial nutrition and hydration.')),
      p(t('I authorize and desire Care and Treatment that will reduce or relieve my pain or discomfort, even if that Care and Treatment could or would result in physical damage, dependency, or hasten (but not intentionally cause) my death.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'hcd-eol-benefits-burdens-considerations',
    name: 'HCD — Benefits/Burdens Considerations (Shared by Options 2 & 3)',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['healthcare-directive'],
    tags: ['end-of-life', 'shared'],
    purpose: 'The 6-bullet benefits/burdens considerations + closing paragraphs shared by Options 2 and 3.',
    ast: doc(
      p(t('In weighing the benefits and the burdens, my Health Care Agent shall consider the following:')),
      bullet(
        'The impact of the Care and Treatment on my prognosis;',
        'Whether the Care and Treatment will relieve or reduce my suffering;',
        'The intrusiveness, potential side effects, and risks of the Care and Treatment;',
        'The recovery process that would likely be required after the Care and Treatment;',
        'Whether the Care and Treatment will extend my life; and',
        'My quality of life reasonably expected after the Care and Treatment.',
      ),
      p(t('My Health Care Agent shall consider the opinion of my Health Care Providers regarding the benefits and burdens of any Care and Treatment, but my Health Care Agent shall make the ultimate determination of whether the benefits outweigh the burdens.')),
      p(t('Regardless of the benefits and burdens, I authorize and desire in all cases to receive nutrition and hydration by natural means. I authorize the administration of artificial nutrition and hydration only if the benefits outweigh the burdens.')),
      p(t('Regardless of the benefits and burdens, I authorize and desire Care and Treatment that will reduce or relieve my pain or discomfort, even if that Care and Treatment could or would result in physical damage, dependency, or hasten (but not intentionally cause) my death.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'hcd-eol-benefits-outweigh',
    name: 'HCD — End of Life Option 2: Benefits Outweigh Burdens',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['healthcare-directive'],
    tags: ['end-of-life', 'option-2'],
    purpose: 'PDF Option 2. Agent weighs benefits/burdens — no exceptions.',
    ast: doc(
      h(3, t('Option 2')),
      p(t('____________ I desire Care and Treatment for which the benefits outweigh the burdens, as determined by my Health Care Agent, as described below:', [{ type: 'bold' }])),
      p(t('I desire only to receive Care and Treatment that will improve my health or improve my quality of life.')),
      p(t('I authorize and direct only such Care and Treatment, including life-sustaining Care and Treatment, for which the benefits outweigh the burdens, in the discretion of my Health Care Agent.')),
      cref('hcd-eol-benefits-burdens-considerations'),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'hcd-eol-if-benefits-outweigh-burden',
    name: 'HCD — End of Life Option 3: Benefits Outweigh, With Exceptions',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['healthcare-directive'],
    tags: ['end-of-life', 'option-3'],
    purpose: 'PDF Option 3. Agent weighs benefits/burdens UNLESS in Terminal Condition, Irreversible Coma, or Severe Brain Damage.',
    ast: doc(
      h(3, t('Option 3')),
      p(t('____________ I desire Care and Treatment for which the benefits outweigh the burdens, as determined by my Health Care Agent, unless I am in a Terminal Condition, I am in an Irreversible Coma, or I have Severe Brain Damage, as described below:', [{ type: 'bold' }])),
      p(t('I desire only to receive Care and Treatment that will improve my health or improve my quality of life.')),
      p(t('If 1) I have a Terminal Condition, 2) I am in an Irreversible Coma for at least 60 days, or 3) I have Severe Brain Damage, then I do not wish to receive and do not authorize life-sustaining Care and Treatment that will only prolong my life or delay the timing of my death without improving my condition.')),
      p(t('In all other conditions, I authorize and direct only such Care and Treatment, including life-sustaining Care and Treatment, for which the benefits outweigh the burdens, in the discretion of my Health Care Agent.')),
      cref('hcd-eol-benefits-burdens-considerations'),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'hcd-eol-only-if-will-improve',
    name: 'HCD — End of Life Option 4: Refuse Life-Sustaining',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['healthcare-directive'],
    tags: ['end-of-life', 'option-4'],
    purpose: 'PDF Option 4. Refuse life-sustaining treatment that only delays death.',
    ast: doc(
      h(3, t('Option 4')),
      p(t('____________ I do not wish to receive life-sustaining Care and Treatment, as described below:', [{ type: 'bold' }])),
      p(t('I do not wish to receive life-sustaining Care and Treatment that will only delay the timing of my death without improving my condition.')),
      p(t('I do not authorize the administration of life-sustaining Care and Treatment that will only prolong my life or delay the timing of my death without improving my condition.')),
      p(t('I authorize and desire to receive nutrition and hydration by natural means, but I do not authorize the administration of artificial nutrition and hydration.')),
      p(t('I authorize and desire Care and Treatment that will reduce or relieve my pain or discomfort, even if that Care and Treatment could or would result in physical damage, dependency, or hasten (but not intentionally cause) my death.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },

  // -------------------------------------------------------------------------
  // HCD — Definitions (PDF page 9)
  // -------------------------------------------------------------------------
  {
    id: 'hcd-definitions',
    name: 'HCD — Definitions',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['healthcare-directive'],
    tags: ['definitions'],
    purpose: 'Five defined terms used throughout the doc: Care and Treatment, Health Care Provider, Terminal Condition, Irreversible Coma, Severe Brain Damage.',
    ast: doc(
      h(3, t('Definitions')),
      p(t('"Care and Treatment"', [{ type: 'bold' }]), t(' refers to any type of treatment or care related to my health care, including, but not limited to, any medical treatment, medical care, emergency care, surgical procedures, tests, examinations, or medications. Care and Treatment also refers to any type of treatment or care related to psychological or psychiatric care, dental care, or therapeutic care.')),
      p(t('"Health Care Provider"', [{ type: 'bold' }]), t(' refers to any individual, organization, institution, or entity providing or supporting any Care and Treatment. Health Care Providers include, but are not limited to, medical doctors and physicians of any type; mental health providers including psychologists and psychiatrists; therapists; dentists; nurses; hospitals, clinics, and emergency care facilities; pharmacists and pharmacies; laboratories; emergency care providers, first responders, and ambulance services; nursing facilities and residential care facilities; medical insurance companies, or any other medical provider.')),
      p(t('"Terminal Condition"', [{ type: 'bold' }]), t(' refers to a condition that is reasonably likely to result in my death within one year, regardless of any treatment that I may receive, as diagnosed and documented in my medical records by two physicians licensed to practice medicine in the state of my residence or in the state where I am then located.')),
      p(t('"Irreversible Coma"', [{ type: 'bold' }]), t(' refers to a permanent loss of consciousness with no reasonable likelihood of recovery of consciousness and recovery of a cognitive life, as diagnosed and documented in my medical records by two physicians licensed to practice medicine in the state of my residence or in the state where I am then located.')),
      p(t('"Severe Brain Damage"', [{ type: 'bold' }]), t(' refers to permanent and severe brain damage, with or without a loss of consciousness, with no reasonable likelihood of recovery of a cognitive life, as diagnosed and documented in my medical records by two physicians licensed to practice medicine in the state of my residence or in the state where I am then located.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },

  // -------------------------------------------------------------------------
  // HCD — Post-Death Authority (PDF page 10)
  // -------------------------------------------------------------------------
  {
    id: 'hcd-autopsy',
    name: 'HCD — Autopsy',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['healthcare-directive'],
    tags: ['post-death'],
    ast: doc(
      h(2, t('Post-Death Authority of Health Care Agent')),
      h(3, t('Autopsy')),
      p(t('On my death, my Health Care Agent is authorized to authorize my autopsy.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'hcd-organ-donation-intro',
    name: 'HCD — Organ and Tissue Donation (Intro)',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['healthcare-directive'],
    tags: ['post-death', 'organ-donation'],
    purpose: 'Header + "By initialing one of the options below..." preamble shared by both organ-donation options.',
    ast: doc(
      h(3, t('Organ and Tissue Donation')),
      p(t('By initialing one of the options below, I expressly confirm that the initialed option reflects my authorization, instructions, and desires regarding organ and tissue donation:')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'hcd-organ-donation-yes',
    name: 'HCD — Organ Donation Option 1: Authorized',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['healthcare-directive'],
    tags: ['post-death', 'organ-donation'],
    ast: doc(
      h(3, t('Option 1')),
      p(t('____________ Organ and Tissue donation authorized, as described below:', [{ type: 'bold' }])),
      p(t('My Health Care Agent is authorized to make an anatomical gift of my body or any of my organs, tissues, or other parts of my body under the Uniform Anatomical Gift Act or other relevant law, for transplant, therapy, research, education, or other purpose.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'hcd-organ-donation-no',
    name: 'HCD — Organ Donation Option 2: Prohibited',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['healthcare-directive'],
    tags: ['post-death', 'organ-donation'],
    ast: doc(
      h(3, t('Option 2')),
      p(t('____________ Organ and Tissue donation prohibited, as described below:', [{ type: 'bold' }])),
      p(t('My Health Care Agent is not authorized or empowered to make any anatomical gift or donate my body or any of my organs, tissues, or parts for any purpose.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'hcd-final-arrangements',
    name: 'HCD — Final Arrangements',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['healthcare-directive'],
    tags: ['post-death'],
    purpose: 'Final arrangements language with reference to executor + 4 blank lines for inline instructions.',
    ast: doc(
      h(3, t('Final Arrangements')),
      p(t('I have provided instructions for the disposition of my body and remains in my Will. My Health Care Agent is authorized to comply with any instructions from my executor or personal representative in carrying out these instructions and my Health Care Agent is authorized to take any actions that my Health Care Agent deems to be necessary and appropriate for my funeral and the disposition of my remains in the manner I have directed.')),
      p(t('To the extent that no such instructions are provided in my Will or to the extent that the executor of my Will is unable to carry out the instructions provided in my Will for any reason, then my Health Care Agent is authorized to dispose of my body and remains as follows:')),
      p(t('______________________________________________________________________')),
      p(t('______________________________________________________________________')),
      p(t('______________________________________________________________________')),
      p(t('______________________________________________________________________')),
      p(t('My Health Care Agent is empowered to authorize or incur reasonable expenses in carrying out my final arrangements. Any such expenses shall be paid out of any trust for which I am a grantor and that authorizes such payment. If no such trust exists, then any such expenses shall be paid by the executor or personal representative of my estate. My Health Care Agent is entitled to seek reimbursement for any reasonable costs advanced by my Health Care Agent.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },

  // -------------------------------------------------------------------------
  // HCD — General Provisions (PDF pages 11-13, 10 subsections)
  // -------------------------------------------------------------------------
  {
    id: 'hcd-agent-authority',
    name: 'HCD — Authority of Health Care Agent',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['healthcare-directive'],
    tags: ['agent', 'authority'],
    ast: doc(
      h(2, t('General Provisions')),
      h(3, t('Authority of Health Care Agent')),
      p(t('My Health Care Agent is authorized to commence, seek, continue, or deal with any judicial proceeding to determine the validity or interpretation of this document. My Health Care Agent is authorized to seek judicial remedies against any third party who is obligated to comply with this document or my Health Care Agent’s instructions, but who fails to do so.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'hcd-limitations-on-authority',
    name: 'HCD — Limitations on Authority of Health Care Agent',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['healthcare-directive'],
    tags: ['agent', 'limitations'],
    purpose: 'Hard limits: agent cannot consent to commitment, ECT, psychosurgery, sterilization, or abortion.',
    ast: doc(
      h(3, t('Limitations on Authority of Health Care Agent')),
      p(t('My Health Care Agent is not authorized to consent to any of the following on my behalf: (1) commitment or placement in a mental health treatment facility; (2) electro-convulsive therapy or shock therapy; (3) psychosurgery; (4) sterilization; or (5) abortion.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'hcd-release-of-medical-info',
    name: 'HCD — Release of Medical Information',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['healthcare-directive'],
    tags: ['hipaa', 'medical-info'],
    purpose: 'HIPAA carve-out: designates agent as personal representative, authorizes disclosure.',
    ast: doc(
      h(3, t('Release of Medical Information')),
      p(t('I designate my Health Care Agent as a Personal Representative and authorize my Health Care Providers to disclose and release any Medical Information upon request of my Health Care Agent. This constitutes a full authorization to disclose any Medical Information or Individually Identifiable Health Information to my Health Care Agent, despite the protections of the Health Insurance Portability and Accountability Act of 1996 and relevant state law ("HIPAA").')),
      p(t('As used in this section, the terms "Health Care Provider," and "Individually Identifiable Health Information" refer to the terms as defined by HIPAA and relevant state law. "Medical Information" refers to any information related in any way to my health care or Care and Treatment, including Individually Identifiable Health Information and Protected Medical Information as defined under HIPAA, and under relevant state law.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'hcd-agent-compensation',
    name: 'HCD — Compensation and Reimbursement of Agent',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['healthcare-directive'],
    tags: ['agent', 'compensation'],
    ast: doc(
      h(3, t('Compensation and Reimbursement of Health Care Agent')),
      p(t('My Health Care Agent is not entitled to receive reasonable compensation for services provided pursuant to this document.')),
      p(t('My Health Care Agent is entitled to reimbursement for all reasonable costs and expenses actually incurred and paid by my Health Care Agent on my behalf pursuant to this document.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'hcd-retention-of-rights',
    name: 'HCD — Retention of My Rights',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['healthcare-directive'],
    tags: ['rights'],
    ast: doc(
      h(3, t('Retention of my Rights')),
      p(t('I retain the right to make my own medical and health care decisions so long as I am able to give informed consent, I reserve the right to refuse any treatment or medical procedures, and no treatment or medical procedures may be given to me over my objection or refusal.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'hcd-revocation-of-document',
    name: 'HCD — Revocation of Document or Termination of Health Care Agent',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['healthcare-directive'],
    tags: ['revocation'],
    purpose: 'Four ways to revoke + partial-revocation language.',
    ast: doc(
      h(3, t('Revocation of Document or Termination of Health Care Agent')),
      p(t('I reserve the right to revoke this document, terminate the authority of my Health Care Agent, or remove my Health Care Agent, with or without replacing my Health Care Agent after removal.')),
      p(t('Any such revocation, termination, or removal may be effectuated in any of the following ways:')),
      { type: 'orderedList', content: [
        { type: 'listItem', content: [p(t('By executing a written document confirming such action;'))]},
        { type: 'listItem', content: [p(t('By destroying all copies of this document that relate to the designation of my Health Care Agent;'))]},
        { type: 'listItem', content: [p(t('By conspicuously writing "Revoked," "Terminated," or other similar words or phrases over the text of this document that relate to the designation of my Health Care Agent and signing such marks; or'))]},
        { type: 'listItem', content: [p(t('Any other manner permitted by law.'))]},
      ]},
      p(t('Any such revocation, termination, or removal may be total and remove all powers and authorities granted by this document or may be partial and remove some or all powers and authorities granted to some or all Health Care Agents by this document.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'hcd-resignation-of-agent',
    name: 'HCD — Resignation of Health Care Agent',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['healthcare-directive'],
    tags: ['resignation'],
    ast: doc(
      h(3, t('Resignation of Health Care Agent')),
      p(t('My Health Care Agent may resign by providing a written notice of resignation to me or, if I am incapacitated, to any agent serving under my durable power of attorney. If there is no such agent, or if the resigning Health Care Agent is also serving as such agent, the notice may be provided to any person that has care and custody over me.')),
      p(t('My Health Care Agent is deemed to have resigned upon 1) death, 2) adjudication of incapacity, or 3) diagnosis by two or more licensed physicians that my Health Care Agent is unable to manage his or her own personal or financial affairs.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'hcd-release-of-agent',
    name: 'HCD — Release of Health Care Agent',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['healthcare-directive'],
    tags: ['release'],
    ast: doc(
      h(3, t('Release of Health Care Agent')),
      p(t('My Health Care Agent and the heirs, successors, assigns, and estate of my Health Care Agent are released and discharged by me, my heirs, successors, assigns, and estate, from any and all liability, claims, or demands related to or arising from the acts or omissions of my Health Care Agent in carrying out the duties and powers under any provision of this document, other than the willful misconduct or gross negligence of my Health Care Agent.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'hcd-copies-and-effect',
    name: 'HCD — Copies and Effect of Copies',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['healthcare-directive'],
    tags: ['copies'],
    ast: doc(
      h(3, t('Copies and Effect of Copies')),
      p(t('My Health Care Agent is authorized to make one or more copies of this document and provide such copies to Health Care Providers or other recipients, as deemed necessary by my Health Care Agent. My Health Care Agent is authorized to have a copy of this document placed in my medical records. A copy of this document has the same effect as the original.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'hcd-severability',
    name: 'HCD — Severability',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['healthcare-directive'],
    tags: ['severability'],
    purpose: 'HCD-specific severability phrasing — slightly shorter than the general severability clause.',
    ast: doc(
      h(3, t('Severability')),
      p(t('If any part of this instrument is determined to be void or invalid, the remaining provisions will continue in full force and effect.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },

  // -------------------------------------------------------------------------
  // HIPAA Authorization clauses
  // Source: tw-pdf-svc/PDF/TemplatePages/HIPAA/sections/**
  // -------------------------------------------------------------------------
  {
    id: 'hipaa-opening-declaration',
    name: 'HIPAA — Opening Declaration',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['hipaa'],
    tags: ['intro'],
    purpose: 'Opening sentence on PDF page 2.',
    ast: doc(
      p(t('I, '), vref('testator.name'), t(', make this Authorization to Release Medical Information ("Authorization") to designate the individuals authorized to receive my Medical Information and to authorize my Health Care Providers to release my Medical Information to those designated individuals.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'hipaa-designation-representatives',
    name: 'HIPAA — Designation of Personal Representative To Receive Medical Information',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['hipaa'],
    tags: ['designation'],
    purpose: 'Authorizes Health Care Providers to disclose Medical Information to named representatives. Matches HIPAA/sections/section1 in tw-pdf-svc: up to N labeled "Representative One/Two/Three" slots followed by 3 categorical bullets.',
    ast: doc(
      h(2, t('Designation of Personal Representative To Receive Medical Information')),
      p(t('I designate the following individuals as my Personal Representatives and I authorize my Health Care Providers to disclose and release my Medical Information to any or all of my Personal Representatives:')),
      loop('hipaaRepresentatives', 'rep', 'block',
        p(t('• ', [{ type: 'bold' }]), vref('rep.label', 'Representative'), t(' — '), vref('rep.name'), t(';')),
      ),
      p(t('• The trustee or successor trustee of any trust for which I am a trustee or trustor;', [{ type: 'bold' }])),
      p(t('• My personal representative, executor, administrator, or any individual serving the same or similar capacity in connection with my estate, including any successors; and', [{ type: 'bold' }])),
      p(t('• Any agent or successor agent named under my health care directive or other medical or health care power of attorney.', [{ type: 'bold' }])),
      p(t('It is my intention to provide the Personal Representatives named above broad rights to access and receive my Medical Information. Despite the provisions of HIPAA, I desire my Personal Representatives have access to my Medical Information, at the request of my Personal Representative. This Authorization constitutes a full authorization to disclose any Individually Identifiable Health Information to the Personal Representatives named in this Authorization.')),
      p(t('I intend this Authorization to be broad and any questions or ambiguities regarding the provisions of this Authorization shall be resolved in favor of allowing the disclosure and release of my Medical Information to my Personal Representatives.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'hipaa-definitions',
    name: 'HIPAA — Definitions',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['hipaa'],
    tags: ['definitions'],
    ast: doc(
      h(2, t('Definitions')),
      p(t('"Medical Information"', [{ type: 'bold' }]), t(' means any information, oral, recorded, or in any other medium, that relates to my past, present, or future physical or mental health or condition, the provision of health care to me, or the past, present, or future payment for the provision of health care to me, including any "Individually Identifiable Health Information" as that term is used in HIPAA.')),
      p(t('"HIPAA"', [{ type: 'bold' }]), t(' means the Health Insurance Portability and Accountability Act of 1996, as amended, and its implementing regulations.')),
      p(t('"Health Care Providers"', [{ type: 'bold' }]), t(' means any provider of medical services that I have engaged or that has provided care or treatment to me, including any successors.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'hipaa-purpose',
    name: 'HIPAA — Purpose of Disclosure',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['hipaa'],
    tags: ['purpose'],
    ast: doc(
      h(3, t('Purpose of Disclosure')),
      p(t('I authorize the disclosure of my Medical Information for any purpose my Personal Representatives deem appropriate, including but not limited to: making informed health care decisions on my behalf, communicating with my Health Care Providers, applying for benefits or insurance, and resolving disputes regarding my care.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'hipaa-expiration',
    name: 'HIPAA — Expiration',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['hipaa'],
    tags: ['expiration'],
    ast: doc(
      h(3, t('Expiration')),
      p(t('This Authorization has no expiration date and shall remain in effect until revoked by me in writing.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'hipaa-revocation',
    name: 'HIPAA — Revocation',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['hipaa', 'healthcare-directive'],
    tags: ['revocation'],
    ast: doc(
      h(3, t('Revocation')),
      p(t('I may revoke this Authorization at any time by providing written notice of revocation to the Health Care Providers from whom I wish to revoke disclosure. Revocation shall not apply to any disclosures already made in reliance on this Authorization.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'hipaa-additional-provisions',
    name: 'HIPAA — Additional Provisions',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['hipaa'],
    tags: ['boilerplate'],
    ast: doc(
      h(2, t('Additional Provisions')),
      p(t('Copies of this Authorization shall have the same effect as the original. A photocopy, facsimile, or electronic image of this Authorization shall be considered an original for all purposes.')),
      p(t('This Authorization shall be governed by the laws of the State of '), vref('testator.state'), t('.')),
      p(t('If any provision of this Authorization is held to be invalid, illegal, or unenforceable, the remaining provisions shall continue in full force and effect.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },

  // -------------------------------------------------------------------------
  // Financial Durable Power of Attorney clauses
  // Source inspiration: tw-pdf-svc/PDF/TemplatePages/POA/* (state-form
  // overlays) + standard UPOAA / state-statutory POA language. The state-form
  // overlay pattern in tw-pdf-svc doesn't decompose cleanly into clauses
  // because it stamps text onto pre-existing image-based state forms; the
  // AST approach is the T&W-authored alternative the RFC anticipates.
  // -------------------------------------------------------------------------
  {
    id: 'poa-declaration-principal',
    name: 'POA — Declaration of Principal',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['poa'],
    tags: ['intro', 'durable'],
    purpose: 'Opening declaration: I, the Principal, intend this to be a Durable Power of Attorney under the laws of my state.',
    ast: doc(
      p(
        t('I, '), vref('testator.name'),
        t(', a resident of the State of '), vref('testator.state'),
        t(', being of sound mind, hereby make, constitute, and appoint the agent named below as my attorney-in-fact ("Agent") under this Durable Power of Attorney. I intend this instrument to be construed as a durable power of attorney under the laws of the State of '),
        vref('testator.state'), t('.'),
      ),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'poa-designation-agent',
    name: 'POA — Designation of Agent',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['poa'],
    tags: ['agent', 'appointment'],
    purpose: 'Names the primary financial Agent (attorney-in-fact).',
    ast: doc(
      h(3, t('Designation of Agent')),
      p(t('I designate the following individual to serve as my Agent under this Power of Attorney:')),
      p(t('Agent\'s name: ', [{ type: 'bold' }]), vref('financialAgent.name')),
      p(t('Agent\'s address: ', [{ type: 'bold' }]), vref('financialAgent.full_address')),
      p(t('Agent\'s phone: ', [{ type: 'bold' }]), vref('financialAgent.phone_number', 'N/A')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'poa-designation-backup-agents',
    name: 'POA — Designation of Successor Agents',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['poa'],
    tags: ['agent', 'appointment'],
    purpose: 'Successor-by-order list of backup Agents.',
    ast: doc(
      p(t('If my primary Agent is unable, unwilling, or ceases to act for any reason, then I designate the following individuals, in the order named, to serve as my successor Agent under this Power of Attorney:')),
      loop('backupFinancialAgents', 'agent', 'block',
        p(t('Successor Agent: ', [{ type: 'bold' }]), vref('agent.name')),
        p(t('   Address: ', [{ type: 'bold' }]), vref('agent.full_address')),
        p(t('   Phone: ', [{ type: 'bold' }]), vref('agent.phone_number', 'N/A')),
      ),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'poa-effective-immediate',
    name: 'POA — Effective Immediately',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['poa'],
    tags: ['effectiveness', 'durable'],
    purpose: 'Standard immediately-effective POA — agent can act from the date of execution.',
    ast: doc(
      h(3, t('Effective Date')),
      p(t('This Power of Attorney shall be effective immediately upon execution and shall continue in effect notwithstanding my subsequent incapacity or disability, until revoked by me in writing or terminated by operation of law.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'poa-effective-springing',
    name: 'POA — Springing Effectiveness',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['poa'],
    tags: ['effectiveness', 'springing'],
    purpose: 'Springing POA — agent\'s authority only activates upon a defined incapacity trigger.',
    ast: doc(
      h(3, t('Effective Date — Springing')),
      p(
        t('This Power of Attorney shall become effective only upon a determination that I am incapacitated and unable to manage my financial affairs. For purposes of this instrument, I shall be deemed incapacitated upon the following: '),
        vref('springingTrigger', 'written certification of two licensed physicians, at least one of whom has personally examined me, that I am unable to manage my financial affairs by reason of physical or mental incapacity'),
        t('.'),
      ),
      p(t('Once effective, this Power of Attorney shall continue in effect notwithstanding the continuation of my incapacity, until revoked by me in writing or terminated by operation of law.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'poa-durability',
    name: 'POA — Durability Provision',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['poa'],
    tags: ['durable'],
    purpose: 'Express durability declaration — the POA survives the principal\'s incapacity.',
    ast: doc(
      h(3, t('Durability')),
      p(t('This Power of Attorney shall not be affected by my subsequent disability or incapacity. The authority of my Agent under this instrument shall continue notwithstanding any subsequent lapse of time or any subsequent disability or incapacity on my part.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'poa-powers-general',
    name: 'POA — General Grant of Powers',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['poa'],
    tags: ['powers', 'general'],
    purpose: 'Catch-all grant: agent has full authority over enumerated subject areas.',
    ast: doc(
      h(3, t('Powers Granted')),
      p(t('I grant my Agent full power and authority to act on my behalf with respect to all of the following matters, with the same effect as if I were personally present and acting:')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'poa-powers-real-estate',
    name: 'POA — Power: Real Estate',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['poa'],
    tags: ['powers', 'real-estate'],
    ast: doc(
      p(t('• Real estate: ', [{ type: 'bold' }]), t('To buy, sell, exchange, lease, mortgage, manage, repair, improve, and otherwise deal with any real property in which I have an interest, including but not limited to executing deeds, leases, mortgages, and related instruments.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'poa-powers-banking',
    name: 'POA — Power: Banking & Financial Accounts',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['poa'],
    tags: ['powers', 'banking'],
    ast: doc(
      p(t('• Banking: ', [{ type: 'bold' }]), t('To deposit, withdraw, and transfer funds; sign checks; open and close accounts; enter and access safe deposit boxes; and otherwise transact business with any banking, savings, or financial institution on my behalf.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'poa-powers-investments',
    name: 'POA — Power: Investments',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['poa'],
    tags: ['powers', 'investments'],
    ast: doc(
      p(t('• Investments: ', [{ type: 'bold' }]), t('To buy, sell, exchange, pledge, or otherwise dispose of any securities, bonds, mutual funds, or other investment assets; to vote, consent, or take any other action with respect to such investments; and to engage investment advisors on my behalf.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'poa-powers-taxes',
    name: 'POA — Power: Tax Matters',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['poa'],
    tags: ['powers', 'taxes'],
    ast: doc(
      p(t('• Tax matters: ', [{ type: 'bold' }]), t('To prepare, sign, and file federal, state, and local tax returns; to represent me before the Internal Revenue Service and equivalent state agencies; to receive and endorse tax refunds; and to act on my behalf in all tax matters.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'poa-powers-retirement',
    name: 'POA — Power: Retirement Plans',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['poa'],
    tags: ['powers', 'retirement'],
    ast: doc(
      p(t('• Retirement plans: ', [{ type: 'bold' }]), t('To make contributions, withdrawals, rollovers, and other transactions with respect to any IRA, 401(k), pension, or other retirement plan in which I have an interest; to designate beneficiaries; and to elect or change distribution options, subject to applicable plan terms.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'poa-powers-insurance',
    name: 'POA — Power: Insurance',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['poa'],
    tags: ['powers', 'insurance'],
    ast: doc(
      p(t('• Insurance: ', [{ type: 'bold' }]), t('To purchase, modify, renew, surrender, and make claims on any insurance policy in which I have an interest, including life, health, disability, property, and liability insurance; to designate or change beneficiaries on any policy as permitted; and to receive and endorse insurance proceeds.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'poa-powers-gifts',
    name: 'POA — Power: Gifts (Hot Power)',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['poa'],
    tags: ['powers', 'gifts', 'hot-power'],
    purpose: 'Gift-giving is a "hot power" requiring express authorization in most states. Only included when grantor explicitly authorizes.',
    ast: doc(
      p(
        t('• Gifts: ', [{ type: 'bold' }]),
        t('To make gifts of my property to my spouse, my descendants, or any other person or entity, including charitable organizations, subject to a maximum annual aggregate value of '),
        vref('giftLimitAnnual', '$18,000'),
        t(' per donee, consistent with the federal gift tax annual exclusion. This power expressly includes authority to make gifts to my Agent personally, subject to the same limit.'),
      ),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'poa-no-self-dealing-default',
    name: 'POA — No Self-Dealing (Default)',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['poa'],
    tags: ['limits', 'fiduciary'],
    purpose: 'Default fiduciary limitation: agent cannot benefit from transactions unless gift power is granted.',
    ast: doc(
      h(3, t('Fiduciary Duties and Limitations')),
      p(t('My Agent shall act at all times in my best interests and in accordance with my reasonably known wishes. My Agent shall not engage in any self-dealing or other transaction in which my Agent has a personal interest adverse to mine, except as expressly authorized in this instrument. My Agent shall keep my property separate from my Agent\'s property and shall maintain complete records of all transactions undertaken on my behalf.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'poa-third-party-reliance',
    name: 'POA — Third-Party Reliance',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['poa'],
    tags: ['third-party'],
    purpose: 'Protects third parties (banks, brokers, etc.) who rely on the POA in good faith.',
    ast: doc(
      h(3, t('Third-Party Reliance')),
      p(t('Any third party who receives a copy of this Power of Attorney may rely on it in good faith. No third party who relies on this Power of Attorney shall incur any liability to me, to my Agent, to my estate, or to my heirs or assigns as a result of permitting my Agent to exercise any authority granted herein.')),
      p(t('A photocopy, facsimile, or electronic image of this Power of Attorney shall have the same force and effect as the original. This Power of Attorney shall continue to be effective despite the passage of time and shall remain in force until revoked in writing or terminated by my death.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'poa-agent-compensation',
    name: 'POA — Agent Compensation',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['poa'],
    tags: ['agent', 'compensation'],
    ast: doc(
      h(3, t('Compensation and Reimbursement of Agent')),
      p(t('My Agent shall serve without compensation, but shall be entitled to reimbursement for all reasonable expenses actually incurred in the performance of duties on my behalf. If my Agent is a professional fiduciary or licensed practitioner who would customarily be entitled to compensation for similar services, my Agent shall be entitled to reasonable compensation in accordance with my Agent\'s ordinary fee schedule.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  // -------------------------------------------------------------------------
  // Estate Inventory / Specific Gifts clauses
  // Source: tw-pdf-svc/PDF/TemplatePages/Will/pageOne.js lines 730-846 +
  //         tw-pdf-svc/PDF/TemplatePages/ScheduleOfAssets/sections/exhibitA/**
  // -------------------------------------------------------------------------
  {
    id: 'specific-gifts-opening',
    name: 'Specific Gifts — Opening',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['will'],
    tags: ['gifts', 'inventory'],
    purpose: 'Standard intro for the Specific Gifts article. Mirrors specificGiftsOpeningParagraph in tw-pdf-svc.',
    ast: doc(
      h(3, t('Specific Gifts')),
      p(t('I leave the following specific item(s) to the person(s) or organization(s) named below, if I own such property at the time of my death.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'specific-gifts-asset-gifts',
    name: 'Specific Gifts — Asset Gifts (Real Estate / Vehicle / Business / Other)',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['will'],
    tags: ['gifts', 'inventory'],
    purpose: 'Renders the per-asset gift narrative for each gifted inventory item. Uses gift_display (preformatted by toBinding) to match the legacy assetsGift branches in tw-pdf-svc/Will/pageOne.js.',
    ast: doc(
      loop('assetGifts', 'item', 'block',
        p(vref('item.gift_display')),
      ),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'specific-gifts-named-recipients',
    name: 'Specific Gifts — Named Items (Non-Inventory)',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['will'],
    tags: ['gifts'],
    purpose: 'Specific gifts of named items not in the inventory (jewelry, mementos, etc.). Loops over the specificGifts binding.',
    ast: doc(
      loop('specificGifts', 'g', 'block',
        p(t('To '), vref('g.recipient'), t(', I give '), vref('g.gift'), t('.')),
      ),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'specific-gifts-closing',
    name: 'Specific Gifts — Lapse Clause (Closing)',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['will'],
    tags: ['gifts'],
    purpose: 'Closes the Specific Gifts article with a heirs-at-law-on-predeceased rule. Mirrors specificGiftsClosingParagraph.',
    ast: doc(
      p(t('If any of the named beneficiaries do not survive me, the gift to that beneficiary shall be made to the heirs-at-law of the predeceased beneficiary. If the predeceased beneficiary has no heirs-at-law, or if any specific gift fails for any reason, then the gift to that predeceased beneficiary shall lapse and become part of and distributed with my residuary estate.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },

  // -------------------------------------------------------------------------
  // Schedule of Assets clauses (full inventory listing — separate document)
  // Source: tw-pdf-svc/ScheduleOfAssets/sections/exhibitA/subsec*
  // -------------------------------------------------------------------------
  // -------------------------------------------------------------------------
  // Schedule of Assets — Exhibit A subsections
  // Source: tw-pdf-svc/ScheduleOfAssets/sections/exhibitA/* and exhibitA.js
  // Real PDF uses numbered lists (1., 2., ...) and a specific declaration
  // opener that names the trust. Subsection ordering is: Personal Property,
  // Real Property, Accounts/Cash, Business Interests, Life Insurance,
  // Vehicles, Other (matches exhibitA.js).
  // -------------------------------------------------------------------------
  {
    id: 'soa-exhibit-a-header',
    name: 'SoA — Exhibit A Declaration',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['schedule-of-assets'],
    tags: ['schedule-of-assets'],
    purpose: 'Exhibit A opening declaration. Matches exhibitA.js — "The Settlor(s) of the trust known as [trust_name] ("Trust") declare(s) that the Trust Property of the Trust includes the following:"',
    ast: doc(
      h(2, t('Exhibit A — Schedule of Assets')),
      p(
        t('The Settlor'),
        vref('settlor_plural', ''),
        t(' of the trust known as '),
        vref('trust_name', 'the Trust'),
        t(' ("Trust") declare'),
        vref('settlor_singular_verb', 's'),
        t(' that the Trust Property of the Trust includes the following:'),
      ),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'soa-personal-property',
    name: 'SoA — Personal Property',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['schedule-of-assets'],
    tags: ['schedule-of-assets', 'personal-property'],
    purpose: 'First Exhibit A subsection (subsecAPersonalProperty.js). Single paragraph — NOT a list — covering all tangible personal property generically.',
    ast: doc(
      p(t('Personal Property', [{ type: 'bold' }])),
      p(
        t('Any and all tangible personal property owned by '),
        vref('testator.name'),
        t(', including any tangible personal property located in or around any residence of '),
        vref('testator.name'),
        t('.'),
      ),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'soa-real-property',
    name: 'SoA — Real Property',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['schedule-of-assets'],
    tags: ['schedule-of-assets', 'real-estate'],
    purpose: 'Matches subsecBRealProperty.js: numbered list. Item text uses pre-derived soa_display from toBinding (analog of the legacy generator\'s inline string-build).',
    ast: doc(
      p(t('Real Property', [{ type: 'bold' }])),
      p(t('Any and all interest in the following real property:')),
      { type: 'orderedList', content: [
        loop('realEstate', 'p', 'block',
          { type: 'listItem', content: [p(vref('p.soa_display'))] },
        ),
      ]},
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'soa-accounts-cash',
    name: 'SoA — Accounts, Cash, and Cash Equivalents',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['schedule-of-assets'],
    tags: ['schedule-of-assets', 'financial-accounts'],
    purpose: 'Matches subsecCAccountsCashAndCashEquivalents.js exact opener text. Each account renders a primary line + optional type-display secondary line.',
    ast: doc(
      p(t('Accounts, Cash, and Cash Equivalents', [{ type: 'bold' }])),
      p(t('Any and all cash, stocks, bonds, securities, financial assets, or other assets held in the following accounts:')),
      { type: 'orderedList', content: [
        loop('financialAccounts', 'a', 'block',
          { type: 'listItem', content: [
            p(vref('a.soa_display')),
            p(vref('a.soa_secondary', '')),
          ]},
        ),
      ]},
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'soa-business-interests',
    name: 'SoA — Business Interests',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['schedule-of-assets'],
    tags: ['schedule-of-assets', 'business'],
    purpose: 'Matches subsecDBusinessInterests.js. Opener says "entities" not "businesses". Pre-derived soa_display has the full "[name], the [sub_type] formed in [state], with the following descriptive information: [value]." line.',
    ast: doc(
      p(t('Business Interests', [{ type: 'bold' }])),
      p(t('Any and all interest in the following entities:')),
      { type: 'orderedList', content: [
        loop('businessInterests', 'b', 'block',
          { type: 'listItem', content: [p(vref('b.soa_display'))] },
        ),
      ]},
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'soa-life-insurance',
    name: 'SoA — Life Insurance',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['schedule-of-assets'],
    tags: ['schedule-of-assets', 'life-insurance'],
    purpose: 'Matches subsecELifeInsurance.js opener verbatim — including the original "polices" typo from the legacy code.',
    ast: doc(
      p(t('Life Insurance', [{ type: 'bold' }])),
      p(t('Any and all interest in the following life insurance polices:')),
      { type: 'orderedList', content: [
        loop('lifeInsurance', 'p', 'block',
          { type: 'listItem', content: [
            p(vref('p.soa_display')),
            p(vref('p.soa_secondary', '')),
          ]},
        ),
      ]},
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'soa-vehicles',
    name: 'SoA — Vehicles',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['schedule-of-assets'],
    tags: ['schedule-of-assets', 'vehicles'],
    purpose: 'Matches subsecGVehicles.js: "The [year] [make] [model]." format via pre-derived soa_display.',
    ast: doc(
      p(t('Vehicles', [{ type: 'bold' }])),
      p(t('Any and all interest in the following vehicles:')),
      { type: 'orderedList', content: [
        loop('vehicles', 'v', 'block',
          { type: 'listItem', content: [p(vref('v.soa_display'))] },
        ),
      ]},
    ),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'soa-other',
    name: 'SoA — Other',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['schedule-of-assets'],
    tags: ['schedule-of-assets'],
    purpose: 'Matches subsecFOther.js: header is "Other" (not "Other Personal Property"); opener says "assets" not "personal property".',
    ast: doc(
      p(t('Other', [{ type: 'bold' }])),
      p(t('Any and all interest in the following assets:')),
      { type: 'orderedList', content: [
        loop('otherAssets', 'i', 'block',
          { type: 'listItem', content: [p(vref('i.soa_display'))] },
        ),
      ]},
    ),
    createdAt: now(),
    updatedAt: now(),
  },

  {
    id: 'poa-revocation',
    name: 'POA — Revocation',
    version: '1.0.0',
    status: 'published',
    applicableTo: ['poa'],
    tags: ['revocation'],
    ast: doc(
      h(3, t('Revocation')),
      p(t('I may revoke this Power of Attorney at any time by signing a written instrument of revocation and providing actual notice of the revocation to my Agent and to any third party who has acted in reliance on this Power of Attorney. This Power of Attorney is automatically revoked upon my death. Revocation shall not affect any actions taken by my Agent in good faith prior to my Agent receiving actual notice of revocation.')),
    ),
    createdAt: now(),
    updatedAt: now(),
  },
];

// ---------------------------------------------------------------------------
// Variable schema for the Will template
// ---------------------------------------------------------------------------

const WILL_VARIABLES: VariableDef[] = [
  { name: 'testator', displayName: 'Testator', type: 'person', path: 'testator', required: true, description: 'Person making the Will. The Person\'s state field is used as state of residence.' },
  { name: 'has-spouse', displayName: 'Has spouse?', type: 'boolean', path: 'hasSpouse', required: true },
  { name: 'spouse', displayName: 'Spouse', type: 'person', path: 'spouse', description: 'Required only if Has spouse is true.' },
  { name: 'has-children', displayName: 'Has children?', type: 'boolean', path: 'hasChildren', required: true },
  { name: 'children', displayName: 'Children', type: 'person-array', path: 'children' },
  { name: 'guardian-primary', displayName: 'Primary guardian', type: 'person', path: 'guardians.primary' },
  { name: 'guardian-backups', displayName: 'Backup guardians', type: 'person-array', path: 'guardians.backups' },
  { name: 'executor-primary', displayName: 'Primary executor', type: 'person', path: 'executors.primary', required: true },
  { name: 'executor-backups', displayName: 'Backup executors', type: 'person-array', path: 'executors.backups' },
  { name: 'distribution-method', displayName: 'Distribution method', type: 'enum', path: 'distributionMethod', enumValues: ['spouse-or-descendants', 'descendants-only', 'no-family', 'named-recipients'], required: true },
  { name: 'estate-distribution-recipients', displayName: 'Residuary recipients (named, %)', type: 'array', path: 'estateDistributionRecipients', itemSchema: [{ name: 'percentage_line', displayName: 'Line', type: 'string', path: 'percentage_line' }], description: 'Used when distributionMethod = named-recipients. Each line is a preformatted "N% to Name;" / "...and" / "..." string from the BindingsResolver.' },
  { name: 'has-contingent-beneficiaries', displayName: 'Has contingent beneficiaries?', type: 'boolean', path: 'hasContingentBeneficiaries' },
  { name: 'contingent-beneficiaries', displayName: 'Contingent beneficiaries (named, %)', type: 'array', path: 'contingentBeneficiaries', itemSchema: [{ name: 'percentage_line', displayName: 'Line', type: 'string', path: 'percentage_line' }] },
  { name: 'does-exclude', displayName: 'Explicitly disinherit named persons?', type: 'boolean', path: 'doesExclude' },
  { name: 'disinherited-names-joined', displayName: 'Disinherited names (joined)', type: 'string', path: 'disinherited_names_joined' },

  // ---- Charity ----
  { name: 'has-charity', displayName: 'Has charity?', type: 'boolean', path: 'hasCharity' },
  { name: 'charity', displayName: 'Charitable bequests', type: 'array', path: 'charity', itemSchema: [
    { name: 'name', displayName: 'Charity name', type: 'string', path: 'name' },
    { name: 'ein_phrase', displayName: 'EIN phrase', type: 'string', path: 'ein_phrase' },
    { name: 'contribution_phrase', displayName: 'Contribution', type: 'string', path: 'contribution_phrase' },
  ]},

  // ---- Digital Executor ----
  { name: 'digital-executor-primary', displayName: 'Primary digital executor', type: 'person', path: 'digitalExecutors.primary' },
  { name: 'digital-executor-backups', displayName: 'Backup digital executors', type: 'person-array', path: 'digitalExecutors.backups' },

  // ---- Final arrangements ----
  { name: 'has-final-arrangements', displayName: 'Has final arrangement preferences?', type: 'boolean', path: 'hasFinalArrangements' },
  { name: 'body-disposal-preference', displayName: 'Body disposal (verb phrase)', type: 'string', path: 'bodyDisposalPreference', description: 'Inserted after "I direct that my body..." — e.g., "be cremated".' },
  { name: 'service-preference', displayName: 'Service preference (noun phrase)', type: 'string', path: 'servicePreference', description: 'Inserted after "I direct that..." — e.g., "a funeral be held at a cemetery".' },
  { name: 'final-arrangement-note', displayName: 'Special-request note (optional)', type: 'string', path: 'finalArrangementNote' },

  // ---- Guardianship toggle ----
  { name: 'appoint-child-guardians', displayName: 'Appoint guardians for minor children?', type: 'boolean', path: 'appointChildGuardians' },

  // ---- Appendix arrays ----
  { name: 'appendix-executors', displayName: 'Appendix — executors', type: 'person-array', path: 'appendix_executors' },
  { name: 'appendix-guardians', displayName: 'Appendix — guardians', type: 'person-array', path: 'appendix_guardians' },
  { name: 'appendix-digital-executors', displayName: 'Appendix — digital executors', type: 'person-array', path: 'appendix_digital_executors' },
  { name: 'appendix-gift-recipients', displayName: 'Appendix — gift recipients', type: 'array', path: 'appendix_gift_recipients', itemSchema: [
    { name: 'name', displayName: 'Name', type: 'string', path: 'name' },
    { name: 'email', displayName: 'Email', type: 'string', path: 'email' },
  ]},

  // ---- Inventory + Specific Gifts ----
  { name: 'has-specific-gifts', displayName: 'Has specific gifts?', type: 'boolean', path: 'hasSpecificGifts', description: 'When true, the Specific Gifts article (Article III) renders.' },
  { name: 'asset-gifts', displayName: 'Asset gifts (gifted inventory items)', type: 'asset-array', path: 'assetGifts', description: 'Inventory items flagged as gifts. Each renders with its gift_display narrative.' },
  { name: 'specific-gifts', displayName: 'Specific gifts (named items)', type: 'array', path: 'specificGifts', itemSchema: [{ name: 'gift', displayName: 'Gift', type: 'string', path: 'gift' }, { name: 'recipient', displayName: 'Recipient', type: 'string', path: 'recipient' }], description: 'Gifts of named items not in the inventory.' },
];

// ---------------------------------------------------------------------------
// Will Template AST
// Structure mirrors RFC §3.1's worked example: a list of clause_refs and
// conditionals composing the Will.
// ---------------------------------------------------------------------------

// Will template matches tw-pdf-svc/Will/pageOne.js through pageEight.js + AppendixMyPeople.js:
// unnumbered section headers (no "Article N" prefixes), section ordering pulled
// straight from the page files. Each section uses conditional clause_refs so
// state-specific or scenario-specific text only appears when applicable.
const WILL_TEMPLATE_AST: PMDoc = doc(
  // Title page
  h(1, t('Last Will & Testament of '), vref('testator.name')),

  // PDF page 2 opening
  cref('revocation-of-prior-wills'),

  // ---- Family Information ----
  h(2, t('Family Information')),
  cond('hasSpouse', 'If married',
    cref('family-info-spouse'),
  ),
  cond('hasChildren', 'If has children',
    cref('family-info-children-named'),
  ),
  cond('hasSpouse', 'If married — disclaimer of mutual-will contract',
    cref('family-info-no-contract'),
  ),

  // ---- Guardianship (if has children) ----
  cond('hasChildren && appointChildGuardians', 'If has children + appoints guardians',
    h(2, t('Guardianship')),
    cref('guardianship-children'),
    cref('guardianship-bond'),
    cref('guardianship-temporary'),
    cref('adopted-descendants'),
  ),

  // ---- Specific Gifts ----
  cond('hasSpecificGifts', 'If has specific gifts',
    h(2, t('Specific Gifts')),
    cref('specific-gifts-opening'),
    cond('assetGifts.length > 0', 'Asset-based gifts',
      cref('specific-gifts-asset-gifts'),
    ),
    cond('specificGifts.length > 0', 'Named-item gifts',
      cref('specific-gifts-named-recipients'),
    ),
    cref('specific-gifts-closing'),
  ),

  // ---- Charity ----
  cond('hasCharity', 'If has charity',
    cref('charity'),
  ),

  // ---- Distribution of Estate ----
  h(2, t('Distribution of Estate')),
  cond('hasSpecificGifts || hasCharity', 'Has prior gifts',
    cref('distribution-preamble-with-gifts'),
  ),
  cond('!hasSpecificGifts && !hasCharity', 'No prior gifts',
    cref('distribution-preamble-no-gifts'),
  ),
  cond("distributionMethod == 'spouse-or-descendants'", 'Spouse + descendants',
    cref('distribution-residuary-spouse-or-descendants'),
  ),
  cond("distributionMethod == 'descendants-only'", 'Descendants only',
    cref('distribution-residuary-descendants-only'),
  ),
  cond("distributionMethod == 'no-family'", 'No family — heirs at law',
    cref('distribution-residuary-no-spouse-no-children'),
  ),
  cond("distributionMethod == 'named-recipients'", 'Custom named recipients with percentages',
    cref('distribution-residuary-named-recipients'),
  ),
  cond('hasContingentBeneficiaries', 'If has contingent beneficiaries',
    cref('contingent-distribution'),
  ),
  cref('disinheritance'),
  cref('estate-details'),
  cond('hasSpouse', 'If married — remote contingent (married)',
    cref('remote-contingent-distribution-married'),
  ),
  cond('!hasSpouse', 'If single — remote contingent (single)',
    cref('remote-contingent-distribution-single'),
  ),
  cref('survivorship'),

  // ---- Executor of Estate ----
  // Header term swaps per state — Michigan etc. render "Personal Representative of Estate".
  h(2, dterm('executor', 'Executor'), t(' of Estate')),
  cref('executor-nomination'),
  cref('executor-powers'),
  cref('executor-payment-options'),
  cref('executor-minor-utma'),
  cref('executor-in-addition-powers'),
  cond("testator.state == 'California'", 'CA only — Independent Admin',
    cref('executor-independent-admin-ca'),
  ),
  cref('executor-bond'),
  cref('executor-bond-waiver'), // (clause is now the Compensation subsection — ID retained)

  // ---- Digital Executor ----
  h(2, t('Digital Executor')),
  cref('digital-executor-nomination'),
  cref('digital-executor-empowered'),
  cref('digital-executor-auth'),
  cref('digital-executor-purpose'),
  cref('digital-executor-powers-6'),
  cref('digital-executor-closing'),

  // ---- Taxes, Claims, Debts, and Expenses ----
  h(2, t('Taxes, Claims, Debts, and Expenses')),
  cref('taxes-claims-debts-expenses'),

  // ---- General Provisions ----
  h(2, t('General Provisions')),
  cref('general-provisions-opening'),
  cref('severability'),
  cref('no-contest'),
  cref('gender-grammatical-number'),

  // ---- Final Arrangements ----
  cond('hasFinalArrangements', 'If user expressed final arrangements',
    h(2, t('Final Arrangements')),
    cref('final-arrangements-will'),
  ),

  // ---- Execution ----
  sigBlock('will-testator-witnesses'),
  sigBlock('will-self-proving-affidavit'),

  // ---- Appendix — My People ----
  cref('appendix-my-people-intro'),
  cref('appendix-executors-list'),
  cond('hasChildren && appointChildGuardians', 'If guardianship section was rendered',
    cref('appendix-guardians-list'),
  ),
  cref('appendix-digital-executors-list'),
  cond('hasSpecificGifts', 'If gifts were rendered',
    cref('appendix-gift-recipients-list'),
  ),
);

// ---------------------------------------------------------------------------
// Healthcare Directive variables + template
// ---------------------------------------------------------------------------

const HCD_VARIABLES: VariableDef[] = [
  { name: 'testator', displayName: 'Principal (declarant)', type: 'person', path: 'testator', required: true },
  { name: 'primaryHCAgent', displayName: 'Primary Health Care Agent', type: 'person', path: 'primaryHCAgent', required: true },
  { name: 'backupHCAgents', displayName: 'Alternate Health Care Agents', type: 'person-array', path: 'backupHCAgents' },
  {
    name: 'typeOfCare',
    displayName: 'End-of-life care option (Option 1–4)',
    type: 'enum',
    path: 'typeOfCare',
    enumValues: ['option-1', 'option-2', 'option-3', 'option-4'],
    required: true,
    description: 'Drives which of four End-of-Life Decisions clauses is selected. Option 1 = care in all cases. Option 2 = benefits outweigh burdens. Option 3 = benefits outweigh burdens UNLESS in Terminal/Coma/Brain Damage. Option 4 = refuse life-sustaining.',
  },
  { name: 'donateOrgans', displayName: 'Authorize organ donation?', type: 'boolean', path: 'donateOrgans', required: true },
  { name: 'instructionsNote', displayName: 'Special instructions (free text)', type: 'string', path: 'instructionsNote' },
];

// Structured to mirror the real Trust & Will Advance Healthcare Directive PDF
// exactly — no Article numbering, sections appear in PDF order, all 4 EOL
// options + initial-line preambles + General Provisions for Care, Definitions,
// and the full 10-subsection General Provisions block.
const HCD_TEMPLATE_AST: PMDoc = doc(
  // Title page (PDF page 1)
  h(1, t('Advance Healthcare Directive for '), vref('testator.name')),
  p(t('Living Will', [{ type: 'bold' }])),

  // PDF page 2: opening + identity + agent designation
  cref('hcd-make-this-directive'),
  cref('hcd-personal-information'),
  cref('hcd-designation-primary-agent'),
  cond('backupHCAgents.length > 0', 'If has alternate agents',
    cref('hcd-designation-backup-agents'),
  ),

  // PDF pages 3-4: powers list + special instructions
  cref('hcd-powers-list-8'),
  cref('hcd-special-instructions-limitations'),

  // PDF page 5: effectiveness + additional provisions
  cref('hcd-effectiveness'),
  cref('hcd-additional-provisions'),

  // PDF pages 6-9: instructions for health care + general provisions for care
  // + end-of-life options
  cref('hcd-intent-statement'),
  cref('hcd-general-provisions-for-care'),
  cref('hcd-eol-intro'),
  cond("typeOfCare == 'option-1'", 'Option 1 — care in all cases',
    cref('hcd-eol-in-all-cases'),
  ),
  cond("typeOfCare == 'option-2'", 'Option 2 — benefits outweigh burdens',
    cref('hcd-eol-benefits-outweigh'),
  ),
  cond("typeOfCare == 'option-3'", 'Option 3 — benefits outweigh, with exceptions',
    cref('hcd-eol-if-benefits-outweigh-burden'),
  ),
  cond("typeOfCare == 'option-4'", 'Option 4 — refuse life-sustaining',
    cref('hcd-eol-only-if-will-improve'),
  ),

  // PDF page 9: definitions
  cref('hcd-definitions'),

  // PDF page 10: post-death authority
  cref('hcd-autopsy'),
  cref('hcd-organ-donation-intro'),
  cond('donateOrgans', 'If authorizes donation',
    cref('hcd-organ-donation-yes'),
  ),
  cond('!donateOrgans', 'If refuses donation',
    cref('hcd-organ-donation-no'),
  ),
  cref('hcd-final-arrangements'),

  // PDF pages 11-13: general provisions (10 subsections)
  cref('hcd-agent-authority'),
  cref('hcd-limitations-on-authority'),
  cref('hcd-release-of-medical-info'),
  cref('hcd-agent-compensation'),
  cref('hcd-retention-of-rights'),
  cref('hcd-revocation-of-document'),
  cref('hcd-resignation-of-agent'),
  cref('hcd-release-of-agent'),
  cref('hcd-copies-and-effect'),
  cref('hcd-severability'),

  // PDF pages 14-15: signature + witnesses
  sigBlock('hcd-testator'),
  sigBlock('hcd-witnesses'),
);

// ---------------------------------------------------------------------------
// HIPAA Authorization variables + template
// ---------------------------------------------------------------------------

const HIPAA_VARIABLES: VariableDef[] = [
  { name: 'testator', displayName: 'Principal', type: 'person', path: 'testator', required: true },
  { name: 'primaryHCAgent', displayName: 'Primary Personal Representative', type: 'person', path: 'primaryHCAgent', required: true, description: 'Reuses the HC Agent binding; in a HIPAA-only doc the primary representative may be set independently.' },
  { name: 'backupHCAgents', displayName: 'Additional Personal Representatives', type: 'person-array', path: 'backupHCAgents' },
];

// ---------------------------------------------------------------------------
// Schedule of Assets variables + template
// Source: tw-pdf-svc/ScheduleOfAssets/sections/exhibitA/**
// ---------------------------------------------------------------------------

const SOA_VARIABLES: VariableDef[] = [
  { name: 'testator', displayName: 'Principal / trustor', type: 'person', path: 'testator', required: true },
  { name: 'realEstate', displayName: 'Real estate', type: 'asset-array', path: 'realEstate' },
  { name: 'financialAccounts', displayName: 'Financial accounts', type: 'asset-array', path: 'financialAccounts' },
  { name: 'businessInterests', displayName: 'Business interests', type: 'asset-array', path: 'businessInterests' },
  { name: 'lifeInsurance', displayName: 'Life insurance policies', type: 'asset-array', path: 'lifeInsurance' },
  { name: 'vehicles', displayName: 'Vehicles', type: 'asset-array', path: 'vehicles' },
  { name: 'otherAssets', displayName: 'Other personal property', type: 'asset-array', path: 'otherAssets' },
];

// Matches tw-pdf-svc/ScheduleOfAssets/sections/exhibitA/exhibitA.js subsection
// ordering: A Personal Property -> B Real Property -> C Accounts -> D Business
// -> E Life Insurance -> G Vehicles -> F Other.
// Note that Vehicles (G) is emitted before Other (F) in the legacy code — we
// preserve that ordering.
const SOA_TEMPLATE_AST: PMDoc = doc(
  h(1, t('Schedule of Assets — '), vref('testator.name')),
  cref('soa-exhibit-a-header'),
  cref('soa-personal-property'),
  cond('realEstate.length > 0', 'Real estate exists', cref('soa-real-property')),
  cond('financialAccounts.length > 0', 'Financial accounts exist', cref('soa-accounts-cash')),
  cond('businessInterests.length > 0', 'Business interests exist', cref('soa-business-interests')),
  cond('lifeInsurance.length > 0', 'Life insurance exists', cref('soa-life-insurance')),
  cond('vehicles.length > 0', 'Vehicles exist', cref('soa-vehicles')),
  cond('otherAssets.length > 0', 'Other assets exist', cref('soa-other')),
  h(2, t('Execution')),
  p(t('Signed and acknowledged by the trustor as the schedule of assets accompanying their trust instrument.')),
  sigBlock('poa-testator'),
);

// ---------------------------------------------------------------------------
// Financial Durable POA variables + template
// ---------------------------------------------------------------------------

const POA_VARIABLES: VariableDef[] = [
  { name: 'testator', displayName: 'Principal', type: 'person', path: 'testator', required: true },
  { name: 'financialAgent', displayName: 'Primary Agent (attorney-in-fact)', type: 'person', path: 'financialAgent', required: true },
  { name: 'backupFinancialAgents', displayName: 'Successor Agents', type: 'person-array', path: 'backupFinancialAgents' },
  {
    name: 'effectiveness',
    displayName: 'Effectiveness',
    type: 'enum',
    path: 'effectiveness',
    enumValues: ['immediate', 'springing'],
    required: true,
    description: 'Immediate = agent can act on day one. Springing = agent only acts upon defined incapacity trigger.',
  },
  { name: 'springingTrigger', displayName: 'Springing trigger language', type: 'string', path: 'springingTrigger', description: 'Free-text definition of the incapacity threshold. Used only when effectiveness = springing.' },
  { name: 'grantRealEstate', displayName: 'Grant real estate powers?', type: 'boolean', path: 'grantRealEstate' },
  { name: 'grantBanking', displayName: 'Grant banking powers?', type: 'boolean', path: 'grantBanking' },
  { name: 'grantInvestments', displayName: 'Grant investment powers?', type: 'boolean', path: 'grantInvestments' },
  { name: 'grantTaxes', displayName: 'Grant tax powers?', type: 'boolean', path: 'grantTaxes' },
  { name: 'grantRetirement', displayName: 'Grant retirement-plan powers?', type: 'boolean', path: 'grantRetirement' },
  { name: 'grantInsurance', displayName: 'Grant insurance powers?', type: 'boolean', path: 'grantInsurance' },
  { name: 'grantGifts', displayName: 'Grant gift-giving power? (HOT POWER)', type: 'boolean', path: 'grantGifts', description: 'Gift-giving is a "hot power" requiring express authorization in most states. Use with care.' },
  { name: 'giftLimitAnnual', displayName: 'Annual gift limit per donee', type: 'string', path: 'giftLimitAnnual', description: 'Only used if gift power is granted. Typically aligned to the federal gift-tax annual exclusion.' },
];

const POA_TEMPLATE_AST: PMDoc = doc(
  h(1, t('Durable Power of Attorney of '), vref('testator.name')),

  cref('poa-declaration-principal'),

  h(2, t('Article I — Agent Designation')),
  cref('poa-designation-agent'),
  cond('backupFinancialAgents.length > 0', 'If has successor agents',
    cref('poa-designation-backup-agents'),
  ),

  h(2, t('Article II — Effectiveness and Durability')),
  cond("effectiveness == 'immediate'", 'Immediate POA',
    cref('poa-effective-immediate'),
  ),
  cond("effectiveness == 'springing'", 'Springing POA',
    cref('poa-effective-springing'),
  ),
  cref('poa-durability'),

  h(2, t('Article III — Powers Granted')),
  cref('poa-powers-general'),
  cond('grantRealEstate', '',
    cref('poa-powers-real-estate'),
  ),
  cond('grantBanking', '',
    cref('poa-powers-banking'),
  ),
  cond('grantInvestments', '',
    cref('poa-powers-investments'),
  ),
  cond('grantTaxes', '',
    cref('poa-powers-taxes'),
  ),
  cond('grantRetirement', '',
    cref('poa-powers-retirement'),
  ),
  cond('grantInsurance', '',
    cref('poa-powers-insurance'),
  ),
  cond('grantGifts', 'Hot power — only if explicitly granted',
    cref('poa-powers-gifts'),
  ),

  h(2, t('Article IV — Agent Duties and Limitations')),
  cref('poa-no-self-dealing-default'),
  cref('poa-agent-compensation'),

  h(2, t('Article V — Third-Party Reliance and Revocation')),
  cref('poa-third-party-reliance'),
  cref('poa-revocation'),

  h(2, t('Article VI — General Provisions')),
  cref('governing-law'),
  cref('severability'),

  h(2, t('Article VII — Execution')),
  p(
    t('I sign this Durable Power of Attorney on this day, in the State of '),
    vref('testator.state'),
    t('. I intend this instrument to take effect as set forth above.'),
  ),
  // POA execution = (1) signature & acknowledgment block, (2) full notary block
  sigBlock('poa-testator'),
  sigBlock('poa-notary'),
);

// Matches tw-pdf-svc/HIPAA/hipaaDoc.js. Real title is "Authorization to Release
// Medical Information for [name]"; "HIPAA Authorization" is the subtitle.
const HIPAA_TEMPLATE_AST: PMDoc = doc(
  // Title page
  h(1, t('Authorization to Release Medical Information for '), vref('testator.name')),
  p(t('HIPAA Authorization', [{ type: 'bold' }])),

  // PDF page 2
  cref('hipaa-opening-declaration'),
  cref('hipaa-designation-representatives'),
  cref('hipaa-definitions'),
  cref('hipaa-purpose'),
  cref('hipaa-expiration'),
  cref('hipaa-revocation'),
  cref('hipaa-additional-provisions'),

  // HIPAA = testator signature only; no witnesses, no notary
  sigBlock('hipaa-testator'),
);

export const SEED_TEMPLATES: Template[] = [
  {
    id: 'will-simple-v1',
    name: 'Simple Last Will & Testament',
    instrumentType: 'will',
    jurisdiction: undefined,
    version: '1.0.0',
    status: 'published',
    ast: WILL_TEMPLATE_AST,
    variables: WILL_VARIABLES,
    purpose: 'A jurisdiction-aware simple Will that composes clauses based on marital status, children, and state of residence.',
    tags: ['will', 'multi-state'],
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'hcd-v1',
    name: 'Advance Health Care Directive',
    instrumentType: 'healthcare-directive',
    jurisdiction: undefined,
    version: '1.0.0',
    status: 'published',
    ast: HCD_TEMPLATE_AST,
    variables: HCD_VARIABLES,
    purpose: 'Living Will + Health Care Power of Attorney combined. Three end-of-life care preferences drive clause selection; organ donation is a binary conditional.',
    tags: ['healthcare', 'advance-directive', 'multi-state'],
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'hipaa-v1',
    name: 'HIPAA Authorization',
    instrumentType: 'healthcare-directive',
    jurisdiction: undefined,
    version: '1.0.0',
    status: 'published',
    ast: HIPAA_TEMPLATE_AST,
    variables: HIPAA_VARIABLES,
    purpose: 'Standalone HIPAA Authorization. Often executed alongside an Advance Health Care Directive but is its own legal artifact.',
    tags: ['healthcare', 'hipaa'],
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'schedule-of-assets-v1',
    name: 'Schedule of Assets',
    instrumentType: 'trust',
    jurisdiction: undefined,
    version: '1.0.0',
    status: 'published',
    ast: SOA_TEMPLATE_AST,
    variables: SOA_VARIABLES,
    purpose: 'Exhibit A — the full inventory listing that accompanies a Trust. Demonstrates a doc where the entire body is loops over inventory item arrays grouped by type, matching tw-pdf-svc/ScheduleOfAssets/exhibitA/.',
    tags: ['trust', 'inventory', 'exhibit-a'],
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'poa-financial-durable-v1',
    name: 'Financial Durable Power of Attorney',
    instrumentType: 'poa',
    jurisdiction: undefined,
    version: '1.0.0',
    status: 'published',
    ast: POA_TEMPLATE_AST,
    variables: POA_VARIABLES,
    purpose: 'T&W-authored Financial Durable Power of Attorney. Demonstrates state-variant handling via clause composition + multi-toggle granular power grants. Distinct from the state-form overlay path in tw-pdf-svc/POA/*, which stamps text onto official state-issued forms.',
    tags: ['poa', 'financial', 'durable', 'multi-state'],
    createdAt: now(),
    updatedAt: now(),
  },
];

// Sample bindings built from the seeded People library. Looked up lazily so
// people.ts has a chance to seed first. Each Person is materialized via
// `toBinding()` so the resolver gets `.name` and `.full_address` synthesized.
export function buildSampleBindings() {
  const people = getPeople();
  const byGuid = (guid: string): PersonBinding | undefined => {
    const p = people.find(p => p.guid === guid);
    return p ? toBinding(p) : undefined;
  };

  // Sample children — note these are real Person records, materialized through
  // toBinding so they carry .name, .full_address, etc. Used by the derived
  // children_named_list / count fields below.
  const childrenList = [byGuid('p-johnny-smith'), byGuid('p-sally-smith')].filter(Boolean) as PersonBinding[];
  const childNames = childrenList.map(c => c.name);

  // Labels backup HC agents with "First Alternate Agent" / "Second Alternate
  // Agent" matching the real PDF page 2-3 ordinal headers.
  const ordinalAgent = ['First', 'Second', 'Third', 'Fourth', 'Fifth'];
  const labeledHCBackups = ([byGuid('p-tom-smith'), byGuid('p-margaret-cornerstone')].filter(Boolean) as PersonBinding[])
    .map((p, i) => ({ ...p, alternate_label: `${ordinalAgent[i]} Alternate Agent` }));

  // Will-side executors. Use the same Smith family people.
  const willExecutorsPrimary = byGuid('p-jane-smith');
  const willExecutorsBackups = [byGuid('p-george-moss'), byGuid('p-bill-cornerstone')].filter(Boolean) as PersonBinding[];
  const willGuardiansPrimary = byGuid('p-jane-smith');
  const willGuardiansBackups = [byGuid('p-tom-smith'), byGuid('p-margaret-cornerstone')].filter(Boolean) as PersonBinding[];

  // Digital executors — match the regular executors by default (the real
  // generator's `executors_are_digital_executors` shortcut).
  const digitalPrimary = willExecutorsPrimary;
  const digitalBackups = willExecutorsBackups;

  return {
    // ---- Will bindings ----
    testator: byGuid('p-john-smith'),
    hasSpouse: true,
    spouse: byGuid('p-jane-smith'),
    hasChildren: true,
    children: childrenList,
    // Derived fields for the family-info-children-named clause. In production
    // these come from the BindingsResolver step (analog of
    // helperFunctions.getListOfNamesAsString in tw-pdf-svc).
    children_named_list: joinNames(childNames),
    children_count_word: numberWord(childrenList.length),
    children_count_word_form: childrenList.length === 1 ? 'child' : 'children',
    appointChildGuardians: true,
    guardians: {
      primary: willGuardiansPrimary,
      backups: willGuardiansBackups,
    },
    executors: {
      primary: willExecutorsPrimary,
      backups: willExecutorsBackups,
    },
    digitalExecutors: {
      primary: digitalPrimary,
      backups: digitalBackups,
    },
    distributionMethod: 'spouse-or-descendants',
    estateDistributionRecipients: [],
    hasContingentBeneficiaries: true,
    contingentBeneficiaries: [
      { percentage_line: '50% to Johnny Smith; and' },
      { percentage_line: '50% to Sally Smith.' },
    ],
    doesExclude: false,
    disinherited_names_joined: '',
    hasCharity: true,
    charity: [
      { name: 'Doctors Without Borders', ein_phrase: ', EIN 13-3433452', contribution_phrase: '$500' },
    ],
    hasFinalArrangements: true,
    bodyDisposalPreference: 'be cremated',
    servicePreference: 'a funeral be held at a cemetery',
    finalArrangementNote: '',

    // Appendix arrays — full PersonBindings (not bare {name,email}) so the
    // bindings form's person-array picker can preselect them, and so the
    // appendix-*-list clauses can use `.name` / `.email` / any other field
    // on Person. Equivalent of getAppendixReadyExecutors /
    // getAppendixReadyGuardians from tw-pdf-svc, but returning Persons
    // directly instead of bare display objects.
    appendix_executors: [byGuid('p-jane-smith'), byGuid('p-george-moss'), byGuid('p-bill-cornerstone')].filter(Boolean),
    appendix_guardians: [byGuid('p-jane-smith'), byGuid('p-tom-smith'), byGuid('p-margaret-cornerstone')].filter(Boolean),
    appendix_digital_executors: [byGuid('p-jane-smith'), byGuid('p-george-moss'), byGuid('p-bill-cornerstone')].filter(Boolean),
    appendix_gift_recipients: [byGuid('p-tom-smith'), byGuid('p-sally-smith'), byGuid('p-margaret-cornerstone'), byGuid('p-johnny-smith')].filter(Boolean),

    // ---- Healthcare Directive bindings ----
    primaryHCAgent: byGuid('p-jane-smith'),
    backupHCAgents: labeledHCBackups,
    typeOfCare: 'option-3',
    donateOrgans: true,
    instructionsNote: 'I would like my family to remain with me to the extent possible, and to coordinate with my faith community for any end-of-life prayers or rituals.',

    // ---- HIPAA Representatives ----
    // Real HIPAA form has up to 3 labeled "Representative One/Two/Three" slots
    // followed by 3 categorical bullets (matches HIPAA/sections/section1).
    // Build the labeled list from primary HC agent + backups, capped at 3.
    hipaaRepresentatives: ([byGuid('p-jane-smith'), byGuid('p-tom-smith'), byGuid('p-margaret-cornerstone')]
      .filter(Boolean) as PersonBinding[])
      .slice(0, 3)
      .map((p, i) => ({ ...p, label: `Representative ${['One', 'Two', 'Three'][i]}` })),

    // ---- Estate Inventory bindings ----
    // Materialize the entire inventory through toInventoryBinding so resolver
    // gets gift_display + ownership_display + soa_display synthesized fields.
    ...buildInventoryBindings(),

    // ---- Schedule of Assets header bindings ----
    trust_name: 'The Smith Family Trust',
    settlor_plural: '',        // empty for single settlor; 's' if joint
    settlor_singular_verb: 's', // "declares" for single; empty for joint ("declare")

    // Specific gifts of named items (jewelry, mementos, etc.) — not from the
    // inventory store; these are free-text recipient/gift pairs.
    specificGifts: [
      { gift: 'my grandfather\'s pocket watch', recipient: 'Johnny Smith' },
      { gift: 'my coin collection', recipient: 'Sally Smith' },
    ],
    hasSpecificGifts: true,

    // ---- Financial Durable POA bindings ----
    financialAgent: byGuid('p-jane-smith'),
    backupFinancialAgents: [byGuid('p-tom-smith'), byGuid('p-george-moss')].filter(Boolean),
    effectiveness: 'immediate',
    springingTrigger: 'written certification of two licensed physicians, at least one of whom has personally examined me, that I am unable to manage my financial affairs by reason of physical or mental incapacity',
    grantRealEstate: true,
    grantBanking: true,
    grantInvestments: true,
    grantTaxes: true,
    grantRetirement: true,
    grantInsurance: true,
    grantGifts: false,
    giftLimitAnnual: '$18,000',
  };
}

// ---------------------------------------------------------------------------
// BindingsResolver helpers — mirror tw-pdf-svc/HelperFunctions equivalents.
// In production these would live in a server-side resolver; here they run at
// sample-bindings build time so the resolver only sees the post-derivation
// shape.
// ---------------------------------------------------------------------------
function joinNames(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

function numberWord(n: number): string {
  const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  return words[n] ?? String(n);
}

// Legacy export so callers don't need to know about lazy construction.
export const SAMPLE_BINDINGS_GETTER = buildSampleBindings;

// ---------------------------------------------------------------------------
// Michigan preset — exercises the defined_term flow. Same Will template +
// bindings shape as buildSampleBindings, but the testator is Patricia Miller
// (Michigan). The TERM_DICTIONARY override for MI swaps every "Executor"
// rendering to "Personal Representative" without any clause-level changes.
// ---------------------------------------------------------------------------
export function buildMichiganBindings() {
  const people = getPeople();
  const byGuid = (guid: string): PersonBinding | undefined => {
    const p = people.find(p => p.guid === guid);
    return p ? toBinding(p) : undefined;
  };

  // Reuse Tom + Margaret + George + Bill as the cast of representatives — they
  // don't have to live in Michigan; the testator's state is what matters for
  // the term lookup.
  const ordinalAgent = ['First', 'Second', 'Third', 'Fourth', 'Fifth'];
  const labeledHCBackups = ([byGuid('p-tom-smith'), byGuid('p-margaret-cornerstone')].filter(Boolean) as PersonBinding[])
    .map((p, i) => ({ ...p, alternate_label: `${ordinalAgent[i]} Alternate Agent` }));

  return {
    testator: byGuid('p-patricia-miller'),
    hasSpouse: true,
    spouse: byGuid('p-david-miller'),
    hasChildren: false,
    children: [],
    children_named_list: '',
    children_count_word: 'zero',
    children_count_word_form: 'children',
    appointChildGuardians: false,
    guardians: { primary: undefined, backups: [] },
    executors: {
      primary: byGuid('p-david-miller'),
      backups: [byGuid('p-tom-smith')].filter(Boolean),
    },
    digitalExecutors: {
      primary: byGuid('p-david-miller'),
      backups: [byGuid('p-tom-smith')].filter(Boolean),
    },
    distributionMethod: 'spouse-or-descendants',
    estateDistributionRecipients: [],
    hasContingentBeneficiaries: false,
    contingentBeneficiaries: [],
    doesExclude: false,
    disinherited_names_joined: '',
    hasCharity: false,
    charity: [],
    hasFinalArrangements: false,
    bodyDisposalPreference: '',
    servicePreference: '',
    finalArrangementNote: '',

    appendix_executors: [byGuid('p-david-miller'), byGuid('p-tom-smith')].filter(Boolean),
    appendix_guardians: [],
    appendix_digital_executors: [byGuid('p-david-miller'), byGuid('p-tom-smith')].filter(Boolean),
    appendix_gift_recipients: [],

    primaryHCAgent: byGuid('p-david-miller'),
    backupHCAgents: labeledHCBackups,
    typeOfCare: 'option-3',
    donateOrgans: true,
    instructionsNote: '',

    hipaaRepresentatives: ([byGuid('p-david-miller'), byGuid('p-tom-smith')].filter(Boolean) as PersonBinding[])
      .slice(0, 3)
      .map((p, i) => ({ ...p, label: `Representative ${['One', 'Two', 'Three'][i]}` })),

    financialAgent: byGuid('p-david-miller'),
    backupFinancialAgents: [byGuid('p-tom-smith')].filter(Boolean),
    effectiveness: 'immediate',
    springingTrigger: '',
    grantRealEstate: true,
    grantBanking: true,
    grantInvestments: true,
    grantTaxes: true,
    grantRetirement: true,
    grantInsurance: true,
    grantGifts: false,
    giftLimitAnnual: '$18,000',

    // SoA header
    trust_name: 'The Miller Family Trust',
    settlor_plural: '',
    settlor_singular_verb: 's',

    // Inventory empty for Michigan preset — focus is term-swap demonstration
    realEstate: [],
    financialAccounts: [],
    businessInterests: [],
    lifeInsurance: [],
    vehicles: [],
    otherAssets: [],
    assetGifts: [],
    specificGifts: [],
    hasSpecificGifts: false,
  };
}

// Builds the inventory-derived bindings: bucketed asset arrays by type + the
// gifted-only subset. Each item is run through toInventoryBinding so resolver
// gets gift_display + ownership_display synthesized fields.
function buildInventoryBindings() {
  const items = getInventory().map(toInventoryBinding);
  const byType = (t: string) => items.filter(i => i.item_type === t);
  const assetGifts = items.filter(i => i.is_gift);
  return {
    realEstate: byType('real_estate'),
    financialAccounts: byType('financial_account'),
    businessInterests: byType('business_interest'),
    lifeInsurance: byType('life_insurance'),
    vehicles: byType('vehicle'),
    otherAssets: byType('other'),
    assetGifts,
  };
}
