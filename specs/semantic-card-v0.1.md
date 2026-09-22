# SemanticCard v0.1 — design specification (REV1)

> **Status: DRAFT — NOT IMPLEMENTATION-STABLE.**
> Revised under human adjudication during M1A REV1. Derived from design
> principles, **not** extended from the M0 draft schema
> (`schemas/archive/m0-draft/semantic-card.schema.json`).
> This contract has **not passed human review** as a finished design. Milestone
> M0 itself is still awaiting final human approval.

- Requirement IDs: `SC-1` … `SC-26` (see the requirement index in §9)
- Related: `specs/source-map-v0.1.md`, `docs/ARCHITECTURE.md` §2 Layer C, §3, §5
- Machine contract: `schemas/semantic-card.v0.1.schema.json`
- Type draft: `src/contracts/semantic-card.ts`
- Adjudication record: `docs/reviews/M1A_HUMAN_ADJUDICATION_REV1.md`

---

## 1. Design rationale

### SC-1 — The card is an index, not a summary

A SemanticCard exists so a machine can navigate a knowledge base **without**
reading the human notes (`AGENTS.md` §8). The failure mode this contract must
prevent is the card becoming a second, lower-quality copy of the human note.
Two rules follow:

1. The card carries a **bounded semantic core** (`semanticCore.summary`), not a
   condensation of the note. Its purpose is stated and its length is capped
   (`SC-9`).
2. **Claims are referenced, not restated.** A claim entry points at a location
   inside the human note and records that claim's epistemic state. It carries
   **no free-text field** (`SC-4`).

### SC-2 — The machine layer must never become a source of truth

Per `AGENTS.md` §7, storing an inference must not promote it to a fact.
Mechanisms:

- every claim and relation carries its own epistemic state (`SC-12`, `SC-16`);
- every claim is anchored into the note or evidence (`SC-11`);
- a machine inference may never be recorded as `verified` (`SC-13`);
- the card itself carries **no** truth-valued state at all (`SC-8`).

The card is **reconstructable** from the human note plus evidence: nothing may
exist in it that cannot be traced to a note anchor or an evidence reference.

### SC-3 — `knowledgeId` is a stable opaque identifier

`knowledgeId` (`SC-6`) is a durability commitment, not a label. It is an
**opaque** identifier that must not encode, derive from, or change with a note
title, file path, heading text or location. It survives note rewrites,
section reordering, renaming and re-summarising.

The concrete format (UUID, ULID, or other) is **deliberately not frozen** at
v0.1. The contract constrains only the properties: opaque, stable, unique, and
never path-derived. A human-readable label, if wanted, goes in a separate
optional field and explicitly has no identity function.

### SC-4 — No field may carry arbitrary note prose

The card has exactly two free-text fields, both bounded and purpose-stated
(`SC-9`, `SC-10`), and neither is allowed to hold knowledge content:

| Field | Purpose | Bound |
| --- | --- | --- |
| `semanticCore.summary` | machine navigation/matching | ≤ 280 chars |
| `learningAssets[].summary` | asset retrieval label | ≤ 160 chars |

Everything else is an identifier, an enumeration, a timestamp, or a reference.
There is **no** `claims[].note`, no `notes`, no `commentary`. A claim's text and
an asset's content live in the human note; the card points at them.

### SC-5 — Card-level state is maintenance state, not truth state

A card does not have a truth value. Whether the *knowledge* is true is a
property of individual claims; whether the *card* is trustworthy as an index is
a maintenance property. These were conflated at v0.1 and are now separate
(`SC-8`). Card state answers "can this index be relied on right now?", never
"is this knowledge true?".

### SC-6 — Relations are inferences and get their own evidence

An edge in the knowledge network is a *claim about a claim* — frequently
inferred, often wrong, and exactly the kind of statement that silently becomes
"true" once stored. Relations therefore carry their own `epistemicState`,
`basis` and optional `provenance`, and may be individually flagged for review
(`SC-16`, `SC-17`).

### SC-7 — Synchronisation is explicit, in both directions

Card and note drift apart independently. Detecting drift requires a fingerprint
on **both** sides (`SC-19`): a note-side hash detects note edits, a card-side
hash detects machine-layer edits. A single hash cannot distinguish the two.
Algorithm is SHA-256 by default.

---

## 2. Scope

**Enforcement boundary (`CH-11`).** JSON Schema validates the **structure of one
artifact at a time**. It cannot check that an `evidenceRef.sourceUnitId` exists
in some SourceMap, that a relation target resolves to a real card, or that a note
anchor exists. Cross-artifact reference integrity is therefore **not** enforced
here; it belongs to a future **Cross-artifact Validator**. Where this document
says a reference "must resolve", that is a validator requirement, not a schema
requirement.

**In scope:** the machine-readable index entry for one knowledge concept, its
anchors into the human note, its network edges, its asset index, its current
open unresolved items, and its integrity bookkeeping.

**Out of scope (deliberately):**

- lesson understanding (`LessonModel`) — later milestone;
- alignment operations (`NEW`/`EXPAND`/…) — Layer D;
- change proposals (`ChangePlan`) — Layer E;
- writing candidates — Layer F;
- auditing — Layer G;
- **closed** unresolved/conflict history (`SC-24`) — belongs to change/run
  history, not to the card;
- the physical storage layout of cards in a real Vault — **explicitly
  unresolved** (`docs/DECISIONS.md` D-0010).

---

## 3. Field table

`Req`: **M** = required, **O** = optional, **Cond.** = conditional (§4).

| Field | Req | Type | Purpose |
| --- | --- | --- | --- |
| `contractVersion` | M | string (const) | `"semantic-card/0.1"`. |
| `schemaVersion` | M | string (const) | `"0.1"` — instance-format version, distinct from the contract name. |
| `status` | M | enum | Review state of **this instance**: `draft` / `NEEDS_REVIEW` / `reviewed`. |
| `knowledgeId` | M | string (opaque) | Stable identity (`SC-3`). Never path- or title-derived. |
| `label` | O | string | Human-readable label. **No identity function**; may change freely. |
| `cardState` | M | enum | **Maintenance** state of the card (`SC-5`, `SC-8`): `stable` / `needs_review` / `conflicted` / `stale`. |
| `semanticCore` | M | object | Bounded machine-readable core. |
| `semanticCore.summary` | M | string (≤280) | Navigation/matching description (`SC-9`). |
| `semanticCore.scopeNote` | O | string (≤280) | What this card does **not** cover, to prevent false matches. |
| `humanNoteRef` | M | object | Where the source of truth lives (`SC-10`). |
| `humanNoteRef.path` | M | string | Repo- or vault-relative path. Never a production Vault in experiments. |
| `humanNoteRef.anchor` | O | object | Preferred anchor (`SC-11`). |
| `humanNoteRef.anchor.kind` | M (cond.) | enum | `block-id` (preferred) / `heading-path` (fallback). |
| `humanNoteRef.anchor.value` | M (cond.) | string | Non-empty anchor value. |
| `humanNoteFingerprint` | O | object | Note-side content fingerprint (`SC-19`). |
| `humanNoteFingerprint.alg` | O | enum | `sha256` (**default**). |
| `humanNoteFingerprint.value` | M (cond.) | string | Non-empty hash. |
| `cardFingerprint` | O | object | Card-side fingerprint, same shape. |
| `sectionIndex` | M | array | Anchor-level index of note sections (`SC-12`). |
| `sectionIndex[].anchor` | M (cond.) | object | Required per entry; same anchor shape. |
| `sectionIndex[].heading` | O | string (≤160) | Observed heading text. |
| `sectionIndex[].gist` | O | string (≤280) | One-line pointer. Not a content copy. |
| `sectionIndex[].covers` | O | array of string (each ≤64) | Retrieval labels. |
| `claims` | O | array | Claim-level index (`SC-13`). **No free-text field.** |
| `claims[].anchor` | M (cond.) | object | Required: points at the claim in the note. |
| `claims[].epistemicState` | M (cond.) | enum | State of **this claim**. |
| `claims[].basis` | O | enum | Who decided the state (`SC-14`). |
| `claims[].evidenceRefs` | O | array of object | Evidence supporting the claim. |
| `relations` | O | array | Typed edges (`SC-6`). |
| `relations[].type` | M (cond.) | enum | Closed relation vocabulary. |
| `relations[].target` | O | object | Typed reference to a target (`SC-15`). |
| `relations[].provenance` | O | array of object | Evidence for **this edge**. |
| `relations[].epistemicState` | M (cond.) | enum | State of **this edge**. |
| `relations[].basis` | O | enum | Who decided the edge's state. |
| `relations[].reviewFlag` | O | enum | `NEEDS_REVIEW` / `CONFLICT` / `LOW_CONFIDENCE`. |
| `learningAssets` | O | array | Pedagogical index (`SC-18`). |
| `learningAssets[].kind` | M (cond.) | enum | Pedagogical function. |
| `learningAssets[].ref` | M (cond.) | object | Where the asset is. Must identify something. |
| `learningAssets[].summary` | O | string (≤160) | Retrieval label only. |
| `unresolved` | O | array | **Current open** conflicts/gaps only (`SC-24`). |
| `integrity` | M | object | Synchronisation bookkeeping (`SC-19`). |
| `integrity.state` | M (cond.) | enum | `ok` / `stale` / `broken` / `unknown` / `NEEDS_REVIEW`. |
| `integrity.checkedAgainst` | M (cond.) | object | **Proof** of `ok` (`SC-19`, `SC-21`). |
| `integrity.checkedAt` | M (cond.) | string | Timestamp, required whenever an assertion is made. |
| `integrity.unavailableReason` | M (cond.) | string | Why a state could not be established. |

---

## 4. Required vs optional — with conditions

- **Always required:** `contractVersion`, `schemaVersion`, `status`,
  `knowledgeId`, `cardState`, `semanticCore.summary`, `humanNoteRef.path`,
  `sectionIndex`, `integrity`.
- **Every identifier/anchor that is present must be non-empty** (`SC-20`).
  `minLength: 1` applies to every `*Id`, `anchor.value`, fingerprint `value`,
  `locator`-like value and reference field. This is what makes "must identify
  something" a machine-enforced statement rather than a claim.
- **`claims[]`:** each entry requires `anchor` **and** `epistemicState`. There
  is no alternative to `anchor`, so a claim can never be recorded without a
  location (`SC-4`).
- **`SC-13` — machine inference may not be `verified`:** when
  `claims[].epistemicState` is `verified`, `basis` must be `human-assigned`, or
  the claim must carry at least one `evidenceRefs` entry. Schema-enforced via
  `if/then`.
- **`SC-17` — a relation without provenance must be flagged:** when
  `relations[].provenance` is absent, `reviewFlag` is required.
  Schema-enforced via `if/then`.
- **`SC-21` — `integrity.state: ok` requires proof:** `checkedAt` is required
  for every `integrity` object, and `checkedAgainst` is required when the state
  is `ok`. `unknown` requires `unavailableReason`. A state may not be asserted
  without the data that justifies it.
- **`sectionIndex`** may be **empty**, honestly stating that no sections are
  identifiable. Inventing sections to satisfy the schema is worse.
- **`cardFingerprint`** is optional at v0.1 so synchronisation can become
  symmetric without a breaking change.

---

## 5. Enumerations

| Enum | Values |
| --- | --- |
| `status` | `draft`, `NEEDS_REVIEW`, `reviewed` |
| `cardState` | `stable`, `needs_review`, `conflicted`, `stale` |
| `claim/relation epistemicState` | `asserted`, `inferred`, `uncertain`, `disputed`, `verified`, `deprecated`, `unspecified` |
| `basis` | `source-explicit`, `machine-inferred`, `human-assigned`, `derived` |
| `anchor.kind` | `block-id` (**preferred**), `heading-path` (**fallback**) |
| `fingerprint.alg` | `sha256` (**default**) |
| `relations[].type` | `prerequisite`, `part-of`, `expands`, `refines`, `corrects`, `example-of`, `counterexample-of`, `conflicts-with`, `contrasts-with`, `applies-to`, `derived-from`, `related` |
| `relations[].reviewFlag` | `NEEDS_REVIEW`, `CONFLICT`, `LOW_CONFIDENCE` |
| `learningAssets[].kind` | `definition`, `example`, `worked-example`, `problem-solving-tip`, `common-mistake`, `boundary-condition`, `counterexample`, `mnemonic`, `derivation`, `exercise`, `open-question` |
| `unresolved[].kind` | `conflict`, `ambiguity`, `missing-evidence`, `open-question` |
| `integrity.state` | `ok`, `stale`, `broken`, `unknown`, `NEEDS_REVIEW` |

**Deliberately separate vocabularies:** the card's claim/relation
`epistemicState` is *not* the SourceMap's `epistemicStatus`. The SourceMap
describes **how a source presents** material; the card describes the **epistemic
state of a claim**. They look similar and are not interchangeable
(`specs/source-map-v0.1.md` §5 explains the counterpart).

---

## 6. Example instance

Deliberately small. Note the absence of any note prose, and that every id and
anchor is non-empty.

```json
{
  "contractVersion": "semantic-card/0.1",
  "schemaVersion": "0.1",
  "status": "draft",
  "knowledgeId": "kc-01J8ZQ4T7K9M2P5R8V3W6Y0B",
  "label": "Prior distribution",
  "cardState": "needs_review",
  "semanticCore": {
    "summary": "Prior distribution encoding belief about a parameter before observing data; a modelling choice, not a property of the data.",
    "scopeNote": "Does not cover how to choose a prior objectively."
  },
  "humanNoteRef": {
    "path": "notes/bayes/prior.md",
    "anchor": { "kind": "block-id", "value": "blk-3f9a1c" }
  },
  "sectionIndex": [
    {
      "anchor": { "kind": "heading-path", "value": "Definition" },
      "heading": "Definition",
      "gist": "Formal statement.",
      "covers": ["prior", "parameter"]
    },
    {
      "anchor": { "kind": "heading-path", "value": "Common mistakes" },
      "heading": "Common mistakes",
      "gist": "Prior vs posterior confusion."
    }
  ],
  "claims": [
    {
      "anchor": { "kind": "block-id", "value": "blk-3f9a1d" },
      "epistemicState": "asserted",
      "basis": "source-explicit",
      "evidenceRefs": [{ "sourceUnitId": "su-lecture03-0011" }]
    },
    {
      "anchor": { "kind": "block-id", "value": "blk-3f9a1e" },
      "epistemicState": "uncertain",
      "basis": "machine-inferred"
    }
  ],
  "relations": [
    {
      "type": "prerequisite",
      "target": { "knowledgeId": "kc-01J8ZQ4T7K9M2P5R8V3W6Y0C" },
      "provenance": [{ "sourceUnitId": "su-lecture03-0011" }],
      "epistemicState": "inferred",
      "basis": "machine-inferred"
    },
    {
      "type": "conflicts-with",
      "target": { "knowledgeId": "kc-01J8ZQ4T7K9M2P5R8V3W6Y0D" },
      "epistemicState": "disputed",
      "basis": "machine-inferred",
      "reviewFlag": "NEEDS_REVIEW"
    }
  ],
  "learningAssets": [
    { "kind": "definition", "ref": { "anchor": { "kind": "block-id", "value": "blk-3f9a1c" } } },
    {
      "kind": "common-mistake",
      "ref": { "anchor": { "kind": "heading-path", "value": "Common mistakes" } },
      "summary": "Prior vs posterior confusion."
    }
  ],
  "unresolved": [
    {
      "kind": "conflict",
      "description": "Lecture and textbook disagree on whether an uninformative prior is well-defined here.",
      "blocking": true,
      "candidateResolutions": ["treat textbook as authoritative", "record both and defer"]
    }
  ],
  "integrity": {
    "state": "unknown",
    "checkedAt": "2026-09-22T00:00:00+08:00",
    "unavailableReason": "No fingerprint computed for this draft instance."
  }
}
```

---

## 7. Counterexamples / failure cases

| # | Failure | Why the contract rejects or resists it |
| --- | --- | --- |
| F1 | Card contains a paragraph copied from the note. | No field accepts note prose: the only two free-text fields are capped at 280/160 chars and their purpose is navigation/retrieval (`SC-4`, `SC-9`). |
| F2 | A claim recorded as `{note: "…prose…", epistemicState: "verified"}`. | `claims[].note` no longer exists; `anchor` and `epistemicState` are both required (`SC-4`, `SC-13`). |
| F3 | Machine marks its own inference `verified`. | `SC-13`: `verified` requires `basis: human-assigned` or an evidence reference. Schema-enforced. |
| F4 | Card-level `epistemicState: verified` used to bless the whole card. | No card-level truth field exists; card state is maintenance-only (`SC-5`, `SC-8`). |
| F5 | `{"sourceUnitId": ""}` used to satisfy an evidence guard. | Every identifier has `minLength: 1` (`SC-20`). |
| F6 | Card says `integrity.state: ok` with no fingerprints and no timestamp. | `checkedAt` always required; `checkedAgainst` required when state is `ok` (`SC-21`). |
| F7 | `knowledgeId` regenerated after the note file was renamed. | `SC-3`: identity is opaque and never path- or title-derived; `label` carries human text and has no identity function. |
| F8 | Line numbers used as the long-term anchor. | `anchor.kind` admits only `block-id` (preferred) and `heading-path` (fallback) (`SC-11`). |
| F9 | A relation stored as `{type, target}` with an inferred edge treated as fact. | `SC-17`: provenance or `reviewFlag` is mandatory. |
| F10 | A conflict is silently resolved to keep the card clean. | `unresolved[]` holds current conflicts; dropping one is an omission. |
| F11 | Closed/历史 conflicts accumulated in the card forever. | `SC-24`: the card holds only **open** items; history belongs to change/run history. |
| F12 | Card used as the only input to rewrite the note. | `SC-22`: the card is not sufficient to reconstruct the note. |
| F13 | Storage layout implied by a field naming a sidecar file. | `SC-25` and the out-of-scope list keep the card location-agnostic (`D-0010`). |

---

## 8. Known ambiguities and open questions

### Known ambiguities (accepted at v0.1)

- **A1 — the 280/160-character budgets have no evidence.** They are adopted
  because "compact" was previously unmeasurable and a bound is better than
  none. The right numbers await experiment. **Not blocking.**
- **A2 — `heading-path` fallback stability.** Obsidian heading text changes
  when a human renames a section; a `heading-path` anchor therefore survives
  edits that `block-id` would survive and fails on some that `block-id` would
  survive. Accepted, because the alternative is refusing to index notes that
  have no block ids.
- **A3 — evidence locator granularity.** `evidenceRef` at v0.1 accepts
  `sourceUnitId` or `locator`; the `locator` string format is not yet
  constrained, which is the one remaining place where "identifies something"
  is non-empty-checked but not structurally checked. Tracked as **OPEN**.
- **A4 — relation vocabulary completeness.** Twelve values is a judgement.
- **A5 — `cardFingerprint` semantics.** What exactly is hashed (raw text vs
  canonical JSON) remains unspecified. Tracked as **OPEN**.

### Open questions requiring human review

| ID | Question |
| --- | --- |
| Q1 | Are the 280/160-character budgets acceptable as provisional bounds? |
| Q2 | Is `knowledgeId` human-assigned, machine-generated, or hybrid? |
| Q3 | Should `learningAssets[].ref` be allowed to point directly at evidence instead of a note anchor? |
| Q4 | Is the 12-value relation vocabulary sufficient, or does `contrasts-with` collapse into `conflicts-with`? |
| Q5 | Which concrete opaque ID format (UUID / ULID / other) should be frozen, and when? |

---

## 9. Requirement index

Every requirement ID used anywhere in this spec is defined here. IDs are stable
and must not be renumbered (`CH-21`).

| ID | Requirement |
| --- | --- |
| SC-1 | The card is a navigation index, not a summary or a copy of the note. |
| SC-2 | The machine layer must never become an independent source of truth; every assertion is traceable to a note anchor or evidence. |
| SC-3 | `knowledgeId` is a stable opaque identifier: never derived from, and never changed by, title, path, heading text or location. |
| SC-4 | No field may carry arbitrary note prose. Claims and assets are referenced, not restated. |
| SC-5 | Card-level state is maintenance state, never truth state. |
| SC-6 | Relations are inferences: each carries its own epistemic state, basis and optional provenance. |
| SC-7 | Synchronisation requires a fingerprint on both the note side and the card side. |
| SC-8 | The card exposes exactly one card-level state field, and it is `cardState` (maintenance), not an epistemic one. |
| SC-9 | Free text is limited to two purpose-stated, length-capped fields: `semanticCore.summary` (≤280) and `learningAssets[].summary` (≤160). |
| SC-10 | `humanNoteRef` locates the source of truth and never points at a production Vault during experiments. |
| SC-11 | Anchors use `block-id` where available and `heading-path` as fallback; line numbers are never a long-term anchor. |
| SC-12 | `sectionIndex` provides anchor-level navigation with a bounded gist per section. |
| SC-13 | A claim entry requires an anchor and an epistemic state; a machine inference may never be recorded as `verified`. |
| SC-14 | `basis` records who assigned an epistemic state, so machine inference is distinguishable from human judgement. |
| SC-15 | A relation target may be a `knowledgeId`, a source unit id, or an explicit external reference. |
| SC-16 | Card content must not be usable to reconstruct note text. |
| SC-17 | A relation without provenance must carry a `reviewFlag`. |
| SC-18 | `learningAssets` indexes material by pedagogical function. |
| SC-19 | Fingerprints default to SHA-256; `integrity.state: ok` requires `checkedAgainst` proof and a timestamp. |
| SC-20 | Every identifier, anchor value and fingerprint value that is present must be non-empty. |
| SC-21 | No availability or integrity state may be asserted without the data that justifies it. |
| SC-22 | The card alone must never be treated as sufficient to rewrite or reconstruct a note. |
| SC-23 | A single instance describes exactly one knowledge concept. |
| SC-24 | The card holds only **current open** unresolved/conflict items; closed history belongs to change/run history. |
| SC-25 | The contract must not assume or imply any storage layout (`D-0010`). |
| SC-26 | The contract must support incremental update: one claim or relation can change without rewriting the card. |

### Reconciliation with the previous revision

| Previous | Now |
| --- | --- |
| `epistemicState` at card level | replaced by `cardState` (`SC-5`, `SC-8`) |
| `claims[].note` | **removed** (`SC-4`) |
| `humanNoteRef.anchor` as a bare string | replaced by a typed anchor (`SC-11`) |
| a range of IDs beyond the defined set, cited but never defined | removed; the set is now `SC-1`…`SC-26`, all defined in the index above |
| unbounded `summary` / `gist` | capped (`SC-9`) |
| `fingerprint.alg` mandatory one-value enum | optional, SHA-256 default (`SC-19`) |
