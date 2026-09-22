# M1A Human Adjudication — REV1

> Record of the human ruling on the independent challenger review, and of what
> M1A Contract REV1 changed in response.
>
> **Scope discipline:** this revision implements the **human decisions below and
> their direct dependencies only**. It is explicitly *not* an attempt to turn all
> 30 challenger findings green. Findings not covered by a ruling remain **OPEN**
> and are listed as such in §3.

- Frozen predecessor: `ce8fd2a` (`design: draft M1A core contracts and independent challenge`) — **permanently retained, never amended**
- Challenger input: [`M1A_CONTRACT_CHALLENGE.md`](M1A_CONTRACT_CHALLENGE.md) — 30 findings (3 blocker / 11 major / 13 minor / 3 nit)
- Adjudication verdict: **M1A_HUMAN_REVIEW = REVISE**, then **REV1 authorized**
- Contracts touched: SemanticCard, SourceMap, AgentRuntime Boundary, RunManifest

---

## 1. Rules of engagement for this revision

1. `ce8fd2a` is immutable. REV1 is a **new commit** on `design/m1a-core-contracts`.
2. Milestone M0 is **still not finally approved**; everything here remains
   `DRAFT — NOT IMPLEMENTATION-STABLE` and `NEEDS_REVIEW`.
3. No entry into M1B. `LessonModel`, alignment, ChangePlan, writer, auditor,
   Obsidian plugin and OpenMAIC remain untouched.
4. Only the findings listed as **FIXED** below were addressed. Every other
   finding keeps its original disposition.
5. Spec, JSON Schema and TypeScript must stay consistent — three artefacts per
   contract, one design.

---

## 2. Adjudicated findings

### 2.1 Blocker findings

#### CH-01 — Traceability guards were presence checks, not content checks
- **Challenger issue:** `evidenceRef` and `$defs.locator` required only that a
  *key* exist, so `{"sourceUnitId": ""}`, `{"locator": ""}` and
  `{kind: "opaque", value: ""}` all validated — while the specs claimed such
  input "is rejected".
- **Human decision:** *All `evidenceRef` / `locator` / `anchor` / ID fields must,
  when present, satisfy non-empty and structural constraints. Anything the spec
  claims the schema rejects must actually be rejected.*
- **Resulting contract change:**
  - `minLength: 1` applied to every identifier, anchor value, fingerprint value,
    locator value/endpoint, array element and reference in **all four** schemas.
  - `evidenceRef.anyOf` now requires a *non-empty* `sourceUnitId` or `locator`.
  - `$defs.locator.anyOf` now requires a *non-empty* `value` or `start`.
  - `anchor` became a typed object (`kind` + non-empty `value`) instead of a
    bare string; introduced in `SemanticCard` and reused by the manifest.
  - `conflicts[].unitRefs` requires ≥ 2 non-empty entries.
  - `learningAssets[].ref` must identify somewhere (non-empty anchor /
    sourceUnitId / path) — closing `CH-12` as a side effect.
- **Verification:** `schemas/*.v0.1.schema.json` grep for `anyOf` blocks; every
  branch pins a `minLength`.

#### CH-02 — "No free-floating prose" was false in the machine contract
- **Challenger issue:** `claims[]` was satisfiable by `{"note": "<prose>",
  "epistemicState": "verified"}` with no anchor, evidence or basis; required
  `semanticCore.summary` was unbounded prose with no anchor; `SourceMap.notes`
  and `RunManifest.notes` were unbounded free strings.
- **Human decision:** *Delete escape fields such as `SemanticCard.claims[].note`
  that can carry arbitrary knowledge prose. A SemanticCard must not reproduce
  knowledge content. Allow an extremely short machine-navigational semantic
  summary, but it must have a stated purpose and a length cap. Other free-text
  `notes` fields also get sensible caps and stated purposes.*
- **Resulting contract change:**
  - `claims[].note` **removed**. `claims[]` now requires `anchor` **and**
    `epistemicState`; there is no alternative to `anchor`, so a claim can never
    be recorded without a location.
  - `semanticCore.summary` — purpose stated (matching/routing) and capped at
    **280** chars; `scopeNote` capped at 280.
  - `learningAssets[].summary` — retrieval label, capped at **160**.
  - `sectionIndex[].gist` capped at 280; `heading` at 160; `covers[]` entries at 64.
  - `SourceMap.notes` capped at 600; `RunManifest.notes` capped at 600;
    `evidenceRef.note`, `preservation.rationale`, `observations[].rationale`,
    `missingOrUnavailable[].description`, `conflicts[].description`,
    `unresolved[].description` and `[].candidateResolutions[]` all capped.
  - Every cap is stated in the spec as **provisional** (SemanticCard ambiguity
    A1) because the right numbers need experiment, not a guess frozen into a
    validator — but a bound beats an unbounded escape hatch.
- **Verification:** `claims` schema object has no `note` property and
  `additionalProperties: false`; all `maxLength` values present.

#### CH-03 — "Absence must be visible" enums could assert without values
- **Challenger issue:** `availability: "reported"` needed no value, `"model": {}`
  validated despite `model` being required, and `integrity.state: "ok"`
  validated with both fingerprints and `checkedAt` absent — the exact scenario
  the card claimed to detect.
- **Human decision:** *`availability` / `integrity` and similar states become
  genuine tagged-union semantics. Asserting `reported` / `known` / `ok` requires
  the data that proves that state.*
- **Resulting contract change** (schema `if/then` in every case):
  - SemanticCard `integrity`: `checkedAt` always required; `checkedAgainst`
    required when state is `ok`; `unavailableReason` required when `unknown`.
  - AgentRuntime `modelIdentity.resolved`: `available` ⇒ `value` required;
    `unavailable` ⇒ `reason` required.
  - AgentRuntime `modelIdentity`: `resolution: matched | substituted` ⇒ a
    `resolved` with `availability: available` and a value is required.
  - RunManifest `caseId`, `git`, `runtime`, `model.resolved`: `present` /
    `available` ⇒ the value is required; absent ⇒ non-empty `reason` required.
  - RunManifest `runtime`: a `resolution` is only representable when **both**
    `requested` and `resolved` are present.
- **Verification:** each `allOf`/`if`/`then` block above is present in the
  schemas; the `unknown`/`unavailable` branches all require a reason.

#### CH-04 — `RunManifest.runtime.resolution` was unfillable
- **Challenger issue:** no requested-runtime field existed anywhere, so
  `resolution` could not be computed, yet the example asserted `matched`.
- **Human decision:** *RunManifest must distinguish requested runtime from
  resolved runtime explicitly, or redefine `resolution` so it is computable from
  the contract's own data. No non-computable state may remain.*
- **Resulting contract change:** `runtime` became a tagged union with
  `requested {kind, version?}` **and** `resolved {kind, version}`, and
  `resolution` is only allowed when both are present (`RM-11`). `availability:
  present` also requires both sides. The example carries both.
- **Verification:** `run-manifest.v0.1.schema.json` `$defs.runtimeInfo.allOf`
  contains the "resolution requires requested and resolved" rule.

### 2.2 Major findings

#### CH-05 — SourceMap held final knowledge dispositions
- **Challenger issue:** `disposition.knowledgeRefs` stored `knowledgeId`s inside a
  Layer B artifact, contradicting unit-identity independence.
- **Human decision:** *Delete final knowledge disposition / `knowledgeRefs` from
  SourceMap. SourceMap produces stable Source Unit IDs only; the final
  destination belongs to future Alignment / ChangePlan / Coverage Audit.*
- **Resulting contract change:** the entire `disposition` object is **removed**
  from `SourceUnit`. `SM-20` states the map is a source-understanding artifact
  and is never written back. Handoff is now purely by stable `unitId`: downstream
  artifacts record their own outcomes. `SM-25` reframes the map as a coverage
  checklist keyed by `unitId`.
- **Note:** this also removes the previous ambiguity A7 (write-later mutation).

#### CH-06 — SourceMap hints required the knowledge network
- **Challenger issue:** `may-duplicate-existing-knowledge` and
  `likely-correction-to-existing` can only be produced by consulting the
  knowledge base Layer B is defined to avoid.
- **Human decision:** *SourceMap `processingHints` may only be based on the
  current source package and must not depend on querying the existing knowledge
  network.*
- **Resulting contract change:** `processingHints` renamed to `observations`
  with a **closed, package-local** vocabulary: `has-formula`,
  `has-notational-risk`, `asr-suspect`, `terminology-unstable`,
  `compression-loses-meaning`, `needs-cross-source-check`, `needs-human-review`.
  The two knowledge-network-dependent values are deleted. `SM-5` makes this an
  invariant; `observations[].advisory` is pinned `true`.

#### CH-07 — `retentionClass` was a significance judgement
- **Challenger issue:** required `retentionClass` (`core`, `supporting`, …)
  contradicted "described, not interpreted".
- **Human decision:** *Keep the anti-omission priority idea but rename it
  `preservationPriority`. It is not knowledge importance; it is the Source
  Unit's fidelity priority. `unknown` is allowed, and it must be explicit that
  this is an inference, not a source-material fact.*
- **Resulting contract change:** `preservation { priority, rationale?,
  isInference: true }` with priority values `must-preserve` / `high` / `normal` /
  `low` / `expendable` / **`unknown`**. `isInference` is required and pinned
  `true` so priority cannot be recorded as a source property. `SM-6` states the
  semantics; the spec's F5 counterexample covers the failure.

#### CH-08 — `Usage` diverged between the TypeScript mirror and the schema
- **Challenger issue:** `RunManifest.usage` reused the runtime-boundary `Usage`
  (which contained `cost`) while the run-manifest schema redefined `usage`
  without `cost` and with `additionalProperties: false` — TypeScript-valid but
  schema-invalid.
- **Human decision:** *Decouple AgentRuntime `Usage` from RunManifest `Usage` and
  keep schema/TS consistent. Core runtime usage does not include dynamic
  provider cost.*
- **Resulting contract change:** two independent definitions.
  `agent-runtime.Usage` = tokens + `availability`, **no `cost`** (`RT-19`).
  `run-manifest.ManifestUsage` = its own local interface, no `cost`. The
  TypeScript `run-manifest.ts` no longer imports `Usage` from
  `agent-runtime.ts`, so no cross-contract type edge remains between them.

#### CH-11 — Referential integrity was asserted but never enforced
- **Challenger issue:** `units[].sourceId`, `unitRefs[]`, `sourceUnitId` and
  `target.knowledgeId` were bare strings with no validation, and the only
  cross-contract example already dangled (card cited `su.lecture03.0042` while
  the map defined `0011/0017/0019/0022`).
- **Human decision:** *State clearly that JSON Schema performs single-artifact
  structural validation only; cross-artifact ID integrity belongs to a future
  Cross-artifact Validator. Fix every dangling reference in the current
  examples.*
- **Resulting contract change:**
  - Both specs now state the single-artifact limitation explicitly and name the
    future Cross-artifact Validator as the home of referential integrity.
  - Every example was rewritten so references resolve **within the same
    document**: SemanticCard example evidence refs now use `su-lecture03-0011`,
    which the SourceMap example defines; the SourceMap conflict references
    `su-lecture03-0011` and `su-lecture03-0031`, both defined; cross-card
    `knowledgeId` targets are opaque ids that the example does not claim to
    resolve.
  - `contracts/README.md` lists "no schema-to-type consistency check" and "no
    cross-artifact reference validator" as known gaps rather than solved ones.
- **Deferred:** the validator itself is **not** built (out of scope for a design
  revision).

#### CH-14 — Shipped documents contradicted the contract
- **Challenger issue:** `docs/ARCHITECTURE.md` §4 and `src/runtime/README.md`
  still said the runtime interface was undefined and lived in `src/runtime`, and
  required "output validated against a schema" — the opposite of `RT-7`.
- **Human decision:** *Synchronise `ARCHITECTURE.md`, `src/runtime/README.md`
  and other stale documents.*
- **Resulting contract change:**
  - `docs/ARCHITECTURE.md` §4 now points at `src/contracts/agent-runtime.ts`,
    states that the runtime does **not** validate output, and records the
    `src/contracts` rationale (D-0012).
  - `src/runtime/README.md` rewritten: contract location, raw-output rule,
    adapter-owned transport retry, no credentials, no host paths.
  - `docs/ENVIRONMENT.md` no longer claims "no `package.json`" or "language
    undecided"; it records the TypeScript ruling and the zero-dependency scaffold.
  - `specs/README.md`, `schemas/README.md`, `src/README.md`,
    `src/core/README.md`, `src/contracts/README.md` updated with REV1 state and
    corrected requirement ranges.

#### CH-16 — Free-text `implementationNote` invited host paths
- **Challenger issue:** `implementationNote`'s own example (an install location)
  was the personal path the same field's text forbade.
- **Human decision:** *Delete or replace free-text `implementationNote`. Local
  install paths must not enter the core portable contract.*
- **Resulting contract change:** `RuntimeMetadata.implementationNote` **removed**.
  Identity is `runtimeKind` + `runtimeVersion` + `capabilities` only.
  `RT-11` states no contract field may carry host-specific information; install
  locations belong in `docs/ENVIRONMENT.md`.

#### CH-21 — Requirement IDs were broken
- **Challenger issue:** `SC-24` and `RT-22` were declared in headers and defined
  nowhere; `RT-17` was cited three times and never defined; `specs/README.md`
  declared ranges that contradicted both headers; roughly half of all IDs were
  cited as field tags but never stated.
- **Human decision:** *Fix all missing, duplicate and range-inconsistent
  requirement IDs.*
- **Resulting contract change:**
  - Each spec ends with a **requirement index** that defines **every** ID it
    uses: `SC-1`…`SC-26`, `SM-1`…`SM-26`, `RT-1`…`RT-24`, `RM-1`…`RM-22`.
  - Each spec adds a **reconciliation with the previous revision** table so the
    old numbering is traceable.
  - `specs/README.md` ranges now match the headers exactly.
  - Verified mechanically: zero cited-but-undefined IDs, zero numeric gaps in all
    four specs.

### 2.3 Findings closed as direct dependencies of a ruling

| Finding | Closed by | Why it is a direct dependency |
| --- | --- | --- |
| CH-09 (three incompatible provenance shapes) | partial | The `anchor` type was introduced for CH-01/CH-02; `input[].ref` and `evidenceRef` remain **distinct shapes** — the full unification is **OPEN**. |
| CH-10 (`outputSchemaRef` had no version while `promptRef` did) | CH-04/RT-20 | `outputSchemaRef` is now optional at the boundary; a structured module may require it. Versioning of the schema reference remains **OPEN**. |
| CH-12 (`learningAssets[].ref` could be empty) | CH-01 | The non-empty-identifier rule closed it directly. |
| CH-15 (cross-contract module edge pointed the wrong way) | CH-08 | Removing `Usage` from the manifest's imports broke the `run-manifest → agent-runtime` edge. The remaining `ReviewStatus`/`SchemaVersion` edge into `semantic-card.ts` is a **known wart**, recorded in D-0012, still **OPEN**. |
| CH-19 (`integrity.checkedAgainst` duplicated fingerprints, losing the algorithm) | CH-03 | Fingerprints are now typed objects carrying `alg`, so the duplication no longer loses information. Whether the duplication is *needed* remains **OPEN**. |
| CH-22 (`model` could be `{}`; example omitted a non-existent field) | CH-03 | `model.resolved` is required as a tagged union; the example now uses real fields (`model.provider`). |
| CH-29 (agent-runtime machine contract was an empty envelope) | CH-01 | Every `$defs` block now pins required fields and non-empty values rather than merely naming a shape. |

### 2.4 Human architectural rulings applied beyond the challenger list

| # | Ruling | Contract change |
| --- | --- | --- |
| A1 | Card must not use `epistemicState` for truth; use a maintenance state (`stable` / `needs_review` / `conflicted` / `stale`) | `cardState` replaces card-level `epistemicState` (`SC-5`, `SC-8`) |
| A2 | Only claims/relations have epistemic status | per-claim and per-relation state retained; no card-level truth value exists |
| A3 | A single agent generation must not mark its own claim `verified` | schema `if/then`: `verified` ⇒ `basis: human-assigned` **or** ≥1 evidence ref (`SC-13`) |
| A4 | `knowledgeId` must be a stable opaque ID, not derived from title/path; format not frozen | `knowledgeId` documented as opaque, `SC-3`; separate optional `label` carries human text with **no** identity function |
| A5 | Human Note anchor: block ID preferred, heading path as fallback, **line numbers never** | typed `anchor {kind: block-id \| heading-path, value}` (`SC-11`) |
| A6 | Card must not store large amounts of note prose | enforced by `SC-4`, `SC-9` and the removal of `claims[].note` |
| A7 | Closed unresolved history not kept in the card | `unresolved[]` is current-open only (`SC-24`) |
| A8 | Source Unit = smallest independently classifiable, locatable, priority-decidable semantic unit; no mechanical sentence chopping | definition added as `SM-3`/`SM-4`, replacing "granularity undecided" |
| A9 | SourceMap is source-understanding and is not written back with final disposition | `SM-20`; `disposition` removed |
| A10 | Machine may not generate `verified` in SourceMap; use source-explicit / inferred / uncertain / conflict | source-presented vocabulary has no `verified` (`SM-16`) |
| A11 | Coverage must not allow absolute `complete: true` | `coverage.assessment` ∈ {`not_assessed`, `assessed_no_known_gap`, `known_gaps`} (`SM-17`) |
| A12 | Exam / administrative / teacher-reminder material may still be registered as Source Units; long-term inclusion decided later | `SM-15`; `exam-pointer` and `administrative` content types retained |
| A13 | One SourceMap per ingestion source package, not per lesson | `SM-19` |
| A14 | One `TaskRequest` = one **logical** runtime task, not one model API call | `RT-3`, `RT-23`; usage aggregated per logical task |
| A15 | Adapter owns transport-safe retry; orchestrator owns semantic retry | `RT-4`, `RT-16`; `transportRetry` capability declared |
| A16 | `outputSchemaRef` optional at the runtime boundary; structured modules may require it | `RT-20` |
| A17 | Credentials must not enter `TaskRequest` or `RunManifest` | `RT-22`; no credential field exists anywhere |
| A18 | `cost` is not part of core runtime usage | `RT-19`; `cost` removed from `Usage` |
| A19 | `RunManifest.schemaVersion` required | `RM-16` |
| A20 | A core reproducibility field that cannot be obtained must record `unavailable` + reason; no silent absence | `RM-12`; tagged unions with mandatory reasons |
| A21 | Runtime requested/resolved information must be self-consistent | `RM-11` |
| A22 | Fingerprints default to SHA-256 | `RM-15`; `alg` optional and defaulted |
| A23 | Manifests are `runs/` output and not committed; retained with results when promoted to a reference benchmark | `RM-22`, documented on the contract and in the spec |
| A24 | No secrets or sensitive local paths in the manifest | `RM-5`, `RM-21`; `platform` reduced to `environmentRef`, `git.worktreeRef` symbolic only |
| A25 | Record an ADR for the M1A contract set | `docs/DECISIONS.md` **D-0011** |
| A26 | Record an ADR for contracts living in `src/contracts/` because both core and runtime need neutral contracts | `docs/DECISIONS.md` **D-0012** |
| A27 | Update M0-era stale documents without expanding scope into M1B | `docs/ENVIRONMENT.md`, `docs/ARCHITECTURE.md`, `src/runtime/README.md`, `specs/README.md`, `schemas/README.md`, `src/README.md`, `src/core/README.md`, `src/contracts/README.md` |

---

## 3. Deferred and still-OPEN findings

Per the ruling, findings not covered by a decision are **not** fixed. They keep
their original severity and remain open.

### 3.1 Explicitly deferred by the human

| Finding | Status | Reason |
| --- | --- | --- |
| CH-11 (build the Cross-artifact Validator) | **DEFERRED** | Named as future work; only the *documentation claim* and the dangling examples were fixed. |
| Any minor/nit not covered by a ruling | **OPEN** | "Must not self-expand design in pursuit of all-green." |

### 3.2 Still open after REV1

The following remain unresolved. Some improved as a side effect of a ruling, but
none was closed by design.

| Finding | Severity | Status after REV1 |
| --- | --- | --- |
| CH-09 — three incompatible "where did this come from" shapes | major | **OPEN.** `anchor` is now typed, but `input[].ref`, `evidenceRef` and `learningAssets[].ref` are still three shapes. |
| CH-10 — `outputSchemaRef` versioning | major | **PARTIAL.** Optional now (`RT-20`); whether it needs a version remains open (AgentRuntime Q5). |
| CH-13 — card-level epistemic state was an untraceable duplicate | major | **ADDRESSED via A1/A2** but the challenger's deeper point (a roll-up can still be read as a summary judgement) is **OPEN** as SemanticCard Q-note in ambiguity list. |
| CH-15 — `ReviewStatus`/`SchemaVersion` have no neutral home | major | **OPEN.** Recorded as a known wart in D-0012. |
| CH-17 — `git.dirty` had no `unknown` | minor | **PARTIAL.** `git` became a tagged union with a mandatory `reason` when unavailable (A20), which fixes the fabricated-clean-tree case; there is still no way to express "in a repository but the tree state is unknown". **OPEN.** |
| CH-18 — SourceMap stored the same judgement on several axes with no precedence | minor | **PARTIAL.** `retentionClass` removal eliminates one axis; `contentType` × `preservation.priority` × `epistemicStatus` precedence is still unstated. **OPEN.** |
| CH-19 — `integrity.checkedAgainst` duplicates fingerprints | minor | **PARTIAL.** Typed fingerprints no longer lose the algorithm; the duplication itself is **OPEN.** |
| CH-20 — `unresolved[]` entries have no identity | minor | **OPEN.** No `unresolvedId` was added; `SC-24` narrows the set to current-open only, which reduces but does not remove the need. |
| CH-23 — SourceMap has no integrity or revision marker | minor | **OPEN.** Deliberate: the map is now explicitly never written back (`SM-20`), which weakens the original argument, but no marker was added. |
| CH-24 — `status` and `integrity.state` can both mean "needs review" | minor | **OPEN.** `cardState` was added (A1), making three review-ish axes instead of two. Needs a ruling. |
| CH-25 — `contentType: unknown` + expendable + no observations satisfies every required field | minor | **OPEN.** Vocabulary-level loophole, unchanged. |
| CH-26 — SourceMap has no internal progressive-loading affordance | minor | **PARTIAL.** `SM-23` states the requirement and caps `summary`, but no per-unit ordering/index field was added. **OPEN.** |
| CH-27 — nothing supports L0/L1 routing, and neither level is listed as deferred | minor | **OPEN.** Not addressed; `AGENTS.md` §8 still lists L0/L1 as intended. |
| CH-28 — `reasoning.effort: "unspecified"` duplicates the absence of the object | nit | **OPEN.** |
| CH-30 — `output.format` is a runtime-side judgement the core cannot verify | nit | **OPEN.** `format` retained for practical parsing hints. |
| CH-11-adjacent: schema ↔ TypeScript divergence can regress | major | **OPEN.** Fixed by hand this revision; no automated check exists. |

### 3.3 Spec-level open questions surfaced or left open

| Contract | Open questions |
| --- | --- |
| SemanticCard | Q1 summary budgets; Q2 `knowledgeId` authorship; Q3 asset refs pointing at evidence; Q4 relation vocabulary; Q5 concrete opaque ID format. Ambiguities A2 (heading-path fallback), A3 (evidence locator granularity), A5 (`cardFingerprint` semantics). |
| SourceMap | CH-18 precedence; whether the map should be immutable with disposition wholly external (now effectively yes, but not stated as an invariant); whether `conflicts[].resolution` is Layer D leakage. |
| AgentRuntime | Q1 null-runtime mandate; Q2 whether `runtimeKind` belongs at all; Q3 transport-call visibility; Q4 semantic-retry policy home; Q5 `outputSchemaRef` optionality. Ambiguities A1 (validation location), A3 (empty-success enforcement), A4 (task decomposition visibility), A5 (`input[].ref` shape). |
| RunManifest | Q1 mandatory `omissions[]`; Q2 platform digest vs pointer; Q3 `runtimeKind` in manifests; Q4 `dirtyPaths` enforcement; Q5 promotion location. Ambiguities A1–A5. |
| Cross-contract | `ReviewStatus`/`SchemaVersion` neutral home (CH-15); three provenance shapes (CH-09); schema↔TS divergence detection. |

---

## 4. Consistency checks run after REV1

| Check | Result |
| --- | --- |
| `tools/check.ps1` (skeleton, secret hygiene + self-test, contract DRAFT markers, DSH dependency boundary, live-schema DRAFT markers, line endings, ignore policy, zero-dependency scaffold) | **PASSED, 0 warnings** |
| All live schemas parse as JSON | pass |
| Requirement IDs: cited-but-undefined, numeric gaps, range vs header | **0 / 0 / consistent** in all four specs |
| Every present identifier/anchor/fingerprint/locator **non-empty** | enforced in schema |
| `claims[].note` absent; `disposition`/`knowledgeRefs` absent; `implementationNote` absent; `Usage.cost` absent | verified by grep |
| `verified` in SourceMap epistemic vocabulary | absent |
| TypeScript files carry `NOT IMPLEMENTATION-STABLE` | 5/5 |
| Examples free of dangling within-document references | verified by hand |
| TypeScript compiler check | **NOT RUN** — no `typescript` dependency is installed (D-0005 installs nothing), so the drafts remain unverified by a compiler |

---

## 5. What REV1 explicitly did not do

- Did not make all 30 challenger findings green.
- Did not build the Cross-artifact Validator, a schema validator, or any runtime
  adapter.
- Did not add a `typescript` dependency or a lockfile.
- Did not change the storage-layout question (`D-0010` remains `NEEDS_REVIEW`).
- Did not touch `LessonModel`, alignment, ChangePlan, writer, auditor, Obsidian
  plugin or OpenMAIC.
- Did not enter M1B.
- Did not amend, rebase or delete `ce8fd2a`.
