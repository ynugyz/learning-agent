# SourceMap v0.1 — design specification

> **Status: DRAFT — NOT IMPLEMENTATION-STABLE.**
> Derived from design principles during M1A, **not** extended from the M0 draft
> schema (archived at `schemas/archive/m0-draft/source-map.schema.json`).
> This contract has **not passed human review**. Milestone M0 itself is still
> awaiting final human approval.

- Requirement IDs: `SM-1` … `SM-26`
- Related: `specs/semantic-card-v0.1.md`, `docs/ARCHITECTURE.md` §2 Layer A/B, §5
- Machine contract: `schemas/source-map.v0.1.schema.json`
- Type draft: `src/contracts/source-map.ts`
- Decision context: `docs/DECISIONS.md` D-0005, D-0007, D-0010

---

## 1. Design rationale

### SM-1 — A SourceMap is a structure-and-coverage paper, not a lesson summary

The single most important framing decision. A SourceMap answers
**"what is actually present in this source package, where, and how trustworthy
is it?"** It does **not** answer "what does this lesson teach?" — that is the
LessonModel's job. Conflating the two is the primary failure mode this contract
is built to prevent.

Consequences that follow and are enforced below:

- units are described, not interpreted;
- nothing in the map asserts what a unit *means* for the knowledge base;
- the map is allowed — required, even — to contain material that never becomes
  knowledge (`SM-14`).

### SM-2 — Stable Source Unit Ledger

Every information unit worth processing gets a stable id (`unitId`, `SM-8`) and
its own entry. "Worth processing" is a judgement recorded through
`retentionClass` (`SM-11`), not a silent filter. A unit that is *listed but
marked droppable* is very different from a unit that was *never listed*: the
first is auditable, the second is an invisible omission
(`ERROR_TAXONOMY.md` `LSN-SCOPE-UNDERREACH`, `EVID-PROVENANCE-LOST`).

### SM-3 — Unit identity must not depend on anything downstream

`unitId` is minted from the source package alone: source + location + a local
sequence. It must **not** be derived from, or contain, a LessonModel id,
a `knowledgeId`, or an alignment decision (`SM-21`). If unit ids depended on
downstream output, the map would have to be rewritten every time understanding
improved, and provenance recorded against old ids would break.

The direction of reference is one-way: **SemanticCard → SourceMap**, never the
reverse (`SM-22`).

### SM-4 — Everything that survives summarisation poorly must be first-class

Teacher analogies, opinions, problem-solving tips, common mistakes, boundary
conditions and exam-administrative remarks are exactly the content that a
summariser drops (`AGENTS.md` §10; `ERROR_TAXONOMY.md` `LSN-ANALOGY-AS-FACT`,
`LSN-OPINION-AS-FACT`, `LSN-HEURISTIC-AS-THEOREM`). They therefore get
**dedicated `contentType` values** and a `retentionClass` that can mark them as
pedagogically important (`SM-10`, `SM-11`). If they were folded into a generic
"text" type, losing them would be undetectable.

### SM-5 — Processing hints are advisory and may be overturned

`processingHints` (`SM-15`) capture an early, cheap guess about how a unit
should be handled later. Hints are **not facts** and carry no authority. A later
module is entitled to contradict them. This is recorded explicitly so an early
hint can never harden into a decision, and so the hint's cheapness is visible
(it was not produced with full lesson understanding).

### SM-6 — Disposition is a handoff slot, not a decision this map makes

Every significant unit must eventually be traceable to what happened to it
(`SM-16`). But the map must not *decide* the final knowledge destination — that
is Layer B–E work. Resolution: the map carries a `disposition` slot that starts
as `unprocessed` and is filled in by later stages.

This satisfies "every important source unit must ultimately be traceable"
while keeping the map free of LessonModel work. The slot is the seam.

### SM-7 — Missing and low-quality material is recorded, not smoothed over

`sourceQuality`, `missingOrUnavailable`, and `conflicts` (`SM-12`, `SM-13`,
`SM-18`) exist so that a gap in the inputs is a **recorded fact** rather than an
invisible assumption. A pipeline that quietly proceeds on 60 minutes of a
90-minute lecture has silently degraded every downstream claim.

---

## 2. Scope

**In scope:** what the source package contains; a stable ledger of its units;
per-unit type, retention class, epistemic status, location, confidence, hints;
source-level quality and gaps; conflicts observed *between sources*;
per-unit processing disposition.

**Out of scope (deliberately):**

- what the lesson teaches (`LessonModel`) — later milestone;
- alignment / `NEW`/`EXPAND`/… decisions — Layer D;
- change plans — Layer E;
- writing or rewriting knowledge — Layers F/G;
- semantic cards — Layer C;
- storage layout anywhere (`D-0010`, `NEEDS_REVIEW`).

---

## 3. Field table

`Req`: **M** = required, **O** = optional, **Cond.** = conditional (see §4).

### 3.1 Top level

| Field | Req | Type | Purpose |
| --- | --- | --- | --- |
| `contractVersion` | M | string (const) | `"source-map/0.1"`. |
| `status` | M | enum | `draft` / `NEEDS_REVIEW` / `reviewed`. |
| `sourcePackageId` | M | string | Identifies the bundle this map describes. |
| `sources` | M | array | The actual evidence items in the package (`SM-9`). |
| `sources[].sourceId` | M | string | Stable id, unique within the package. |
| `sources[].kind` | M | enum | Evidence category. |
| `sources[].location` | M | string | Where it lives. Never a production Vault in experiments. |
| `sources[].quality` | O | object | Observed quality (`SM-12`). |
| `sources[].quality.rating` | M (cond.) | enum | `clean` / `noisy` / `partial` / `unreadable` / `unknown`. |
| `sources[].quality.issues` | O | array of enum | Specific problems, e.g. `asr-noise`, `missing-audio`. |
| `sources[].quality.note` | O | string | Free-form observation. |
| `missingOrUnavailable` | O | array | Known gaps (`SM-13`). |
| `missingOrUnavailable[].description` | M (cond.) | string | What is missing. |
| `missingOrUnavailable[].expectedFrom` | O | string | Which source it should have come from. |
| `missingOrUnavailable[].impact` | O | enum | `low` / `medium` / `high` / `unknown`. |
| `coverage` | O | object | Declared coverage of the package (`SM-17`). |
| `coverage.basis` | M (cond.) | enum | `complete` / `partial` / `unknown`. |
| `coverage.note` | O | string | Why the basis is what it is. |
| `units` | M | array | The Source Unit Ledger (`SM-2`). |
| `conflicts` | O | array | Conflicts observed between sources (`SM-18`). |
| `notes` | O | string | Mapping-session notes. **Not** a place for lesson content. |

### 3.2 Source unit

| Field | Req | Type | Purpose |
| --- | --- | --- | --- |
| `unitId` | M | string | Stable id, package-local (`SM-3`). |
| `sourceId` | M | string | Must resolve to an entry in `sources[]`. |
| `locator` | M | object | Where inside the source. |
| `locator.kind` | M (cond.) | enum | `timestamp-range` / `page-range` / `slide` / `section` / `line-range` / `span` / `opaque`. |
| `locator.start` | O | string | Start marker (format depends on `kind`). |
| `locator.end` | O | string | End marker. |
| `locator.value` | O | string | Single-value locator when a range is not meaningful. |
| `contentType` | M | enum | What kind of content this is (`SM-10`). |
| `retentionClass` | M | enum | Why it matters (`SM-11`). |
| `epistemicStatus` | M | enum | How the source presents it (`SM-19`). |
| `summary` | O | string | **Bounded, pointer-grade** description of the unit. Not a transcript. |
| `keyTerms` | O | array of string | Retrieval labels. |
| `confidence` | O | object | Mapping confidence (`SM-20`). |
| `confidence.level` | M (cond.) | enum | `low` / `medium` / `high`. |
| `confidence.basis` | O | enum | `machine-inferred` / `human-assigned` / `derived`. |
| `processingHints` | O | array | Advisory hints (`SM-5`, `SM-15`). |
| `processingHints[].hint` | M (cond.) | enum | Closed hint vocabulary. |
| `processingHints[].rationale` | O | string | Why this hint was suggested. |
| `processingHints[].advisory` | M (cond.) | boolean (const `true`) | Makes non-authority machine-readable. |
| `disposition` | M | object | Handoff slot (`SM-6`, `SM-16`). |
| `disposition.state` | M (cond.) | enum | `unprocessed` / `processed` / `deferred` / `dropped`. |
| `disposition.handledBy` | O | string | Which later artifact/stage handled it. |
| `disposition.knowledgeRefs` | O | array of string | `knowledgeId`s it contributed to. |
| `disposition.reason` | O | string | Required in spirit when `dropped` (see §4). |

### 3.3 Conflict entry

| Field | Req | Type | Purpose |
| --- | --- | --- | --- |
| `conflictId` | M | string | Stable id. |
| `kind` | M (cond.) | enum | `contradiction` / `disagreement` / `terminology-mismatch` / `scope-mismatch`. |
| `unitRefs` | M (cond.) | array of string | At least two `unitId`s. A conflict with fewer than two is meaningless. |
| `description` | M (cond.) | string | What the disagreement is. |
| `severity` | O | enum | `low` / `medium` / `high` / `unknown`. |
| `resolution` | O | object | **Only** to record that a human resolved it. See ambiguity A6. |
| `resolution.status` | M (cond.) | enum | `unresolved` / `human-resolved` / `accepted-as-open`. |
| `resolution.note` | O | string | How it was resolved. |

---

## 4. Required vs optional — with conditions

- **Always required:** `contractVersion`, `status`, `sourcePackageId`,
  `sources[]`, `units[]`; per unit: `unitId`, `sourceId`, `locator`,
  `contentType`, `retentionClass`, `epistemicStatus`, `disposition.state`.
- **`locator`:** `kind` always required. At least one of `value`, `start`
  must be present; `end` only meaningful when a range `kind` is used.
  `kind: opaque` is permitted **only** with a non-empty `value`, because an
  opaque locator that identifies nothing makes the unit untraceable (`SM-2`).
- **`retentionClass` is required even for droppable content.** `droppable` is a
  recorded judgement; omission is not.
- **`sources[].quality`:** optional as a whole; `rating` required when present.
- **`processingHints`:** optional array. When an entry is present, `hint` and
  `advisory: true` are both required — a hint without the advisory marker would
  read as a decision (`SM-5`).
- **`disposition`:** always present. `state: dropped` **should** carry
  `reason`; this is a design rule, not schema-enforced (see ambiguity A5).
- **`conflicts[].unitRefs`:** at least two entries. This is enforced because a
  one-sided "conflict" is a category error.
- **`coverage`:** optional; `basis` required when present.
- **`units[]` may be empty** only when the package is genuinely empty (e.g.
  `sourceQuality.rating: unreadable`). An empty ledger with readable sources is
  a coverage failure, not a valid state — see counterexample F3.

---

## 5. Enumerations

| Enum | Values | Notes |
| --- | --- | --- |
| `sources[].kind` | `transcript`, `slide`, `textbook`, `student-note`, `board-image`, `handout`, `audio`, `video`, `other` | Extend only with review. |
| `sources[].quality.issues` | `asr-noise`, `missing-audio`, `missing-pages`, `illegible`, `out-of-order`, `duplicate`, `language-mixed`, `unknown` | |
| `contentType` | `definition`, `claim`, `explanation`, `derivation`, `worked-example`, `example`, `analogy`, `opinion`, `problem-solving-tip`, `common-mistake`, `boundary-condition`, `exam-pointer`, `administrative`, `exercise`, `formula`, `procedure`, `data-point`, `narration`, `unknown` | `analogy`, `opinion`, `problem-solving-tip`, `common-mistake`, `exam-pointer` are first-class on purpose (`SM-4`). |
| `retentionClass` | `core`, `supporting`, `pedagogical-aid`, `assessment-relevant`, `context-only`, `droppable` | Ties into `AGENTS.md` §10. |
| `epistemicStatus` | `asserted`, `inferred`, `uncertain`, `disputed`, `verified`, `opinion`, `analogy`, `heuristic`, `unspecified` | Describes **how the source presents it**, not whether it is true (`SM-19`). |
| `confidence.level` | `low`, `medium`, `high` | |
| `confidence.basis` | `machine-inferred`, `human-assigned`, `derived` | |
| `processingHints[].hint` | `has-formula`, `has-notational-risk`, `asr-suspect`, `may-duplicate-existing-knowledge`, `likely-correction-to-existing`, `needs-cross-source-check`, `probably-not-knowledge`, `needs-human-review` | Advisory only. |
| `disposition.state` | `unprocessed`, `processed`, `deferred`, `dropped` | |
| `locator.kind` | `timestamp-range`, `page-range`, `slide`, `section`, `line-range`, `span`, `opaque` | |
| `conflicts[].kind` | `contradiction`, `disagreement`, `terminology-mismatch`, `scope-mismatch` | |
| `missingOrUnavailable[].impact` | `low`, `medium`, `high`, `unknown` | |
| `coverage.basis` | `complete`, `partial`, `unknown` | |

---

## 6. Design principles as executable statements

| ID | Invariant |
| --- | --- |
| SM-3 | No field value may be derived from a LessonModel id, a `knowledgeId`, or an alignment decision. |
| SM-16 | Every unit has a `disposition` slot; a unit cannot be absent from the ledger without appearing in `missingOrUnavailable` or a documented filter. |
| SM-19 | `epistemicStatus` describes source presentation, never machine belief. |
| SM-21 | `unitId` values are stable across re-processing of the same package. |
| SM-22 | The map is referenced by other artifacts; it references none of them except through `disposition`. |
| SM-23 | Progressive loading: a reader must be able to decide which units matter from `contentType` + `retentionClass` + `summary` without reading the source. |
| SM-24 | Incremental update: adding or re-classifying one unit must not require rewriting unrelated units. |
| SM-25 | The map is usable as a **coverage checklist**: for every unit, either it was handled or its non-handling is recorded. |
| SM-26 | `summary` is a pointer. It must never become a transcript substitute. |

---

## 7. Example instance

Small, but includes the content types most likely to be lost.

```json
{
  "contractVersion": "source-map/0.1",
  "status": "draft",
  "sourcePackageId": "pkg.bayes.lecture03",
  "sources": [
    {
      "sourceId": "src.lecture03.transcript",
      "kind": "transcript",
      "location": "test-vault/raw/lecture03.asr.txt",
      "quality": { "rating": "noisy", "issues": ["asr-noise"], "note": "Technical terms garbled around 00:12." }
    },
    {
      "sourceId": "src.lecture03.slides",
      "kind": "slide",
      "location": "test-vault/raw/lecture03.slides.pdf",
      "quality": { "rating": "clean" }
    }
  ],
  "missingOrUnavailable": [
    { "description": "Final 10 minutes of the recording are absent.", "expectedFrom": "src.lecture03.transcript", "impact": "high" }
  ],
  "coverage": { "basis": "partial", "note": "Transcript truncated; slides complete." },
  "units": [
    {
      "unitId": "su.lecture03.0011",
      "sourceId": "src.lecture03.transcript",
      "locator": { "kind": "timestamp-range", "start": "00:02:10", "end": "00:03:40" },
      "contentType": "definition",
      "retentionClass": "core",
      "epistemicStatus": "asserted",
      "summary": "Introduces the prior distribution and its role before data is observed.",
      "keyTerms": ["prior", "parameter"],
      "confidence": { "level": "high", "basis": "machine-inferred" },
      "processingHints": [
        { "hint": "has-formula", "advisory": true, "rationale": "Notation appears on the accompanying slide." }
      ],
      "disposition": { "state": "unprocessed" }
    },
    {
      "unitId": "su.lecture03.0017",
      "sourceId": "src.lecture03.transcript",
      "locator": { "kind": "timestamp-range", "start": "00:07:00", "end": "00:07:45" },
      "contentType": "problem-solving-tip",
      "retentionClass": "pedagogical-aid",
      "epistemicStatus": "heuristic",
      "summary": "Rule of thumb for spotting when a conjugate prior applies.",
      "confidence": { "level": "medium", "basis": "machine-inferred" },
      "processingHints": [
        { "hint": "probably-not-knowledge", "advisory": true, "rationale": "Presented as a shortcut, not a theorem." }
      ],
      "disposition": { "state": "deferred", "reason": "Needs human judgement on whether to store as a heuristic." }
    },
    {
      "unitId": "su.lecture03.0019",
      "sourceId": "src.lecture03.transcript",
      "locator": { "kind": "timestamp-range", "start": "00:08:10", "end": "00:08:55" },
      "contentType": "analogy",
      "retentionClass": "pedagogical-aid",
      "epistemicStatus": "analogy",
      "summary": "Teacher compares a prior to a bet placed before seeing the cards.",
      "confidence": { "level": "medium", "basis": "machine-inferred" },
      "disposition": { "state": "unprocessed" }
    },
    {
      "unitId": "su.lecture03.0022",
      "sourceId": "src.lecture03.slides",
      "locator": { "kind": "slide", "value": "14" },
      "contentType": "exam-pointer",
      "retentionClass": "assessment-relevant",
      "epistemicStatus": "asserted",
      "summary": "States that prior selection is examinable.",
      "confidence": { "level": "high", "basis": "machine-inferred" },
      "disposition": { "state": "unprocessed" }
    }
  ],
  "conflicts": [
    {
      "conflictId": "cf.lecture03.0001",
      "kind": "terminology-mismatch",
      "unitRefs": ["su.lecture03.0011", "su.lecture03.0031"],
      "description": "Transcript says 'uninformative prior', slide says 'flat prior'.",
      "severity": "medium",
      "resolution": { "status": "unresolved" }
    }
  ],
  "notes": "ASR quality degrades after 00:12."
}
```

---

## 8. Counterexamples / failure cases

| # | Failure | Why the contract rejects or resists it |
| --- | --- | --- |
| F1 | Map summarises the lesson ("this lecture covers conjugate priors"). | `contentType`/`summary` describe units, not lesson meaning. There is no field for a lesson-level thesis; adding one is a visible contract change. |
| F2 | `unitId` is `lesson03.seg04`, i.e. derived from a LessonModel segment. | `SM-3`/`SM-21`: unit identity must come from the package alone. |
| F3 | Readable sources, but `units[]` is empty. | Only valid when the package is genuinely empty/unreadable; otherwise it is a coverage failure. Recorded in `coverage.basis` and `missingOrUnavailable`. |
| F4 | A teacher's analogy is recorded with `contentType: explanation`. | Loses the distinction that `SM-4` exists to preserve; the analogy becomes assimilable into knowledge as a fact. |
| F5 | `processingHints` recorded without `advisory: true`. | A hint would read as a decision; `SM-5` requires the marker. |
| F6 | Dropped units are simply absent from `units[]`. | Defeats `SM-25`. `retentionClass: droppable` + `disposition.state: dropped` keeps the omission auditable. |
| F7 | `disposition.knowledgeRefs` points to a not-yet-existing card, so the map is rewritten later. | Acceptable but wasteful: `SM-24` wants incremental update. Notes as ambiguity A7. |
| F8 | Conflict recorded with one `unitRef`. | Schema requires ≥ 2 (`SM-18`). |
| F9 | Locator is `{kind: opaque, value: ""}`. | Untraceable; rejected. |
| F10 | `epistemicStatus: verified` used because the machine believes the claim. | `SM-19`: the field describes source presentation, not machine belief. A machine belief belongs on a card claim, not here. |
| F11 | The map stores the full transcript text per unit. | `SM-26`. No field accepts bulk source text. |
| F12 | Map asserts final knowledge destination per unit. | `SM-6`: disposition is a slot filled later; the map does not decide. |

---

## 9. Known ambiguities

- **A1 — `summary` budget.** Same problem as SemanticCard A1: "pointer-grade"
  is not measurable. No `maxLength` is imposed at v0.1.
- **A2 — Unit segmentation granularity.** How small is a "unit"? A sentence, a
  slide bullet, a two-minute passage? The contract does not say, so two
  implementers will produce incomparable ledgers. This is the single largest
  open issue in this spec.
- **A3 — `contentType: unknown` is a loophole.** A lazy implementation can mark
  everything `unknown` and satisfy the schema while defeating `SM-4`.
- **A4 — `retentionClass` vs `contentType` overlap.** `assessment-relevant`
  correlates with `exam-pointer`, and `pedagogical-aid` with `analogy`. Whether
  these are two orthogonal axes or one is derivable from the other is unsettled.
- **A5 — `disposition.reason` for dropped units** is a design rule, not
  schema-enforced, because JSON Schema cannot express "required when sibling
  value equals X" without conditions that hurt readability. Could move to a
  validator rule.
- **A6 — `conflicts[].resolution` leaks Layer D territory.** Recording a human
  resolution here is arguably alignment work. It may belong on the card, not
  the map.
- **A7 — `disposition.knowledgeRefs` creates a write-later obligation.** If
  disposition is back-filled after cards exist, the map is mutated after
  "completion", which complicates immutability and hashing.
- **A8 — Locator format is enumerated but the values are free strings.** Two
  sources types may disagree on `00:02:10` vs `130s` vs `PT2M10S`.

---

## 10. Open questions requiring human review

| ID | Question | Why it needs a human |
| --- | --- | --- |
| Q1 | What is the unit segmentation unit of work (sentence, bullet, passage)? | Determines whether ledgers are comparable at all. |
| Q2 | Should the map be immutable once created, with disposition living in a separate artifact? | A storage/architecture judgement beyond this milestone. |
| Q3 | Should machine-generated `epistemicStatus` ever include `verified`? | Currently only `asserted`-family values make sense from a machine; `verified` implies human verification. |
| Q4 | Is `coverage.complete` ever honestly assertable? | If not, the value should be removed rather than left as an aspirational option. |
| Q5 | Should exam/administrative content be in scope for a learning knowledge base at all? | Product judgement about what the user wants recorded. |
| Q6 | Must every unit end with a non-`unprocessed` disposition, and who enforces that? | Determines whether the ledger is a gate or a log. |
| Q7 | Is a `SourceMap` per source package, or per lesson? | Cardinality affects id stability. |

---

## 11. What this spec deliberately does not decide

- lesson meaning (`LessonModel`) — later milestone;
- final knowledge destination of any unit (`SM-6`);
- alignment operations;
- segmentation granularity (A2, Q1);
- storage layout of the map (`D-0010`, `NEEDS_REVIEW`);
- whether the map is mutable or append-only (Q2).
