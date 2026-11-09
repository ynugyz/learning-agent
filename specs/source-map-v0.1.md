# SourceMap v0.1 — design specification (REV1)

> **Status: DRAFT — NOT IMPLEMENTATION-STABLE.**
> Revised under human adjudication during M1A REV1. Derived from design
> principles, **not** extended from the M0 draft schema
> (`schemas/archive/m0-draft/source-map.schema.json`).
> This contract has **not passed human review** as a finished design. Milestone
> M0 itself is still awaiting final human approval.

- Requirement IDs: `SM-1` … `SM-27` (see the requirement index in §10)
- Related: `specs/semantic-card-v0.1.md`, `docs/ARCHITECTURE.md` §2 Layer A/B, §5
- Machine contract: `schemas/source-map.v0.1.schema.json`
- Type draft: `src/contracts/source-map.ts`
- Adjudication record: `docs/reviews/M1A_HUMAN_ADJUDICATION_REV1.md`

---

## 1. Design rationale

### SM-1 — A SourceMap is a structure-and-coverage paper, not a lesson summary

A SourceMap answers **"what is actually present in this source package, where,
and how trustworthy is it?"** It does **not** answer "what does this lesson
teach?" — that is the LessonModel's job. Units are **described, not
interpreted**; the map asserts nothing about what a unit *means* for the
knowledge base.

### SM-2 — Source Unit: the smallest independently classifiable semantic unit

> A **Source Unit** is the smallest semantic unit that can be
> **independently classified**, **independently located**, and given an
> **independent preservation priority**. (`SM-3`)

Mechanical sentence-level chopping is **forbidden** (`SM-4`). A three-sentence
explanation of one idea is one unit; three distinct ideas in one sentence are
three units. The definition is deliberately about classification and location
independence rather than about size, because a size rule (characters, seconds)
would split coherent explanations and produce ledgers that cannot be compared
or reused.

### SM-3 — Stable Source Unit Ledger

Every unit worth processing gets a stable `unitId` (`SM-8`) and its own entry.
"Worth processing" is recorded through `preservation.priority` (`SM-11`), not
applied as a silent filter. A unit that is *listed but marked expendable* is
very different from a unit that was *never listed*: the first is auditable, the
second is an invisible omission (`ERROR_TAXONOMY.md` `LSN-SCOPE-UNDERREACH`).

### SM-4 — Unit identity must not depend on anything downstream

`unitId` is minted from the source package alone: source + location + local
sequence. It must **not** be derived from, or contain, a LessonModel id, a
`knowledgeId`, an alignment decision, or a final knowledge destination
(`SM-21`). The reference direction is one-way: **SemanticCard → SourceMap**,
never the reverse (`SM-22`).

### SM-5 — The map is a source-understanding artifact and is not written back

**Adjudicated (REV1).** Once generated, a SourceMap is a record of source
understanding. Later stages — alignment, change planning, coverage audit — must
**not** write final knowledge dispositions back into it (`SM-20`).

This deletes the previous `disposition` / `knowledgeRefs` handoff slot. Those
fields stored `knowledgeId`s inside a Layer B artifact, which contradicted unit
identity independence (`SM-4`), and made the map mutable after "completion".
The handoff is now purely by **stable `unitId`**: downstream artifacts reference
units by id, and record their own outcomes in their own artifacts.

> Where a unit's knowledge ended up is answered by Alignment / ChangePlan /
> Coverage Audit artifacts, not by the SourceMap.

### SM-6 — Preservation priority is fidelity priority, not knowledge importance

**Adjudicated (REV1).** The previous `retentionClass` was a significance
judgement (`core`, `supporting`, …) and therefore contradicted "described, not
interpreted" (`SM-1`). It is replaced by `preservation.priority` (`SM-11`).

Preservation priority answers one narrow question: **how much would be lost if
this unit were dropped or compressed?** It is explicitly:

- **not** a claim that the material is important knowledge;
- **an inference**, not a property of the source material;
- allowed to be `unknown` (`SM-12`);
- advisory, and may be overridden by a later stage.

### SM-7 — Everything that survives summarisation poorly must be first-class

Teacher analogies, opinions, problem-solving tips, common mistakes, boundary
conditions and exam-administrative remarks are exactly the content a summariser
drops (`AGENTS.md` §10). They get **dedicated `contentType` values** so losing
them is detectable (`SM-10`), and they are eligible for high preservation
priority without any claim about their knowledge status (`SM-6`).

Exam and administrative material is **registered** as ordinary units; whether it
ever enters the long-term knowledge base is decided by later stages (`SM-15`).

### SM-27 — Coverage is a required, explicit statement

**Adjudicated (M1A-V2).** `coverage` was optional, so "we never assessed
coverage" could be expressed by *omitting the field* — indistinguishable, to a
reader or a validator, from "we assessed it and found nothing". It is now
**top-level required**:

- no audit performed → `assessment: not_assessed`, stated explicitly;
- no gap found → `assessment: assessed_no_known_gap`;
- gaps found → `assessment: known_gaps`.

An absent `coverage` object is invalid. "We did not check" is a fact worth
recording, and it must be recorded rather than implied (`SM-17`).

### SM-8 — Missing and low-quality material is recorded, not smoothed over

`quality`, `missingOrUnavailable` and `conflicts` (`SM-13`, `SM-14`, `SM-18`)
exist so that a gap in the inputs is a **recorded fact** rather than an
invisible assumption. Coverage is expressed without allowing an absolute claim
of completeness (`SM-17`).

---

## 2. Scope

**Enforcement boundary (`CH-11`).** JSON Schema validates the **structure of one
artifact at a time**. It cannot check that `units[].sourceId` exists in
`sources[]`, that `conflicts[].unitRefs` point at real units, or that a
`SemanticCard` references an existing `unitId`. Cross-artifact reference
integrity belongs to a future **Cross-artifact Validator**. Every example in
this document nevertheless resolves within the document, so the contract is
demonstrably satisfiable.

**In scope:** what the source package contains; a stable ledger of its units;
per-unit type, preservation priority, source-presented epistemic status,
location, confidence and package-local observations; source-level quality;
declared gaps; conflicts observed *between sources*.

**Out of scope (deliberately):**

- what the lesson teaches (`LessonModel`) — later milestone;
- the **final knowledge destination** of any unit — Alignment / ChangePlan /
  Coverage Audit (`SM-20`);
- alignment operations (`NEW`/`EXPAND`/…);
- change plans, writing, auditing;
- semantic cards;
- storage layout anywhere (`D-0010`, `NEEDS_REVIEW`).

---

## 3. Field table

`Req`: **M** = required, **O** = optional, **Cond.** = conditional (§4).

### 3.1 Top level

| Field | Req | Type | Purpose |
| --- | --- | --- | --- |
| `contractVersion` | M | string (const) | `"source-map/0.1"`. |
| `schemaVersion` | M | string (const) | `"0.1"` — instance-format version. |
| `status` | M | enum | `draft` / `NEEDS_REVIEW` / `reviewed`. |
| `sourcePackageId` | M | string (non-empty) | Identifies the ingestion source package (`SM-19`). |
| `sources` | M | array | The evidence items in the package (`SM-9`). |
| `sources[].sourceId` | M | string (non-empty) | Stable id, unique within the package. |
| `sources[].kind` | M | enum | Evidence category. |
| `sources[].location` | M | string (non-empty) | Where it lives. Never a production Vault in experiments. |
| `sources[].quality` | O | object | Observed quality (`SM-13`). |
| `sources[].quality.rating` | M (cond.) | enum | `clean` / `noisy` / `partial` / `unreadable` / `unknown`. |
| `sources[].quality.issues` | O | array of enum | Specific problems. |
| `sources[].quality.note` | O | string (≤300) | Free-form observation. |
| `missingOrUnavailable` | O | array | Declared gaps (`SM-14`). |
| `coverage` | **M** | object | **Required** (`SM-27`). Declared coverage, without any absolute claim (`SM-17`). |
| `coverage.assessment` | M (cond.) | enum | `not_assessed` / `assessed_no_known_gap` / `known_gaps`. |
| `coverage.note` | O | string (≤300) | Why the assessment is what it is. |
| `units` | M | array | The Source Unit Ledger (`SM-3`). |
| `conflicts` | O | array | Conflicts observed between sources (`SM-18`). |
| `notes` | O | string (≤600) | Mapping-session notes. Never lesson content. |

### 3.2 Source unit

| Field | Req | Type | Purpose |
| --- | --- | --- | --- |
| `unitId` | M | string (non-empty) | Stable, package-local id (`SM-4`). |
| `sourceId` | M | string (non-empty) | Must resolve to an entry in `sources[]`. |
| `locator` | M | object | Where inside the source (`SM-7`). |
| `locator.kind` | M (cond.) | enum | `timestamp-range` / `page-range` / `slide` / `section` / `line-range` / `span` / `opaque`. |
| `locator.value` | M (cond.) | string (non-empty) | Single-value locator. |
| `locator.start` / `.end` | O | string (non-empty) | Range endpoints. |
| `contentType` | M | enum | What kind of content this is (`SM-10`). |
| `preservation` | M | object | Fidelity priority (`SM-6`, `SM-11`). |
| `preservation.priority` | M (cond.) | enum | `must-preserve` / `high` / `normal` / `low` / `expendable` / `unknown`. |
| `preservation.rationale` | O | string (≤300) | Why. Advisory. |
| `preservation.isInference` | M (cond.) | boolean (const `true`) | Pins the fact that priority is an inference, not a source property. |
| `epistemicStatus` | M | enum | How the source presents it (`SM-16`). |
| `summary` | O | string (≤280) | **Bounded, pointer-grade** description. Not a transcript. |
| `keyTerms` | O | array of string (each ≤64) | Retrieval labels. |
| `confidence` | O | object | Mapping confidence (`SM-12`). |
| `observations` | O | array | Package-local observations (`SM-5`-safe, `SM-6`). |
| `observations[].observation` | M (cond.) | enum | Closed vocabulary, package-scoped only. |
| `observations[].rationale` | O | string (≤300) | Why it was observed. |
| `observations[].advisory` | M (cond.) | boolean (const `true`) | Makes non-authority machine-readable. |

### 3.3 Conflict entry

| Field | Req | Type | Purpose |
| --- | --- | --- | --- |
| `conflictId` | M | string (non-empty) | Stable id. |
| `kind` | M (cond.) | enum | `contradiction` / `disagreement` / `terminology-mismatch` / `scope-mismatch`. |
| `unitRefs` | M (cond.) | array of string (≥2, non-empty) | At least two `unitId`s. |
| `description` | M (cond.) | string (non-empty, ≤600) | What the disagreement is. |
| `severity` | O | enum | `low` / `medium` / `high` / `unknown`. |
| `resolution` | O | object | **Only** to record that a human resolved it. |
| `resolution.status` | M (cond.) | enum | `unresolved` / `human-resolved` / `accepted-as-open`. |
| `resolution.note` | O | string (≤300) | How it was resolved. |

---

## 4. Required vs optional — with conditions

- **Always required:** `contractVersion`, `schemaVersion`, `status`,
  `sourcePackageId`, `sources[]`, `units[]`; per unit: `unitId`, `sourceId`,
  `locator`, `contentType`, `preservation`, `epistemicStatus`.
- **`SM-24` — every present identifier is non-empty.** `minLength: 1` applies
  to every id, locator value/endpoint, reference and array element.
- **`locator`:** `kind` always required. At least one of `value` / `start` is
  required and must be non-empty. `kind: opaque` is permitted **only** with a
  non-empty `value`, because an opaque locator that identifies nothing makes the
  unit untraceable.
- **`preservation.isInference`** is required and pinned `true`, so an
  implementer cannot record priority as though it were a source property
  (`SM-6`).
- **`observations[]`:** each entry requires `observation` and
  `advisory: true`. Every value in the vocabulary must be decidable **from the
  package alone** (`SM-5`); there is no value that requires consulting the
  existing knowledge network.
- **`coverage` is always present** (`SM-27`). Its `assessment` may not express absolute completeness. The
  strongest positive value is `assessed_no_known_gap`, which is honest about
  being an assessment rather than a proof (`SM-17`).
- **`conflicts[].unitRefs`:** at least two **non-empty** entries, enforced,
  because a one-sided "conflict" is a category error.
- **`units[]` may be empty** only when the package is genuinely empty or
  unreadable (e.g. every source is `unreadable`). An empty ledger with readable
  sources is a coverage failure, not a valid state.

---

## 5. Enumerations

| Enum | Values |
| --- | --- |
| `sources[].kind` | `transcript`, `slide`, `textbook`, `student-note`, `board-image`, `handout`, `audio`, `video`, `other` |
| `quality.rating` | `clean`, `noisy`, `partial`, `unreadable`, `unknown` |
| `quality.issues` | `asr-noise`, `missing-audio`, `missing-pages`, `illegible`, `out-of-order`, `duplicate`, `language-mixed`, `unknown` |
| `contentType` | `definition`, `claim`, `explanation`, `derivation`, `worked-example`, `example`, `analogy`, `opinion`, `problem-solving-tip`, `common-mistake`, `boundary-condition`, `exam-pointer`, `administrative`, `exercise`, `formula`, `procedure`, `data-point`, `narration`, `unknown` |
| `preservation.priority` | `must-preserve`, `high`, `normal`, `low`, `expendable`, `unknown` |
| `epistemicStatus` (source-presented) | `source-explicit`, `inferred`, `uncertain`, `conflict`, `opinion`, `analogy`, `heuristic`, `unspecified` |
| `confidence.level` | `low`, `medium`, `high` |
| `confidence.basis` | `machine-inferred`, `human-assigned`, `derived` |
| `observations[].observation` | `has-formula`, `has-notational-risk`, `asr-suspect`, `terminology-unstable`, `compression-loses-meaning`, `needs-cross-source-check`, `needs-human-review` |
| `locator.kind` | `timestamp-range`, `page-range`, `slide`, `section`, `line-range`, `span`, `opaque` |
| `conflicts[].kind` | `contradiction`, `disagreement`, `terminology-mismatch`, `scope-mismatch` |
| `missingOrUnavailable[].impact` | `low`, `medium`, `high`, `unknown` |
| `coverage.assessment` | `not_assessed`, `assessed_no_known_gap`, `known_gaps` |

### Note on `epistemicStatus` — two deliberately different vocabularies

The SourceMap's `epistemicStatus` answers **"how does the source present this
material?"** (`SM-16`). The SemanticCard's claim/relation `epistemicState`
answers **"what is the epistemic state of this claim?"**. They are similar in
shape and are **not interchangeable**:

| | SourceMap `epistemicStatus` | SemanticCard claim `epistemicState` |
| --- | --- | --- |
| Subject | a source unit | a claim about knowledge |
| Question | how the source presents it | what we hold to be its status |
| Values include | `source-explicit`, `opinion`, `analogy`, `heuristic`, `conflict` | `asserted`, `inferred`, `disputed`, `verified`, `deprecated` |
| Machine may set `verified`? | **No such value exists** | Only with human basis or evidence (`SC-13`) |

The previous revision had `verified` in both, which is one of the ways a
machine inference could be laundered into an established fact. `SM-16` removes
that value from the source side entirely.

---

## 6. Design principles as executable statements

| ID | Invariant |
| --- | --- |
| SM-4 | No field value may be derived from a LessonModel id, a `knowledgeId`, or an alignment decision. |
| SM-5 | No observation value may require consulting the existing knowledge network. |
| SM-6 | `preservation.priority` is advisory and is marked as an inference, not a source property. |
| SM-16 | A machine may never assign `verified`; that value does not exist in this contract. |
| SM-17 | Coverage may never claim absolute completeness. |
| SM-20 | The map is never written back with final knowledge dispositions. |
| SM-21 | `unitId` values are stable across re-processing of the same package. |
| SM-22 | The map is referenced by other artifacts; it references none of them. |
| SM-23 | Progressive loading: a reader must be able to decide which units matter from `contentType` + `preservation.priority` + `summary` without reading the source. |
| SM-24 | Every identifier, locator and reference that is present must be non-empty. |
| SM-25 | The map is usable as a coverage checklist: for every unit, either it was considered or its non-consideration is recorded elsewhere by reference to `unitId`. |
| SM-26 | `summary` is a pointer. It must never become a transcript substitute. |

---

## 7. Example instance

Small, but includes the content types most likely to be lost.

```json
{
  "contractVersion": "source-map/0.1",
  "schemaVersion": "0.1",
  "status": "draft",
  "sourcePackageId": "pkg-bayes-lecture03",
  "sources": [
    {
      "sourceId": "src-lecture03-transcript",
      "kind": "transcript",
      "location": "fixtures/bayes-lecture03/transcript.asr.txt",
      "quality": {
        "rating": "noisy",
        "issues": [
          "asr-noise"
        ],
        "note": "Technical terms garbled around 00:12."
      }
    },
    {
      "sourceId": "src-lecture03-slides",
      "kind": "slide",
      "location": "fixtures/bayes-lecture03/slides.pdf",
      "quality": {
        "rating": "clean"
      }
    }
  ],
  "missingOrUnavailable": [
    {
      "description": "Final 10 minutes of the recording are absent.",
      "expectedFrom": "src-lecture03-transcript",
      "impact": "high"
    }
  ],
  "coverage": {
    "assessment": "known_gaps",
    "note": "Transcript truncated; slides complete."
  },
  "units": [
    {
      "unitId": "su-lecture03-0011",
      "sourceId": "src-lecture03-transcript",
      "locator": {
        "kind": "timestamp-range",
        "start": "00:02:10",
        "end": "00:03:40"
      },
      "contentType": "definition",
      "preservation": {
        "priority": "must-preserve",
        "isInference": true,
        "rationale": "Introduces the concept everything later depends on."
      },
      "epistemicStatus": "source-explicit",
      "summary": "Introduces the prior distribution and its role before data is observed.",
      "keyTerms": [
        "prior",
        "parameter"
      ],
      "confidence": {
        "level": "high",
        "basis": "machine-inferred"
      },
      "observations": [
        {
          "observation": "has-formula",
          "advisory": true,
          "rationale": "Notation appears on the accompanying slide."
        }
      ]
    },
    {
      "unitId": "su-lecture03-0017",
      "sourceId": "src-lecture03-transcript",
      "locator": {
        "kind": "timestamp-range",
        "start": "00:07:00",
        "end": "00:07:45"
      },
      "contentType": "problem-solving-tip",
      "preservation": {
        "priority": "high",
        "isInference": true,
        "rationale": "A shortcut presented once; compression would lose it."
      },
      "epistemicStatus": "heuristic",
      "summary": "Rule of thumb for spotting when a conjugate prior applies.",
      "confidence": {
        "level": "medium",
        "basis": "machine-inferred"
      }
    },
    {
      "unitId": "su-lecture03-0019",
      "sourceId": "src-lecture03-transcript",
      "locator": {
        "kind": "timestamp-range",
        "start": "00:08:10",
        "end": "00:08:55"
      },
      "contentType": "analogy",
      "preservation": {
        "priority": "normal",
        "isInference": true
      },
      "epistemicStatus": "analogy",
      "summary": "Teacher compares a prior to a bet placed before seeing the cards.",
      "confidence": {
        "level": "medium",
        "basis": "machine-inferred"
      }
    },
    {
      "unitId": "su-lecture03-0022",
      "sourceId": "src-lecture03-slides",
      "locator": {
        "kind": "slide",
        "value": "14"
      },
      "contentType": "exam-pointer",
      "preservation": {
        "priority": "high",
        "isInference": true,
        "rationale": "Assessment-relevant statement, easy to drop."
      },
      "epistemicStatus": "source-explicit",
      "summary": "States that prior selection is examinable.",
      "confidence": {
        "level": "high",
        "basis": "machine-inferred"
      }
    },
    {
      "unitId": "su-lecture03-0031",
      "sourceId": "src-lecture03-slides",
      "locator": {
        "kind": "slide",
        "value": "15"
      },
      "contentType": "definition",
      "preservation": {
        "priority": "high",
        "isInference": true
      },
      "epistemicStatus": "source-explicit",
      "summary": "Uses the term 'flat prior' for the same idea.",
      "confidence": {
        "level": "medium",
        "basis": "machine-inferred"
      }
    }
  ],
  "conflicts": [
    {
      "conflictId": "cf-lecture03-0001",
      "kind": "terminology-mismatch",
      "unitRefs": [
        "su-lecture03-0011",
        "su-lecture03-0031"
      ],
      "description": "Transcript says 'uninformative prior', slide says 'flat prior'.",
      "severity": "medium",
      "resolution": {
        "status": "unresolved"
      }
    }
  ],
  "notes": "ASR quality degrades after 00:12."
}
```

---

## 8. Counterexamples / failure cases

| # | Failure | Why the contract rejects or resists it |
| --- | --- | --- |
| F1 | Map summarises the lesson ("this lecture covers conjugate priors"). | `contentType`/`summary` describe units, not lesson meaning; there is no lesson-level thesis field. |
| F2 | `unitId` is `lesson03-seg04`, derived from a LessonModel segment. | `SM-4`/`SM-21`: identity comes from the package alone. |
| F3 | Readable sources, but `units[]` is empty. | Valid only when the package is genuinely empty/unreadable; otherwise a coverage failure. |
| F4 | A teacher's analogy recorded with `contentType: explanation`. | Loses the distinction `SM-7` exists to preserve. |
| F5 | `preservation.priority` recorded as a knowledge-importance ranking with `isInference` omitted. | `isInference` is required and pinned `true` (`SM-6`). |
| F6 | `observations` include "may duplicate existing knowledge" or "likely correction to existing". | Those require the knowledge network, which Layer B must not consult (`SM-5`); the vocabulary excludes them. |
| F7 | Machine writes `epistemicStatus: verified`. | The value does not exist in this contract (`SM-16`). |
| F8 | Map declares `coverage: complete`. | No absolute completeness value exists; the strongest is `assessed_no_known_gap` (`SM-17`). |
| F9 | Map records where each unit's knowledge ended up. | Removed at REV1: no `disposition`/`knowledgeRefs` field exists (`SM-20`). |
| F10 | Locator is `{kind: opaque, value: ""}`. | Untraceable; non-empty value required (`SM-24`). |
| F11 | Conflict recorded with one `unitRef`. | Schema requires ≥ 2 non-empty refs (`SM-18`). |
| F12 | The map stores the full transcript text per unit. | `SM-26`; no field accepts bulk source text. |
| F13 | Units split at every sentence. | Mechanical sentence-level chopping is forbidden (`SM-4`); classification independence is the criterion. |

---

## 9. Known ambiguities and open questions

### Explicitly deferred by human ruling (M1A-V)

- **CH-26 — no internal progressive-loading affordance. DEFERRED.** `SM-23`
  states the requirement and `summary` is capped, but no per-unit ordering or
  index field is added. The right affordance depends on the real size and shape
  of a SourceMap, which no experiment has produced yet. Adding one now would be
  designing against an imagined document.
- **CH-27 — no L0/L1 routing support. DEFERRED.** `AGENTS.md` §8 lists L0/L1 as
  intended layers. Neither this contract nor any other currently supports them,
  and this revision deliberately does **not** introduce an L0/L1 contract. It
  waits for progressive-loading experiments on real vaults.

### Known ambiguities (accepted at v0.1)

- **A1 — `summary` budget.** `SM-26` caps it at 280 characters with no evidence.
  Too short makes routing useless; too long reintroduces duplication.
- **A2 — `contentType: unknown` is a loophole.** An implementation can mark
  everything `unknown` and satisfy the schema while defeating `SM-7`.
- **A3 — precedence between the judgement axes. CH-18, still OPEN.** A unit
  carries `contentType` × `preservation.priority` × `epistemicStatus` ×
  `confidence`. What wins when they disagree is unstated.
- **A4 — `conflicts[].resolution` may be Layer D leakage.** Recording a human
  resolution here is arguably alignment work that belongs on a card.
- **A5 — unit identity minting scheme.** `SM-4` requires stability across
  re-processing, but the derivation (hash of locator? sequence? source digest?)
  is not fixed, so two implementations may mint different ids for the same unit.
- **A6 — `confidence` has no defined relationship to `preservation.priority`.**
  A low-confidence unit may be marked `must-preserve` and vice versa.
- **A7 — `disposition.reason` for dropped units is gone entirely.** Whether a
  downstream artifact must justify *not* handling a `unitId` is now a question
  for the future Coverage Audit, not for this contract.

### Open questions requiring human review

| ID | Question |
| --- | --- |
| Q1 | Is the 280-character `summary` budget right, and should it be schema-enforced? |
| Q2 | How are `unitId`s minted so that two implementations agree? (`A5`) |
| Q3 | Which axis wins when `contentType`, `preservation` and `epistemicStatus` disagree? (`CH-18`) |
| Q4 | Should `conflicts[].resolution` move out of Layer B? (`A4`) |
| Q5 | Must a downstream stage justify leaving a `unitId` unhandled, and where? (`A7`) |

## 10. Requirement index

| ID | Requirement |
| --- | --- |
| SM-1 | The map is a structure-and-coverage paper: it describes rather than interprets. |
| SM-2 | The map must not answer "what does this lesson teach". |
| SM-3 | A Source Unit is the smallest independently classifiable, independently locatable, independently prioritised semantic unit. |
| SM-4 | Mechanical sentence-level chopping is forbidden; unit identity is package-derived and downstream-independent. |
| SM-5 | Every observation and hint must be decidable from the source package alone; consulting the knowledge network is forbidden. |
| SM-6 | `preservation.priority` is a fidelity/omission-risk inference, not a knowledge-importance claim. |
| SM-7 | Locators identify a location in the package and are never production Vault paths during experiments. |
| SM-8 | Every unit worth processing is listed in a stable ledger; omission is recorded, not silent. |
| SM-9 | The package's evidence items are enumerated with kind, location and observed quality. |
| SM-10 | Content types that summarisation destroys are first-class enumerated values. |
| SM-11 | `preservation` carries priority, an optional rationale, and a pinned `isInference: true`. |
| SM-12 | Mapping confidence and preservation priority may be `unknown`. |
| SM-13 | Source quality is recorded per source. |
| SM-14 | Known gaps are declared with expected origin and impact. |
| SM-15 | Exam, administrative and teacher-reminder material may be registered as units; whether it enters the knowledge base is decided later. |
| SM-16 | Source-presented epistemic status has no `verified` value; a machine cannot assert verification. |
| SM-17 | Coverage may never claim absolute completeness. |
| SM-18 | Cross-source conflicts need at least two non-empty unit references. |
| SM-19 | One SourceMap corresponds to one ingestion source package, not necessarily to one lesson. |
| SM-20 | The map is a source-understanding artifact and is never written back with final knowledge dispositions. |
| SM-21 | `unitId` values are stable across re-processing of the same package. |
| SM-22 | Other artifacts reference the map; the map references none of them. |
| SM-23 | The map supports progressive loading via type, priority and bounded summary. |
| SM-24 | Every present identifier, locator or reference is non-empty. |
| SM-25 | The map is usable as a coverage checklist keyed by `unitId`. |
| SM-26 | `summary` is a pointer and never a transcript substitute. |
| SM-27 | `coverage` is top-level required; the absence of a coverage audit is stated as `assessment: not_assessed` and may never be expressed by omitting the field. |

### Reconciliation with the previous revision

| Previous | Now |
| --- | --- |
| `disposition.state` / `knowledgeRefs` | **removed** (`SM-20`); downstream stages record outcomes in their own artifacts |
| `retentionClass` (`core`/`supporting`/…) | replaced by `preservation.priority` + `isInference` (`SM-6`, `SM-11`) |
| `processingHints` with `may-duplicate-existing-knowledge`, `likely-correction-to-existing`, `probably-not-knowledge` | replaced by package-local `observations` (`SM-5`) |
| `epistemicStatus` including `verified` | `source-explicit` … and no `verified` (`SM-16`) |
| `coverage.basis: complete` | `coverage.assessment` with no absolute value (`SM-17`) |
| "unit segmentation undecided" | answered: classification/location/priority independence (`SM-3`) |
| `summary` unbounded | capped at 280 (`SM-26`) |
| spec said "one SourceMap per package or per lesson?" | answered: per ingestion source package (`SM-19`) |
