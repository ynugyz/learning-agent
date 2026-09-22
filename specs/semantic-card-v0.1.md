# SemanticCard v0.1 — design specification

> **Status: DRAFT — NOT IMPLEMENTATION-STABLE.**
> Derived from design principles during M1A, **not** extended from the M0 draft
> schema (archived at `schemas/archive/m0-draft/semantic-card.schema.json`).
> This contract has **not passed human review**. No implementation may treat it
> as stable. Milestone M0 itself is still awaiting final human approval.

- Requirement IDs: `SC-1` … `SC-24`
- Related: `specs/source-map-v0.1.md`, `docs/ARCHITECTURE.md` §2 Layer C, §3, §5
- Machine contract: `schemas/semantic-card.v0.1.schema.json`
- Type draft: `src/contracts/semantic-card.ts`
- Decision context: `docs/DECISIONS.md` D-0005, D-0007, D-0010

---

## 1. Design rationale

### SC-1 — The card is an index, not a summary

A SemanticCard exists so a machine can navigate a knowledge base **without**
reading the human notes (`AGENTS.md` §8, progressive context loading). The
failure mode this contract must prevent is the card becoming a second,
lower-quality copy of the human note. Two rules follow:

1. The card carries a **bounded semantic core** (`semanticCore.summary`), not a
   condensation of the note. Its job is to make the card matchable and
   routable, not to be pleasant to read.
2. **Claims are referenced, not restated.** `claims[]` points at a location
   inside the human note and records that claim's epistemic state. It does not
   carry the claim's text as the authoritative copy.

If a future implementer finds themselves writing note prose into the card, the
contract has been misread.

### SC-2 — The machine layer must never become a source of truth

Per `AGENTS.md` §7, storing an inference must not promote it to a fact. Two
mechanisms enforce this:

- Every machine assertion carries its own epistemic state (`SC-12`), and
- Every machine assertion that corresponds to a note claim is linked to that
  claim's stable anchor (`SC-11`).

The card is therefore **reconstructable** from the human note plus evidence.
Nothing may exist in the card that cannot be traced either to a note anchor or
to an evidence reference. This is why the contract has no free-floating
`notes` or `commentary` string field.

### SC-3 — `knowledge_id` is stable; meaning is not

`knowledgeId` (`SC-6`) is a durability commitment, not a label. It survives
note rewrites, section reordering, renaming and re-summarising. Reusing an ID
for a different concept, or minting a new ID for the same concept, breaks every
external reference. This is modelled explicitly as an error type
(`SEM-ID-INSTABILITY`, `SEM-ID-COLLISION` in `docs/ERROR_TAXONOMY.md`) rather
than left as a convention.

### SC-4 — Relations are inferences and get their own evidence

An edge in the knowledge network is a *claim about a claim* — frequently
inferred, often wrong, and exactly the kind of statement that silently becomes
"true" once stored. Therefore relations are not bare `(type, target)` pairs:
each carries `provenance` (`SC-14`) and `epistemicState` (`SC-15`), and may be
individually flagged for review.

### SC-5 — Learning assets are indexed by pedagogical function

Definitions, examples, worked examples, problem-solving tips, common mistakes,
boundary conditions, mnemonics and counterexamples are the parts of a lesson
most likely to be lost by summarisation (see `AGENTS.md` §10 and
`ERROR_TAXONOMY.md` `LSN-ANALOGY-AS-FACT`, `LSN-OPINION-AS-FACT`,
`LSN-HEURISTIC-AS-THEOREM`). The asset index keeps them findable **by
function**, so a later stage can ask "where are this concept's pitfalls?"
without scanning the whole note.

### SC-6 — Synchronisation is explicit, in both directions

The card and the note can drift apart independently. Detecting drift requires a
fingerprint on **both** sides (`SC-18`): `humanNoteFingerprint` detects note
edits, `cardFingerprint` detects machine-layer edits. A single hash cannot
distinguish "note changed" from "card changed".

---

## 2. Scope

**In scope:** the machine-readable index entry for one knowledge concept, its
anchors into the human note, its network edges, its asset index, and its
integrity bookkeeping.

**Out of scope (deliberately):**

- lesson understanding (`LessonModel`) — M1B or later;
- deciding alignment operations (`NEW`/`EXPAND`/… ) — Layer D;
- change proposals (`ChangePlan`) — Layer E;
- writing candidates — Layer F;
- auditing — Layer G;
- the physical storage layout of cards in a real Vault — **explicitly
  unresolved** (`docs/DECISIONS.md` D-0010). This contract describes a card's
  content, never where it lives.

---

## 3. Field table

`Req` column: **M** = required, **O** = optional. "Cond." marks a field that is
conditional; the condition is stated in §4.

| Field | Req | Type | Purpose |
| --- | --- | --- | --- |
| `contractVersion` | M | string (const) | Contract identifier, `"semantic-card/0.1"`. Cheap incompatibility detection. |
| `status` | M | enum | Review state of this instance. `draft` means "not reviewed by a human". |
| `knowledgeId` | M | string | Stable join key to the human note (`SC-3`). |
| `cardFingerprint` | O | string | Hash of this card's own content (`SC-6`). |
| `semanticCore` | M | object | The bounded machine-readable core: `summary` + `scopeNote`. |
| `semanticCore.summary` | M | string | Compact description used for matching and routing. **Budgeted** (see `SC-7`). |
| `semanticCore.scopeNote` | O | string | What this card deliberately does **not** cover. Prevents false matches between adjacent concepts. |
| `humanNoteRef` | M | object | Where the card's source of truth lives (`SC-8`). |
| `humanNoteRef.path` | M | string | Repo- or vault-relative path. Must never point at a production Vault in experiments. |
| `humanNoteRef.anchor` | O | string | Primary stable anchor inside the note. |
| `humanNoteRef.title` | O | string | Note title as observed; a cache, not authority. |
| `humanNoteFingerprint` | O | object | Hash of the referenced note content (`SC-6`). |
| `humanNoteFingerprint.alg` | M (cond.) | enum | Hash algorithm. |
| `humanNoteFingerprint.value` | M (cond.) | string | Hash value. |
| `sectionIndex` | M | array | Anchor-level index of the note's sections (`SC-9`). |
| `sectionIndex[].anchor` | M | string | Stable anchor. Required for every entry. |
| `sectionIndex[].heading` | O | string | Observed heading text. |
| `sectionIndex[].gist` | O | string | One-line pointer, **not** a content copy. |
| `sectionIndex[].covers` | O | array of string | Free-form topic labels covered by the section. |
| `claims` | O | array | Claim-level index with per-claim epistemic state (`SC-11`). |
| `claims[].anchor` | O | string | Anchor to the claim inside the note. **Preferred** over `note`. |
| `claims[].note` | O | string | Short label only. Not authoritative prose. |
| `claims[].epistemicState` | M (cond.) | enum | State of **this claim** (`SC-12`). |
| `claims[].basis` | O | enum | Why the state was assigned (machine vs human vs derivation). |
| `claims[].evidenceRefs` | O | array of object | Evidence supporting the claim. |
| `relations` | O | array | Typed edges to other knowledge (`SC-4`). |
| `relations[].type` | M (cond.) | enum | Closed relation vocabulary. |
| `relations[].target` | O | object | Typed reference to a target (`SC-13`). |
| `relations[].target.knowledgeId` | O | string | Target card. |
| `relations[].target.sourceUnitId` | O | string | Target source unit, for edges to material not yet knowledge. |
| `relations[].target.externalRef` | O | string | Escape hatch for anything else; must be an explicit URI-like string. |
| `relations[].provenance` | O | array of object | Evidence for **this edge** (`SC-4`, `SC-14`). |
| `relations[].epistemicState` | M (cond.) | enum | State of **this edge**. |
| `relations[].reviewFlag` | O | enum | Marks an edge needing human judgement. |
| `epistemicState` | M | enum | Overall card state, coarse roll-up (`SC-12`). |
| `learningAssets` | O | array | Pedagogical index (`SC-5`). |
| `learningAssets[].kind` | M (cond.) | enum | Pedagogical function. |
| `learningAssets[].ref` | M (cond.) | object | Where the asset is. |
| `learningAssets[].summary` | O | string | Short label. Not the asset's content. |
| `unresolved` | O | array | Open questions, conflicts, gaps (`SC-10`). |
| `unresolved[].kind` | M (cond.) | enum | `conflict` / `ambiguity` / `missing-evidence` / `open-question`. |
| `unresolved[].description` | M (cond.) | string | What is unresolved. |
| `unresolved[].blocking` | O | boolean | Whether this blocks further knowledge changes. |
| `unresolved[].candidateResolutions` | O | array of string | Options not yet chosen. |
| `integrity` | M | object | Synchronisation bookkeeping (`SC-6`, `SC-16`). |
| `integrity.state` | M (cond.) | enum | `ok` / `stale` / `broken` / `unknown` / `NEEDS_REVIEW`. |
| `integrity.checkedAt` | O | string | Timestamp of last check. |
| `integrity.checkedAgainst` | O | object | The fingerprints this state was computed against. |

### Evidence reference (shared shape)

| Field | Req | Type | Purpose |
| --- | --- | --- | --- |
| `sourceUnitId` | O | string | Preferred: a stable Source Unit Ledger id (`SC-17`). |
| `locator` | O | string | Free-form locator inside that source. |
| `note` | O | string | Short human explanation. Never authoritative. |

At least one of `sourceUnitId` / `locator` must be present; an evidence
reference that identifies nothing is rejected.

---

## 4. Required vs optional — with conditions

- **Always required:** `contractVersion`, `status`, `knowledgeId`,
  `semanticCore.summary`, `humanNoteRef.path`, `sectionIndex`, `epistemicState`,
  `integrity.state`. These are what make a card identifiable, locatable,
  routable and checkable.
- **`humanNoteFingerprint`:** optional as a whole. When present, `alg` and
  `value` are both required. Fingerprinting is deliberately **not** mandated at
  v0.1 because `SC-20` leaves the algorithm choice open.
- **`claims[].epistemicState`:** required for every claim entry. A claim
  recorded without a state is exactly the "silently promoted to fact" failure
  `SC-2` forbids.
- **At least one of `claims[].anchor` / `claims[].note`:** required per claim
  entry.
- **`relations[].type` and `relations[].epistemicState`:** required per
  relation. `relations[].target` is optional so a relation can be recorded as an
  unresolved intent, but a relation with neither `provenance` nor
  `reviewFlag: NEEDS_REVIEW` is **invalid** by design rule (`SC-14`).
- **`learningAssets[].kind` and `.ref`:** required per asset.
- **`unresolved[].kind` and `.description`:** required per entry.
- **`sectionIndex`:** required, but **may be empty**. An empty index is an
  honest statement that the note has no identifiable sections; inventing
  sections to satisfy the schema is worse.
- **`cardFingerprint`:** optional at v0.1. It exists in the contract so that
  synchronisation can become symmetric without a breaking change.

### SC-7 — Summary budget (design rule, not yet enforceable)

`semanticCore.summary` should stay within a small budget (target: **≤ 280
characters**, to be reviewed). This is stated as a design rule rather than a
JSON Schema `maxLength` because the right number should come from experiment,
not from a guess frozen into a validator. See `Open questions`.

---

## 5. Enumerations

| Enum | Values | Notes |
| --- | --- | --- |
| `status` | `draft`, `NEEDS_REVIEW`, `reviewed` | Mirrors repo-wide review vocabulary. |
| `epistemicState` (card) | `asserted`, `inferred`, `uncertain`, `disputed`, `verified`, `deprecated`, `unspecified` | Coarse roll-up; per-claim state is authoritative. |
| `epistemicState` (claim, relation) | same vocabulary | No separate vocabulary — one meaning, one set of values (`SC-12`). |
| `claims[].basis` | `source-asserted`, `machine-inferred`, `human-assigned`, `derived` | Records **who** decided, so machine inferences are distinguishable from human judgement. |
| `relations[].type` | `prerequisite`, `part-of`, `expands`, `refines`, `corrects`, `example-of`, `counterexample-of`, `conflicts-with`, `contrasts-with`, `applies-to`, `derived-from`, `related` | Extend only with human review. |
| `relations[].reviewFlag` | `NEEDS_REVIEW`, `CONFLICT`, `LOW_CONFIDENCE` | |
| `learningAssets[].kind` | `definition`, `example`, `worked-example`, `problem-solving-tip`, `common-mistake`, `boundary-condition`, `counterexample`, `mnemonic`, `derivation`, `exercise`, `open-question` | `problem-solving-tip` and `common-mistake` deliberately separate (`SC-5`). |
| `unresolved[].kind` | `conflict`, `ambiguity`, `missing-evidence`, `open-question` | |
| `integrity.state` | `ok`, `stale`, `broken`, `unknown`, `NEEDS_REVIEW` | |
| `humanNoteFingerprint.alg` | `sha256` (**only value at v0.1**) | One algorithm until `SC-20` is resolved. |

---

## 6. Design principles as executable statements

These are the invariants a future validator should enforce. They are the reason
several fields exist, and the challenger review targets them directly.

| ID | Invariant |
| --- | --- |
| SC-2 | Every machine assertion is traceable to a note anchor or an evidence reference. No free-floating prose field exists. |
| SC-11 | A claim's epistemic state is recorded **per claim**, not only per card. |
| SC-14 | A relation without provenance must carry `reviewFlag: NEEDS_REVIEW`. |
| SC-17 | Evidence references prefer `sourceUnitId` from the SourceMap ledger over free-form locators. |
| SC-19 | Nothing in the card may be used to *derive* note content; the card is not sufficient to reconstruct the note. |
| SC-21 | The contract must not assume any particular storage layout (`D-0010`). |
| SC-22 | The card must be usable for progressive loading: a reader should be able to decide whether to open the note from the card alone. |
| SC-23 | The contract must support incremental update: it must be possible to update one claim or one relation without rewriting the whole card. |

---

## 7. Example instance

Deliberately small. Note the absence of any copied note prose.

```json
{
  "contractVersion": "semantic-card/0.1",
  "status": "draft",
  "knowledgeId": "kc.bayes.prior",
  "semanticCore": {
    "summary": "Prior distribution encoding belief about a parameter before observing data; a modelling choice, not a property of the data.",
    "scopeNote": "Does not cover choosing a prior objectively; see kc.bayes.prior-selection."
  },
  "humanNoteRef": {
    "path": "test-vault/notes/bayes/prior.md",
    "anchor": "#definition",
    "title": "Prior distribution"
  },
  "sectionIndex": [
    { "anchor": "#definition", "heading": "Definition", "gist": "Formal statement.", "covers": ["prior", "parameter"] },
    { "anchor": "#pitfalls", "heading": "Common mistakes", "gist": "Confusing prior with posterior." }
  ],
  "claims": [
    {
      "anchor": "#definition/claim-1",
      "epistemicState": "asserted",
      "basis": "source-asserted",
      "evidenceRefs": [{ "sourceUnitId": "su.lecture03.0042", "note": "Lecture statement." }]
    },
    {
      "anchor": "#pitfalls/claim-2",
      "epistemicState": "uncertain",
      "basis": "machine-inferred"
    }
  ],
  "relations": [
    {
      "type": "prerequisite",
      "target": { "knowledgeId": "kc.prob.conditional" },
      "provenance": [{ "sourceUnitId": "su.lecture03.0011" }],
      "epistemicState": "inferred"
    },
    {
      "type": "conflicts-with",
      "target": { "knowledgeId": "kc.bayes.frequentist-view" },
      "epistemicState": "disputed",
      "reviewFlag": "NEEDS_REVIEW"
    }
  ],
  "epistemicState": "asserted",
  "learningAssets": [
    { "kind": "definition", "ref": { "anchor": "#definition" } },
    { "kind": "common-mistake", "ref": { "anchor": "#pitfalls" }, "summary": "Prior vs posterior confusion." }
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
    "state": "ok",
    "checkedAt": "2026-09-22T00:00:00+08:00"
  }
}
```

---

## 8. Counterexamples / failure cases

| # | Failure | Why the contract rejects or resists it |
| --- | --- | --- |
| F1 | Card contains a paragraph copied from the note. | No field accepts note prose. `summary` is budgeted; `claims[]` carries anchors, not text. An implementer doing this has to add a field, which is a visible contract change. |
| F2 | One `epistemicState` for the whole card, some claims inferential. | Per-claim state is required; the card-level state is explicitly only a coarse roll-up. |
| F3 | Relation stored as `{type, target}` with inferred edge treated as fact. | `SC-14`: provenance or `NEEDS_REVIEW` is mandatory. A bare inferred edge is a contract violation. |
| F4 | `knowledgeId` regenerated when the note was renamed. | `SC-3` declares stability as a commitment and maps the failure to `SEM-ID-INSTABILITY`. |
| F5 | Teacher's analogy recorded as a definition. | `learningAssets[].kind` separates `example`/`worked-example` from `definition`, and `relations[].type` separates `example-of` from `part-of`. The analogy cannot be silently filed as the concept itself. |
| F6 | Card says `integrity.state: ok` after the note was rewritten. | Requires a fingerprint on both sides (`SC-6`); with only a note-side hash, "card edited" is undetectable. |
| F7 | A conflict is silently resolved to keep the card clean. | `unresolved[]` exists specifically to hold conflicts, with `blocking` to stop downstream changes. Dropping the conflict is an omission, not a simplification. |
| F8 | Card used as the only input to rewrite the note. | `SC-19`: the card is not sufficient to reconstruct the note. Any pipeline step that tries is missing Layer L3/L4 loading. |
| F9 | Card embeds the note's full section text via `sectionIndex[].gist`. | `gist` is a pointer. Budgeting it is an open question; the failure is identified even though it is not yet machine-enforced. |
| F10 | Storage layout implied (e.g. a field naming the sidecar file). | `SC-21` and the explicit out-of-scope list keep the card location-agnostic (`D-0010`). |

---

## 9. Known ambiguities

- **A1 — `summary` budget.** `SC-7` proposes ≤ 280 characters with no evidence.
  Too short makes routing useless; too long reintroduces duplication. Needs
  experiment.
- **A2 — "Compact" is not measurable.** `SC-1` is a principle. The only
  machine-checkable proxy considered was a `maxLength` on `summary` and `gist`,
  which risks freezing a guess into a validator.
- **A3 — Evidence reference granularity.** `locator` is deliberately free-form
  at v0.1, which means two implementers can produce incomparable locators.
  Tightening it requires knowing the SourceMap locator design first.
- **A4 — Relation vocabulary completeness.** Twelve values is a guess.
  `contrasts-with` vs `conflicts-with` is a real semantic distinction that may
  collapse or split once real lessons are processed.
- **A5 — Claim-level identity.** `claims[].anchor` assumes a note has stable
  intra-note anchors. Obsidian heading anchors are stable-ish; block references
  are stable; plain paragraphs are **not**. If a note has no anchors, claim-level
  tracking degrades to line-based locators, which break on edit.
- **A6 — `cardFingerprint` semantics.** What exactly is hashed (raw text?
  canonical JSON?) is unspecified.
- **A7 — Who may write `basis: human-assigned`.** Presumably a human. Whether a
  supervised machine edit counts is undefined.
- **A8 — `status` vs `integrity.state`.** Both can express "needs review". The
  boundary between a card never reviewed and a reviewed card gone stale is
  stated in prose, not enforced.

---

## 10. Open questions requiring human review

| ID | Question | Why it needs a human |
| --- | --- | --- |
| Q1 | Is `semanticCore.summary` allowed to contain any verbatim note text, ever? | Semantic judgement about what counts as duplication. |
| Q2 | Should `claims[]` be the only place epistemic state lives, or may a card carry an overall `verified` that outranks claims? | Determines whether the roll-up can ever override per-claim truth. |
| Q3 | Is `knowledgeId` human-assigned, machine-generated, or hybrid? | Affects stability guarantees and the migration story. |
| Q4 | Which note anchor mechanism is authoritative (heading anchor, block ref, explicit id)? | Determines whether `SC-11` is achievable at all. |
| Q5 | Is ≤ 280 characters the right `summary` budget? | Needs evidence from real notes. |
| Q6 | Does `cardFingerprint` belong in the card at all, or in separate state? | Self-referential hashing is awkward; may indicate a layering mistake. |
| Q7 | Must `unresolved[]` entries ever be *closed*, and is closure recorded? | Currently nothing records that a conflict was resolved — only that it exists. |
| Q8 | Should `learningAssets[].ref` be allowed to point directly at evidence instead of a note anchor? | Determines whether assets survive a note rewrite. |

---

## 11. What this spec deliberately does not decide

- storage layout of cards (`D-0010`, `NEEDS_REVIEW`);
- the LessonModel contract and any ID scheme it owns (`SC-17` depends on it);
- alignment operations and ChangePlans;
- whether a card maps 1:1 to a human note (currently: **one concept per card**,
  implied by `knowledgeId`, but not proven to be the right cardinality — see
  the challenger review);
- fingerprint algorithms beyond `sha256`.
