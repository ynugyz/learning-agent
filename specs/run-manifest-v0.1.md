# RunManifest v0.1 — design specification

> **Status: DRAFT — NOT IMPLEMENTATION-STABLE.**
> This contract has **not passed human review**. Milestone M0 itself is still
> awaiting final human approval.

- Requirement IDs: `RM-1` … `RM-18`
- Related: `AGENTS.md` §9, `docs/ARCHITECTURE.md` §6, `docs/ENVIRONMENT.md`,
  `specs/agent-runtime-v0.1.md`
- Machine contract: `schemas/run-manifest.v0.1.schema.json`
- Type draft: `src/contracts/run-manifest.ts`
- Decision context: `docs/DECISIONS.md` D-0003 (DSH pinning deferred)

---

## 1. Design rationale

### RM-1 — The manifest is a reproducibility record, not a log

Its purpose is to make "is comparison A vs B valid?" answerable **without**
re-running anything. Anything that could silently invalidate a comparison
belongs here (`AGENTS.md` §9: do not compare experiments when uncontrolled
infrastructure changed).

### RM-2 — Requested and actual are separately recorded

The most common invisible cause of invalid comparison is a substitution the
operator never noticed — a different model, a different runtime build, a
different prompt revision. Every "what we asked for" field is therefore paired
with a "what actually happened" field (`RM-8`, `RM-9`, `RM-10`).

### RM-3 — Git dirty state is a first-class field

A commit hash alone is a lie when the working tree was modified. The dirty flag
and the changed paths are recorded so a run from a dirty tree is **visibly**
different from one from a clean tree, rather than silently incomparable.

### RM-4 — Absence must be representable

Many fields cannot always be obtained (resolved model, usage, a platform
version). The contract provides explicit `unknown`/`unavailable` markers rather
than permitting omission, because a missing field and a field that could not be
determined are different facts (`RM-6`, `RM-11`).

### RM-5 — No secrets, ever

The manifest is a committed or shared artifact. It must contain no API keys,
tokens, passwords, credentials or full request headers (`AGENTS.md` §3.2).
Because omitting a field with a real value is indistinguishable from having
nothing to omit, `omissions[]` lets a producer record **that** something was
deliberately withheld, without recording the value.

### RM-6 — The manifest describes a run, not the result

Outcomes, scores and interpretations belong to results/audit artifacts. A
manifest that contains conclusions stops being comparable across code changes.

---

## 2. Scope

**In scope:** the reproducibility record for one experiment run.

**Out of scope:** outputs and scores; benchmark Gold data; audit findings;
cost policy; credential handling; storage location of run artifacts
(`D-0010` is about knowledge layout, but the same "layout undecided" caution
applies to run artifacts — see ambiguity A5).

---

## 3. Field table

`Req`: **M** = required, **O** = optional, **Cond.** = conditional.

| Field | Req | Type | Purpose |
| --- | --- | --- | --- |
| `contractVersion` | M | string (const) | `"run-manifest/0.1"`. |
| `status` | M | enum | `draft` / `NEEDS_REVIEW` / `reviewed`. |
| `runId` | M | string | Unique id for this run. |
| `caseId` | O | object | Which benchmark case, if any (`RM-12`). |
| `caseId.value` | M (cond.) | string | Case identifier. |
| `caseId.availability` | M (cond.) | enum | `present` / `not-applicable` / `unknown`. |
| `startedAt` | M | string | ISO-8601 timestamp with offset. |
| `finishedAt` | O | string | ISO-8601; absent for a crashed/incomplete run. |
| `git` | M | object | Repository state (`RM-3`). |
| `git.commit` | M (cond.) | string | Full commit SHA, or `unknown`. |
| `git.branch` | O | string | Branch name. |
| `git.dirty` | M (cond.) | boolean | Whether the tree differed from `commit`. |
| `git.dirtyPaths` | O | array of string | Changed paths when `dirty` is true (`RM-13`). |
| `git.repoRef` | O | string | Repository identity, if it can be stated without a private path. |
| `runtime` | M | object | Runtime identity (`RM-8`). |
| `runtime.kind` | M (cond.) | string | Neutral runtime label. |
| `runtime.version` | M (cond.) | string | Version actually resolved at run time (`D-0003`, `AGENTS.md` §9). |
| `runtime.resolution` | M (cond.) | enum | `matched` / `substituted` / `unknown`. |
| `model` | M | object | Model identity (`RM-9`). |
| `model.requested` | O | string | What the run configuration asked for. |
| `model.resolved` | O | object | What actually ran. |
| `model.resolved.value` | M (cond.) | string | Resolved model name. |
| `model.resolved.availability` | M (cond.) | enum | `reported` / `unavailable` / `unknown`. |
| `model.provider` | O | string | Provider label. |
| `reasoning` | O | object | Reasoning configuration actually applied (`RM-10`). |
| `reasoning.requested` | O | string | |
| `reasoning.applied` | O | string | |
| `reasoning.notes` | O | string | Non-secret free-form descriptor. |
| `versions` | M | object | The version bundle that makes the run reproducible. |
| `versions.prompts` | M (cond.) | object | Map of prompt id → version (`RM-7`). |
| `versions.schemas` | M (cond.) | object | Map of schema id → version. |
| `versions.contracts` | O | object | Map of contract id → version. |
| `sourceBundle` | O | object | What inputs were consumed (`RM-14`). |
| `sourceBundle.packageId` | M (cond.) | string | Source package id, matching a SourceMap. |
| `sourceBundle.refs` | O | array of object | Individual inputs. |
| `sourceBundle.digest` | O | string | Digest of the bundle, when computable. |
| `platform` | O | object | Environment reference (`RM-15`). |
| `platform.os` | O | string | |
| `platform.node` | O | string | |
| `platform.shell` | O | string | |
| `platform.environmentRef` | O | string | Pointer to a recorded environment document, e.g. `docs/ENVIRONMENT.md` (`RM-16`). |
| `usage` | O | object | Aggregate usage, mirroring the runtime boundary (`RM-17`). |
| `durationMs` | O | number | Wall-clock duration. |
| `omissions` | O | array | Fields deliberately withheld, e.g. because they would carry a secret (`RM-5`). |
| `omissions[].field` | M (cond.) | string | Field path withheld. |
| `omissions[].reason` | M (cond.) | enum | `secret` / `unavailable` / `not-applicable` / `policy`. |
| `notes` | O | string | Free-form, non-secret. Must not contain conclusions (`RM-6`). |

### 3.1 `sourceBundle.refs[]`

| Field | Req | Type | Purpose |
| --- | --- | --- | --- |
| `kind` | M (cond.) | enum | `source-map` / `semantic-card` / `evidence` / `prompt` / `schema` / `other`. |
| `ref` | M (cond.) | string | Path or identifier. Must not be a production Vault path. |
| `digest` | O | string | Content digest, when computable. |

---

## 4. Required vs optional — with conditions

- **Always required:** `contractVersion`, `status`, `runId`, `startedAt`,
  `git.commit`, `runtime.kind`, `runtime.version`, `versions.prompts`,
  `versions.schemas`.
- **`versions.prompts` / `versions.schemas`:** always present, but **may be an
  empty object** when the run genuinely used no prompts or no schemas (e.g. a
  pure filesystem check). An empty object is an assertion of "none"; omission
  would be ambiguous.
- **`git.commit`:** required, but the literal value `"unknown"` is permitted
  when the run happened outside a repository. This is deliberate: the absence
  must be visible rather than hidden behind a missing field.
- **`git.dirty`:** always present. When `true`, `dirtyPaths` is required in
  spirit (see ambiguity A2).
- **`model.resolved`:** optional as a whole, because many runtimes cannot
  report it. When absent, `omissions[]` should record why.
- **`omissions[]`:** optional, but required in spirit whenever a field with a
  real value was deliberately withheld. Not schema-enforced (A3).
- **`usage`:** optional; `availability` semantics follow the runtime boundary
  contract, so absent ≠ zero.
- **`caseId`:** optional, but when present its `availability` must be stated
  so `not-applicable` (an exploratory run) is distinguishable from `unknown`
  (a case that should have been recorded).

---

## 5. Enumerations

| Enum | Values |
| --- | --- |
| `status` | `draft`, `NEEDS_REVIEW`, `reviewed` |
| `runtime.resolution` | `matched`, `substituted`, `unknown` |
| `model.resolved.availability` | `reported`, `unavailable`, `unknown` |
| `caseId.availability` | `present`, `not-applicable`, `unknown` |
| `sourceBundle.refs[].kind` | `source-map`, `semantic-card`, `evidence`, `prompt`, `schema`, `other` |
| `omissions[].reason` | `secret`, `unavailable`, `not-applicable`, `policy` |
| `usage.availability` | `reported`, `partial`, `unavailable` (shared shape with the runtime contract) |

---

## 6. Design principles as executable statements

| ID | Invariant |
| --- | --- |
| RM-1 | Every uncontrolled variable that could invalidate a comparison is representable. |
| RM-2 | Requested and actual values are separately representable for model, runtime and reasoning. |
| RM-5 | No field, note or digest may contain a credential. |
| RM-6 | No conclusions, scores or interpretations appear in the manifest. |
| RM-11 | Absence is never silently equivalent to a default or to zero. |
| RM-12 | A run without a benchmark case is distinguishable from a run whose case was lost. |
| RM-18 | The manifest must be constructible incrementally: a crashed run can still emit a valid manifest with `finishedAt` absent. |

---

## 7. Example instance

```json
{
  "contractVersion": "run-manifest/0.1",
  "status": "draft",
  "runId": "run.20260922T190141Z.0001",
  "caseId": { "value": "case.asr-noise-001", "availability": "present" },
  "startedAt": "2026-09-22T19:01:41+08:00",
  "finishedAt": "2026-09-22T19:02:14+08:00",
  "git": {
    "commit": "178a5ec8fcd074bd9ce3b20d5d6105c22a1cbd28",
    "branch": "design/m1a-core-contracts",
    "dirty": true,
    "dirtyPaths": ["specs/source-map-v0.1.md"]
  },
  "runtime": { "kind": "dsh", "version": "0.1.6-alpha.2", "resolution": "matched" },
  "model": {
    "requested": "example-model-large",
    "resolved": { "value": "example-model-large", "availability": "reported" },
    "provider": "example-provider"
  },
  "reasoning": { "requested": "medium", "applied": "medium" },
  "versions": {
    "prompts": { "source-map.extract-units": "1" },
    "schemas": { "source-map/0.1": "0.1" },
    "contracts": { "run-manifest/0.1": "0.1" }
  },
  "sourceBundle": {
    "packageId": "pkg.bayes.lecture03",
    "refs": [
      { "kind": "evidence", "ref": "test-vault/raw/lecture03.asr.txt" },
      { "kind": "source-map", "ref": "runs/.../source-map.json" }
    ]
  },
  "platform": { "os": "Windows 11 (NT 10.0.26200.0)", "node": "v22.23.2", "environmentRef": "docs/ENVIRONMENT.md" },
  "usage": { "inputTokens": 1830, "outputTokens": 604, "availability": "reported" },
  "durationMs": 33000,
  "omissions": [
    { "field": "platform.repoRef", "reason": "policy" },
    { "field": "usage.cost", "reason": "unavailable" }
  ]
}
```

---

## 8. Counterexamples / failure cases

| # | Failure | Why the contract rejects or resists it |
| --- | --- | --- |
| F1 | Manifest records only a commit SHA while the tree was dirty. | `git.dirty` + `dirtyPaths` required (`RM-3`). |
| F2 | `model.resolved` omitted, downstream assumes it equals `requested`. | `model.resolved.availability` and `omissions[]` make absence explicit (`RM-2`, `RM-4`). |
| F3 | `versions.prompts` omitted because the run "used the default prompt". | Required field; an empty object is an assertion, omission is not (`RM-7`). |
| F4 | Manifest embeds the request headers for debugging. | `RM-5`; `omissions[]` exists precisely so the value need not be stored. |
| F5 | Manifest contains the audit score. | `RM-6`: outcomes belong in results artifacts. |
| F6 | `usage` records zeros because usage was unavailable. | `availability` must be `unavailable` (`RM-11`); zeros mean measured zero. |
| F7 | A crashed run emits no manifest at all. | `finishedAt` is optional so a partial manifest is valid (`RM-18`). |
| F8 | `sourceBundle.refs` points at the user's production Vault. | `AGENTS.md` §3.1; refs must be experiment paths. |
| F9 | `runtime.version` hard-coded from documentation instead of resolved at run time. | `runtime.resolution` plus `D-0003`'s requirement to record the actually resolved version. |
| F10 | `caseId` omitted so a lost case looks like an exploratory run. | `caseId.availability` distinguishes `not-applicable` from `unknown` (`RM-12`). |

---

## 9. Known ambiguities

- **A1 — Digest algorithms unspecified.** `sourceBundle.digest` and
  `refs[].digest` do not name an algorithm, so digests are not comparable
  across implementations.
- **A2 — `dirtyPaths` requiredness is unenforced.** JSON Schema cannot express
  "required when `dirty` is true" cleanly; needs a validator rule.
- **A3 — `omissions[]` is entirely voluntary.** A producer that simply forgets a
  field is indistinguishable from one that withheld it. The field documents
  intent but cannot compel it.
- **A4 — `model.resolved` nests an availability enum inside an optional object**
  while `model.requested` is a bare string. The asymmetry is deliberate but
  reads inconsistently.
- **A5 — Where run artifacts live is undecided.** `runs/` is the M0 convention
  and is git-ignored; whether manifests are committed, and where, is not decided
  by this contract.
- **A6 — `platform.environmentRef` is a pointer, not data.** If the referenced
  document changes, old manifests silently point at a different environment.
- **A7 — Contract version vs schema version.** `contractVersion` and
  `versions.contracts` overlap; which is authoritative for a given manifest is
  unclear.
- **A8 — No redaction policy.** `notes` and `omissions[].field` are free text;
  a careless producer can still leak a value into `notes`.

---

## 10. Open questions requiring human review

| ID | Question | Why it needs a human |
| --- | --- | --- |
| Q1 | Are manifests committed to Git, ignored like `runs/`, or both? | Reproducibility vs repository noise. |
| Q2 | Should `omissions[]` be mandatory whenever any optional field is absent? | Determines whether absence is trustworthy. |
| Q3 | Should `platform` be a digest of the environment doc rather than a path? | Fixes A6, but makes manifests brittle to doc edits. |
| Q4 | Is `runtime.kind` acceptable in a manifest given `RT-19`'s replacement goal? | Cross-contract consistency question. |
| Q5 | Should `usage.cost` be recorded at all in v0.1? | Cost policy is deliberately out of scope. |
| Q6 | Which digest algorithm is canonical (`sha256` assumed but unstated)? | Comparability. |
| Q7 | Does a manifest need a `schemaVersionOfItself` field for forward migration? | Versioning strategy. |

---

## 11. What this spec deliberately does not decide

- run output storage and promotion into `benchmark/results/` (`AGENTS.md` §4);
- scoring or audit fields;
- retry policy;
- digest algorithms (`A1`, `Q6`);
- whether manifests are committed (`A5`, `Q1`).
