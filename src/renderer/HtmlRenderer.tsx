// ---------------------------------------------------------------------------
// HTML renderer for a resolved AST. Walks the PM doc and emits React elements.
//
// signature_block survives resolution and renders here as a styled block with
// witness/notary lines — matching tw-pdf-svc's `Signatures/` + `Notary/` files
// but rendered to HTML. Print stylesheet in styles.css makes this PDF-able via
// the browser's print dialog.
// ---------------------------------------------------------------------------

import React from 'react';
import type {
  PMDoc,
  PMNode,
  PMInlineNode,
  PMTextNode,
  PMHeading,
  PMParagraph,
  PMBulletList,
  PMOrderedList,
  PMListItem,
  PMSignatureBlock,
  ResolvedPMDoc,
} from '../types';

// `unresolvedAs` controls how variable_ref nodes that didn't get resolved away
// should render:
//   - 'badge' (default) — surface as a red "[unresolved: path]" warning. Use
//     in the document generator preview where unresolved nodes indicate bugs.
//   - 'chip' — render as `{path}` styled like the template editor's variable
//     chip. Use in the clause-preview popover where unresolved variables are
//     expected (the clause is being shown out of bindings context).
type UnresolvedMode = 'badge' | 'chip';
const UnresolvedContext = React.createContext<UnresolvedMode>('badge');

export function RenderResolvedDoc({ doc, unresolvedAs = 'badge' }: { doc: ResolvedPMDoc | PMDoc; unresolvedAs?: UnresolvedMode }) {
  return (
    <UnresolvedContext.Provider value={unresolvedAs}>
      <div className="doc-preview">
        {(doc.content ?? []).map((node, i) => (
          <RenderNode key={i} node={node as PMNode} />
        ))}
      </div>
    </UnresolvedContext.Provider>
  );
}

function RenderNode({ node }: { node: PMNode }) {
  switch (node.type) {
    case 'heading': {
      const h = node as PMHeading;
      const inner = renderInline(h.content ?? []);
      if (h.attrs.level === 1) return <h1>{inner}</h1>;
      if (h.attrs.level === 2) return <h2>{inner}</h2>;
      return <h3>{inner}</h3>;
    }
    case 'paragraph': {
      const p = node as PMParagraph;
      return <p>{renderInline(p.content ?? [])}</p>;
    }
    case 'bulletList': {
      const list = node as PMBulletList;
      return (
        <ul>
          {(list.content ?? []).map((li, i) => (
            <RenderListItem key={i} li={li} />
          ))}
        </ul>
      );
    }
    case 'orderedList': {
      const list = node as PMOrderedList;
      return (
        <ol>
          {(list.content ?? []).map((li, i) => (
            <RenderListItem key={i} li={li} />
          ))}
        </ol>
      );
    }
    case 'signature_block':
      return <SignatureBlock block={node as PMSignatureBlock} />;
    case 'text':
      return <>{(node as PMTextNode).text}</>;
    // Unresolved AST nodes — never legal in a fully-resolved doc but expected
    // when previewing a raw clause (which lives in template space). Renders
    // them as placeholder cards so attorneys can see the loop / branch
    // structure in clause previews, instead of silently dropping them.
    case 'for_each':
      return <UnresolvedForEach node={node as any} />;
    case 'conditional':
      return <UnresolvedConditional node={node as any} />;
    case 'clause_ref':
      return <UnresolvedClauseRef node={node as any} />;
    default:
      return null;
  }
}

function UnresolvedForEach({ node }: { node: any }) {
  return (
    <div className="preview-loop-box">
      <div className="preview-loop-header">
        <span className="preview-kw">FOR EACH</span>
        <code>{node.attrs?.as ?? 'item'}</code>
        <span style={{ color: 'var(--ink-2)' }}>IN</span>
        <code>{node.attrs?.over ?? '?'}</code>
      </div>
      <div className="preview-loop-body">
        {(node.content ?? []).map((c: PMNode, i: number) => (
          <RenderNode key={i} node={c} />
        ))}
      </div>
    </div>
  );
}

function UnresolvedConditional({ node }: { node: any }) {
  return (
    <div className="preview-cond-box">
      <div className="preview-cond-header">
        <span className="preview-kw">IF</span>
        <code>{node.attrs?.condition ?? '?'}</code>
        {node.attrs?.label ? <span style={{ color: 'var(--ink-2)' }}>— {node.attrs.label}</span> : null}
      </div>
      <div className="preview-cond-body">
        {(node.content ?? []).map((c: PMNode, i: number) => (
          <RenderNode key={i} node={c} />
        ))}
      </div>
    </div>
  );
}

function UnresolvedClauseRef({ node }: { node: any }) {
  return (
    <div className="preview-cref">
      ▸ clause <code>{node.attrs?.clauseId ?? '?'}</code>
      <span style={{ color: 'var(--ink-2)' }}> @{node.attrs?.version ?? 'latest'}</span>
    </div>
  );
}

function RenderListItem({ li }: { li: PMListItem }) {
  return (
    <li>
      {(li.content ?? []).map((c, i) => (
        <RenderNode key={i} node={c} />
      ))}
    </li>
  );
}

function InlineNodes({ nodes }: { nodes: PMInlineNode[] }) {
  const unresolvedAs = React.useContext(UnresolvedContext);
  return (
    <>
      {nodes.map((n, i) => {
        if (n.type === 'text') {
          const t = n as PMTextNode;
          let el: React.ReactNode = t.text;
          for (const mark of t.marks ?? []) {
            if (mark.type === 'bold') el = <strong key={`b${i}`}>{el}</strong>;
            if (mark.type === 'italic') el = <em key={`i${i}`}>{el}</em>;
            if (mark.type === 'underline') el = <u key={`u${i}`}>{el}</u>;
          }
          return <React.Fragment key={i}>{el}</React.Fragment>;
        }
        if (n.type === 'defined_term') {
          // Should never reach the renderer in a fully-resolved doc; guard
          // against partial trees by emitting the defaultText attribute.
          const term = (n as any).attrs?.term ?? '?';
          const defaultText = (n as any).attrs?.defaultText ?? '';
          if (defaultText) {
            return <React.Fragment key={i}>{defaultText}</React.Fragment>;
          }
          if (unresolvedAs === 'chip') {
            return <span key={i} className="pm-variable" title="defined_term">{`[${term}]`}</span>;
          }
          return <span key={i} style={{ background: '#fee', color: '#a33', padding: '0 4px' }}>[term: {term}]</span>;
        }
        const path = (n as any).attrs?.path ?? '';
        if (unresolvedAs === 'chip') {
          return <span key={i} className="pm-variable">{`{${path}}`}</span>;
        }
        return <span key={i} style={{ background: '#fee', color: '#a33', padding: '0 4px' }}>[unresolved: {path}]</span>;
      })}
    </>
  );
}

function renderInline(nodes: PMInlineNode[]) {
  return <InlineNodes nodes={nodes} />;
}

function SignatureBlock({ block }: { block: PMSignatureBlock }) {
  switch (block.attrs.kind) {
    case 'will-testator-witnesses': return <WillTestatorWitnesses />;
    case 'will-self-proving-affidavit': return <WillSelfProvingAffidavit state={block.attrs.state} />;
    case 'hcd-testator': return <HcdTestator />;
    case 'hcd-witnesses': return <HcdWitnesses />;
    case 'hipaa-testator': return <HipaaTestator />;
    case 'poa-testator': return <PoaTestator />;
    case 'poa-notary': return <PoaNotary state={block.attrs.state} />;
    case 'simple':
    default:
      return <SimpleSignatureBlock block={block} />;
  }
}

// ---------------------------------------------------------------------------
// Will — "Your Signature, Please" + Witnesses (matches finalized PDF p.8)
// ---------------------------------------------------------------------------
function WillTestatorWitnesses() {
  return (
    <>
      <div className="sig-section">
        <h2 className="sig-h2">Your Signature, Please</h2>
        <p>
          I sign my name to this instrument and attest and declare that I sign and execute this
          instrument as my Last Will and Testament, I sign it willingly, I execute it as my free
          and voluntary act for the purposes therein expressed, and I am eighteen years of age
          or older, of sound mind and memory, and under no duress, restraint, constraint, or
          undue influence. I ask the persons who sign below to be my witnesses.
        </p>
        <div className="sig-two-col">
          <div><div className="sig-line" /><div className="sig-label">Signature</div></div>
          <div><div className="sig-line" /><div className="sig-label">Date</div></div>
        </div>
      </div>

      <div className="sig-section">
        <h2 className="sig-h2">Witnesses</h2>
        <p>
          We, the undersigned witnesses to the Will of the testator, under penalty for perjury,
          state that, on the date written below, the testator declared to us that this instrument
          was the testator's Will, the testator asked us to witness it, and the testator then
          signed this instrument in our sight and presence, all of us being present at the same
          time. We believe, to the best of our knowledge, the testator is now more than 18 years
          of age, of a sound and disposing mind and memory, competent in every respect to make a
          Will, acting freely and voluntarily and not under any restraint, duress, constraint,
          menace, fraud, misrepresentation, or undue influence. At the testator's request, in
          the testator's presence, and in the presence of one another, we subscribe our names as
          witnesses.
        </p>
        <WitnessGrid count={2} fields={['Signature', 'Printed Name', 'Date', 'Address', 'City, State, Zip']} prefix="Witness" />
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Will — Self-Proving Affidavit (matches finalized PDF p.9)
// ---------------------------------------------------------------------------
function WillSelfProvingAffidavit({ state }: { state?: string }) {
  return (
    <div className="sig-section">
      <h2 className="sig-h2">Notary &amp; Self-Proving Affidavit</h2>
      <p>State of {state ?? '__________'}</p>
      <p>County of __________</p>
      <p style={{ marginTop: 16 }}>
        We, the testator, ____________________, and ____________________, the testator and the
        witnesses, respectively, whose names are signed to the attached or foregoing instrument,
        being first duly sworn, do declare to the undersigned authority that the testator signed
        and executed the instrument as the testator's will and that the testator signed willingly
        (or willingly directed another to sign for the testator), and that the testator executed
        it as the testator's free and voluntary act for the purposes expressed in that document,
        and that each of the witnesses, in the conscious presence and hearing of the testator,
        signed the will as witness and that to the best of each witness' knowledge the testator
        was at that time eighteen years of age or older, of sound mind, and under no constraint
        or undue influence.
      </p>
      <div style={{ marginLeft: '40%', marginTop: 24 }}>
        <div className="sig-line" /><div className="sig-label">Testator</div>
        <div className="sig-line" style={{ marginTop: 24 }} /><div className="sig-label">Witness</div>
        <div className="sig-line" style={{ marginTop: 24 }} /><div className="sig-label">Witness</div>
      </div>
      <p style={{ marginTop: 24 }}>
        Subscribed, sworn to and acknowledged before me by the testator, and subscribed and sworn
        to before me by ____________________ and ____________________, witnesses, this ____ day
        of ________________.
      </p>
      <div style={{ marginTop: 32 }}>
        <div className="sig-line" /><div className="sig-label">(Notary's official signature) &nbsp; &nbsp; (seal)</div>
        <div className="sig-line" style={{ marginTop: 24 }} /><div className="sig-label">(official capacity of officer)</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// HCD — testator signature (matches finalized PDF p.14)
// ---------------------------------------------------------------------------
function HcdTestator() {
  return (
    <div className="sig-section">
      <h2 className="sig-h2">Signature</h2>
      <p>
        I understand the contents of this document and the effect of granting these powers to my
        Health Care Agent. I sign my name to this document and declare that it expresses my
        intent and desires. I sign willingly and as a free and voluntary act. I ask the persons
        who sign below to be my witnesses.
      </p>
      <div className="sig-two-col">
        <div><div className="sig-line" /><div className="sig-label">Signature</div></div>
        <div><div className="sig-line" /><div className="sig-label">Date</div></div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// HCD — witnesses (matches finalized PDF p.15)
// ---------------------------------------------------------------------------
function HcdWitnesses() {
  return (
    <div className="sig-section">
      <h2 className="sig-h2">Witnesses</h2>
      <p>
        We, the undersigned, state that, on the date written below, the Principal signed this
        document in our presence. We know the Principal or have reviewed adequate proof of the
        identity of the Principal. We both witnessed the Principal sign or acknowledge this
        Healthcare Directive in front of us. We believe that the Principal is of sound mind;
        under no duress, fraud, or undue influence; and signed as a free and voluntary act.
      </p>
      <p>
        Each of us is at least 18 years of age, of sound mind, and capable of being a witness.
        We are not any of the following:
      </p>
      <ul>
        <li>Nominated in this document as Health Care Agent or an alternate;</li>
        <li>Related to the Principal by blood, marriage, domestic partnership, or adoption or the spouse of any such person;</li>
        <li>A health care provider to the Principal, including the owner or operator of any health, long-term care, or other residential or care facility serving the Principal;</li>
        <li>An employee of any health care provider to the Principal;</li>
        <li>Financially responsible for the health care of the Principal;</li>
        <li>An employee of the life or health insurance provider of the Principal;</li>
        <li>A creditor of the Principal or entitled to any assets of the Principal under a Will or codicil, trust, insurance policy, or by operation of intestate succession laws;</li>
        <li>Entitled to benefit financially in any way after the death of the Principal.</li>
      </ul>
      <p>We subscribe our names as witnesses.</p>
      <WitnessGrid count={2} fields={['Signature', 'Printed Name', 'Date', 'Address', 'City, State, Zip']} prefix="Witness" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// HIPAA — testator signature only (matches finalized PDF p.6)
// ---------------------------------------------------------------------------
function HipaaTestator() {
  return (
    <div className="sig-section">
      <h2 className="sig-h2">Signature</h2>
      <p>
        I sign my name to this instrument and declare that I execute it as my free and voluntary
        act for the purposes expressed therein.
      </p>
      <div className="sig-two-col">
        <div><div className="sig-line" /><div className="sig-label">Signature</div></div>
        <div><div className="sig-line" /><div className="sig-label">Date</div></div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// POA — testator acknowledgment (matches finalized PDF p.8)
// ---------------------------------------------------------------------------
function PoaTestator() {
  return (
    <div className="sig-section">
      <h2 className="sig-h2">Signature and Acknowledgment</h2>
      <div className="poa-field-row"><span className="poa-field-label">Your signature:</span><div className="sig-line-inline" /><span className="poa-field-label">Date:</span><div className="sig-line-inline short" /></div>
      <div className="poa-field-row"><span className="poa-field-label">Your name printed:</span><div className="sig-line-inline" /></div>
      <div className="poa-field-row"><span className="poa-field-label">Your address:</span><div className="sig-line-inline" /></div>
      <div className="poa-field-row"><span className="poa-field-label">Your telephone number:</span><div className="sig-line-inline" /></div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// POA — full statutory notary block (matches finalized PDF p.8)
// ---------------------------------------------------------------------------
function PoaNotary({ state }: { state?: string }) {
  return (
    <div className="sig-section">
      <h2 className="sig-h2">Notary</h2>
      <p>State of {state ?? '__________'}</p>
      <p>County of __________</p>
      <p style={{ marginTop: 16 }}>
        I, ____________________, a Notary Public, in and for the County in this State, hereby
        certify that ____________________, whose name is signed to the foregoing document, and
        who is known to me, acknowledged before me on this day that, being informed of the
        contents of the document, he or she executed the same voluntarily on the day the same
        bears date.
      </p>
      <p>Given under my hand this the ____ day of ________, 2____.</p>
      <div style={{ marginTop: 24 }}>
        <div className="sig-two-col">
          <div>
            <div className="sig-line" />
            <div className="sig-label">Signature of Notary Public</div>
          </div>
          <div className="sig-label-right">Personalized Seal</div>
        </div>
        <div className="sig-line" style={{ marginTop: 24 }} />
        <div className="sig-label">Printed Name of Notary Public</div>
        <p style={{ marginTop: 16 }}>My Commission expires ____________________</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared: a grid of witness signature blocks
// ---------------------------------------------------------------------------
function WitnessGrid({ count, fields, prefix }: { count: number; fields: string[]; prefix: string }) {
  const cols = Array.from({ length: count }, (_, i) => i);
  const labelFor = (i: number) => count === 2 ? (i === 0 ? 'First' : 'Second') + ' ' + prefix : `${prefix} ${i + 1}`;
  return (
    <div className="witness-grid">
      {fields.map(field => (
        <div className="witness-row" key={field}>
          {cols.map(i => (
            <div className="witness-cell" key={i}>
              <div className="sig-line" />
              <div className="sig-label">{labelFor(i)} {field}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// Back-compat for older simple signature blocks
function SimpleSignatureBlock({ block }: { block: PMSignatureBlock }) {
  const witnesses = block.attrs.witnesses ?? 0;
  const notaryRequired = block.attrs.notaryRequired ?? false;
  return (
    <div className="signature-block">
      <h3 style={{ marginTop: 0 }}>Execution</h3>
      <div className="sig-line" />
      <div className="sig-label">Testator</div>
      {Array.from({ length: witnesses }).map((_, i) => (
        <React.Fragment key={i}>
          <div className="sig-line" style={{ marginTop: 24 }} />
          <div className="sig-label">Witness {i + 1}</div>
        </React.Fragment>
      ))}
      {notaryRequired && (
        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px dashed #ccc' }}>
          <strong>Notary Acknowledgment</strong>
          <div className="sig-line" style={{ marginTop: 16 }} />
          <div className="sig-label">Notary Public</div>
        </div>
      )}
    </div>
  );
}
