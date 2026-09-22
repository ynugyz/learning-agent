# RunManifest v0.1 — design specification (REV1)

> **Status: DRAFT — NOT IMPLEMENTATION-STABLE.**
> Revised under human adjudication during M1A REV1.
> This contract has **not passed human review** as a finished design. Milestone
> M0 itself is still awaiting final human approval.

- Requirement IDs: `RM-1` … `RM-22` (see the requirement index in §10)
- Related: `AGENTS.md` §9, `docs/ARCHITECTURE.md` §6, `docs/ENVIRONMENT.md`,
  `specs/agent-runtime-v0.1.md`
- Machine contract: `schemas/run-manifest.v0.1.schema.json`
- Type draft: `src/contracts/run-manifest.ts`
- Adjudication record: `docs/reviews/M1A_HUMAN_ADJUDICATION_REV1.md`

---

## 1. Design rationale

### RM-1 — The manifest is a reproducibility record, not a log

Its purpose is to make "is comparison A vs B valid?" answerable **without**
re-running anything. Anything that could silently invalidate a comparison
belongs here (`AGENTS.md` §9).

### RM-2 — Requested and actual are separately recorded, and must be self-consistent

The most common invisible cause of invalid comparison is a substitution nobody
noticed — a different model, runtime build or prompt revision. Every
"requested" field is therefore paired with an "actual" one (`RM-8`, `RM-9`,
`RM-10`).

**Adjudicated (REV1).** This pairing must be **computable from the manifest's
own data** (`RM-11`). The previous revision exposed a
`runtime.resolution: matched` status while recording no requested runtime
anywhere, so the status was unfillable. A `resolution` status is now only
representable together with both sides of the comparison.

### RM-3 — Absence is explicit and carries a reason

**Adjudicated (REV1).** A core reproducibility field may not simply be missing.
Where a value cannot be obtained, the manifest records `unavailable` **plus a
reason** (`RM-12`). A status such as `reported` may not be asserted without the
value that proves it. `unknown` is not a legal state for a field the manifest
claims to record.

### RM-4 — Git dirty state is first-class

A commit hash alone is misleading whenever the working tree was modified. Dirty
state and the changed paths are recorded, so a run from a dirty tree is
visibly different from one on a clean tree rather than silently incomparable.
When the run happened outside a repository, the manifest says so explicitly
instead of fabricating a clean tree (`RM-13`).

### RM-5 — No secrets and no host-specific paths

The manifest is a shared artifact. It must contain no API key, token, password,
credential or request header (`AGENTS.md` §3.2), and no local machine path that
would leak the user's environment (`RM-21`). `omissions[]` lets a producer
record **that** something was withheld without recording the value (`RM-14`).

### RM-6 — The manifest describes a run, not the result

Outcomes, scores and interpretations belong to results/audit artifacts. A
manifest carrying conclusions stops being comparable across code changes.

### RM-7 — Fingerprints default to SHA-256

**Adjudicated (REV1).** Content fingerprints in this contract are SHA-256. The
algorithm field is optional and, when omitted, means SHA-256 (`RM-15`). One
default beats an unstated assumption that makes digests incomparable.

### RM-8 — Manifests are generated run artifacts

**Adjudicated (REV1).** A run manifest is generated output under `runs/` and is
**not committed to Git** by default. When a run is promoted to a reference
benchmark, the manifest is retained **together with its results** in
`benchmark/results/` (`RM-22`). This keeps the repository free of run spam while
making promoted results self-describing.

---

## 2. Scope

**In scope:** the reproducibility record for one experiment run.

**Out of scope:** outputs and scores; benchmark Gold data; audit findings; cost
policy; credential handling; run artifact storage layout beyond the `runs/`
convention.

---

## 3. Field table

`Req`: **M** = required, **O** = optional, **Cond.** = conditional.

| Field | Req | Type | Purpose |
| --- | --- | --- | --- |
| `contractVersion` | M | string (const) | `"run-manifest/0.1"`. |
| `schemaVersion` | **M** | string (const) | `"0.1"`. Required (`RM-16`). |
| `status` | M | enum | `draft` / `NEEDS_REVIEW` / `reviewed`. |
| `runId` | M | string (non-empty) | Unique id for this run. |
| `caseId` | M | tagged union | Which case, or an explicit reason there is none (`RM-17`). |
| `caseId.availability` | M (cond.) | enum | `present` / `not-applicable` / `unavailable`. |
| `caseId.value` | M (cond.) | string (non-empty) | Required when `present`. |
| `caseId.reason` | M (cond.) | string (non-empty) | Required when not `present`. |
| `startedAt` | M | string | ISO-8601 timestamp with offset. |
| `finishedAt` | O | string | ISO-8601; absent for a crashed/incomplete run (`RM-18`). |
| `git` | M | object | Repository state (`RM-4`). |
| `git.availability` | M (cond.) | enum | `present` / `unavailable`. |
| `git.commit` | M (cond.) | string (non-empty) | Required when `present`. |
| `git.dirty` | M (cond.) | boolean | Required when `present`. |
| `git.branch` | O | string (non-empty) | |
| `git.dirtyPaths` | O | array of string | Changed paths when `dirty` (`RM-19`). |
| `git.reason` | M (cond.) | string (non-empty) | Required when `unavailable`. |
| `git.worktreeRef` | O | string (non-empty) | Symbolic reference, e.g. a branch name. Never an absolute local path (`RM-21`). |
| `runtime` | M | tagged union | Requested vs resolved (`RM-2`, `RM-11`). |
| `runtime.availability` | M (cond.) | enum | `present` / `unavailable`. |
| `runtime.requested` | M (cond.) | object | Required when `present` (`RM-11`). |
| `runtime.requested.kind` | M (cond.) | string (non-empty) | |
| `runtime.requested.version` | O | string (non-empty) | May itself be unknown; see `RUNTIME-11`. |
| `runtime.resolved` | M (cond.) | object | Required when `present`. |
| `runtime.resolved.kind` | M (cond.) | string (non-empty) | |
| `runtime.resolved.version` | M (cond.) | string (non-empty) | Version actually resolved at run time. |
| `runtime.resolution` | M (cond.) | enum | `matched` / `substituted` / `unknown`. |
| `runtime.reason` | M (cond.) | string (non-empty) | Required when `unavailable`. |
| `model` | M | object | Model identity (`RM-9`). |
| `model.requested` | O | string (non-empty) | |
| `model.resolved` | M | tagged union | Required; value or reason (`RM-12`). |
| `model.provider` | O | string (non-empty) | |
| `reasoning` | O | object | Reasoning configuration actually applied (`RM-10`). |
| `versions` | M | object | The version bundle making the run reproducible. |
| `versions.prompts` | M (cond.) | object | Map prompt id → version (`RM-20`). |
| `versions.schemas` | M (cond.) | object | Map schema id → version. |
| `versions.contracts` | O | object | Map contract id → version. |
| `sourceBundle` | O | object | What inputs were consumed. |
| `sourceBundle.packageId` | O | string (non-empty) | Matches a SourceMap `sourcePackageId`. |
| `sourceBundle.refs` | O | array of object | Individual inputs. |
| `sourceBundle.digest` | O | object | Content fingerprint (`RM-15`). |
| `platform` | O | object | Environment reference (`RM-13`). |
| `platform.environmentRef` | O | string (non-empty) | Pointer to a recorded environment doc, e.g. `docs/ENVIRONMENT.md`. |
| `usage` | O | tagged union | Token usage, or a reason it is unavailable (`RM-12`). |
| `durationMs` | O | number | Wall-clock duration. |
| `omissions` | O | array | Fields deliberately withheld (`RM-14`). |
| `notes` | O | string (≤600) | Free-form, non-secret. No conclusions (`RM-6`). |

---

## 4. Required vs optional — with conditions

- **Always required:** `contractVersion`, `schemaVersion`, `status`, `runId`,
  `caseId`, `startedAt`, `git`, `runtime`, `model.resolved`,
  `versions.prompts`, `versions.schemas`.
- **`RM-12` — no silent absence on a core field.** `caseId`, `git`, `runtime`
  and `model.resolved` are always present as tagged unions. When the data is not
  obtainable, the tag is `unavailable`/`not-applicable` **and a non-empty
  `reason` is required**. `git.availability: present` requires both `commit` and
  `dirty`.
- **`RM-11` — resolution is computable.** `runtime.resolution` may only appear
  inside a `runtime` object that carries **both** `requested` and `resolved`.
  There is no `resolution` without a requested side to compare against.
- **`versions.prompts` / `versions.schemas`:** always present, but may be an
  empty object when the run genuinely used no prompts or no schemas. An empty
  object asserts "none"; omission would be ambiguous (`RM-20`).
- **`git.dirtyPaths`:** required in spirit when `dirty` is true (see ambiguity
  A1). Not schema-enforced.
- **`omissions[]`:** optional, but expected whenever a field with a real value
  was deliberately withheld (`RM-14`). Its `reason` vocabulary includes
  `secret`, which is the *only* sanctioned way to reference a withheld secret —
  the value itself must never appear.
- **`finishedAt`:** optional so a crashed run can still emit a valid manifest
  (`RM-18`).

---

## 5. Enumerations

| Enum | Values |
| --- | --- |
| `status` | `draft`, `NEEDS_REVIEW`, `reviewed` |
| `caseId.availability` | `present`, `not-applicable`, `unavailable` |
| `git.availability` | `present`, `unavailable` |
| `runtime.availability` | `present`, `unavailable` |
| `runtime.resolution` | `matched`, `substituted`, `unknown` |
| `model.resolved.availability` | `available`, `unavailable` |
| `sourceBundle.refs[].kind` | `source-map`, `semantic-card`, `evidence`, `prompt`, `schema`, `other` |
| `omissions[].reason` | `secret`, `unavailable`, `not-applicable`, `policy` |
| `usage.availability` | `reported`, `partial`, `unavailable` |
| `fingerprint.alg` | `sha256` (**default**) |

---

## 6. Design principles as executable statements

| ID | Invariant |
| --- | --- |
| RM-1 | Every uncontrolled variable that could invalidate a comparison is representable. |
| RM-2 | Requested and actual values are separately representable for model, runtime and reasoning. |
| RM-5 | No field, note, digest or reference may contain a credential or a host-specific path. |
| RM-6 | No conclusions, scores or interpretations appear in the manifest. |
| RM-11 | A `resolution` status is only representable with both sides of the comparison present. |
| RM-12 | Absence is never silent: a core field is either present with its value or tagged unavailable with a reason. |
| RM-16 | `schemaVersion` is required. |
| RM-18 | A partial manifest is valid: a crashed run can still be recorded. |

---

## 7. Example instance

```json
{
  "contractVersion": "run-manifest/0.1",
  "schemaVersion": "0.1",
  "status": "draft",
  "runId": "run-20260922T190141Z-0001",
  "caseId": {
    "availability": "present",
    "value": "case-asr-noise-001"
  },
  "startedAt": "2026-09-22T19:01:41+08:00",
  "finishedAt": "2026-09-22T19:02:14+08:00",
  "git": {
    "availability": "present",
    "commit": "ce8fd2aec629cb5965e25abb9ac227826a981f93",
    "branch": "design/m1a-core-contracts",
    "dirty": true,
    "dirtyPaths": [
      "specs/source-map-v0.1.md"
    ],
    "worktreeRef": "design/m1a-core-contracts"
  },
  "runtime": {
    "availability": "present",
    "requested": {
      "kind": "dsh"
    },
    "resolved": {
      "kind": "dsh",
      "version": "0.1.6-alpha.2"
    },
    "resolution": "matched"
  },
  "model": {
    "requested": "example-model-large",
    "resolved": {
      "availability": "available",
      "value": "example-model-large"
    },
    "provider": "example-provider"
  },
  "reasoning": {
    "requested": "medium",
    "applied": "medium"
  },
  "versions": {
    "prompts": {
      "source-map.extract-units": "1"
    },
    "schemas": {
      "source-map/0.1": "0.1"
    },
    "contracts": {
      "run-manifest/0.1": "0.1"
    }
  },
  "sourceBundle": {
    "packageId": "pkg-bayes-lecture03",
    "refs": [
      {
        "kind": "evidence",
        "ref": "fixtures/bayes-lecture03/transcript.asr.txt",
        "digest": {
          "alg": "sha256",
          "value": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        }
      }
    ]
  },
  "platform": {
    "environmentRef": "docs/ENVIRONMENT.md"
  },
  "usage": {
    "availability": "reported",
    "inputTokens": 1830,
    "outputTokens": 604,
    "totalTokens": 2434
  },
  "durationMs": 33000,
  "omissions": [
    {
      "field": "model.provider",
      "reason": "unavailable"
    }
  ]
}
```

### 7.1 Example: a run outside a repository, with an unrereportable resolved model

```json
{
  "runtime": { "availability": "unavailable", "reason": "Runtime version could not be resolved on this host." },
  "git": { "availability": "unavailable", "reason": "Run executed outside a Git work tree." },
  "model": { "resolved": { "availability": "unavailable", "reason": "Runtime does not expose the resolved model." } },
  "usage": { "availability": "unavailable" }
}
```

---

## 8. Counterexamples / failure cases

| # | Failure | Why the contract rejects or resists it |
| --- | --- | --- |
| F1 | Commit SHA recorded while the tree was dirty. | `git.dirty` required whenever `git` is present (`RM-4`). |
| F2 | `runtime.resolution: matched` with no requested runtime recorded. | Not representable: `resolution` requires both `requested` and `resolved` (`RM-11`). |
| F3 | `model.resolved.availability: available` with no value. | `available` requires the value (`RM-12`). |
| F4 | A core field simply omitted when it could not be obtained. | Core fields are always present; absence is `unavailable` + non-empty reason (`RM-12`). |
| F5 | Non-repository run fabricates a clean tree. | `git.availability: unavailable` with a reason (`RM-13`). |
| F6 | `versions.prompts` omitted because a "default prompt" was used. | Required field; an empty object asserts none (`RM-20`). |
| F7 | Manifest embeds request headers for debugging. | `RM-5`; use `omissions[].reason: secret` instead. |
| F8 | Manifest embeds an absolute local install path. | `RM-21`; `git.worktreeRef` is symbolic and `platform` points at a documented environment. |
| F9 | Manifest records the audit score. | `RM-6`: outcomes belong in results artifacts. |
| F10 | `usage` records zeros because usage was unavailable. | `availability: unavailable` (`RM-12`); zeros mean a measured zero. |
| F11 | A crashed run emits no manifest at all. | `finishedAt` optional (`RM-18`). |
| F12 | `sourceBundle.refs` points at the user's production Vault. | `AGENTS.md` §3.1; refs must be experiment paths. |
| F13 | `runtime.resolved.version` hard-coded from documentation. | `runtime.resolved.version` is the value resolved at run time; `runtime.resolution` records whether it matched the request. |
| F14 | `caseId` omitted so a lost case looks like an exploratory run. | `caseId` is required with `not-applicable` vs `unavailable` distinguished (`RM-17`). |
| F15 | `schemaVersion` missing. | Required (`RM-16`). |
| F16 | Manifests for every run committed to Git. | `RM-22`: generated artifacts stay under `runs/`; promotion is deliberate. |

---

## 9. Known ambiguities and open questions

### Known ambiguities (accepted at v0.1)

- **A1 — `git.dirtyPaths` requiredness is unenforced.** JSON Schema cannot
  express "required when `dirty` is true" without hurting readability. Needs a
  validator rule or stays a design rule. Tracked as **OPEN**.
- **A2 — `omissions[]` remains voluntary.** A producer that simply forgets is
  indistinguishable from one that withheld. Tracked as **OPEN**.
- **A3 — `platform.environmentRef` is a pointer, not data.** If the referenced
  document changes, old manifests silently point at a different environment.
- **A4 — `reasoning.requested`/`.applied` asymmetry** with the union-typed
  fields elsewhere is deliberate (reasoning is not a core reproducibility field)
  but reads inconsistently.
- **A5 — digest algorithm inside `sourceBundle.digest` is a nested
  `fingerprint`** whose `alg` may be omitted; SHA-256 is then assumed (`RM-15`).

### Open questions requiring human review

| ID | Question |
| --- | --- |
| Q1 | Should `omissions[]` be mandatory whenever any optional field is absent? |
| Q2 | Should `platform` carry a digest of the environment document instead of a path? |
| Q3 | Is `runtimeKind` acceptable in a manifest given the runtime replacement goal? |
| Q4 | Who enforces `dirtyPaths`-when-dirty, and where does that validator live? |
| Q5 | Is `benchmark/results/` the right retention location for promoted manifests? |

---

## 10. Requirement index

| ID | Requirement |
| --- | --- |
| RM-1 | The manifest makes run comparability decidable without re-running. |
| RM-2 | Requested and actual values are separately representable. |
| RM-3 | Every core reproducibility field is present in some form. |
| RM-4 | Git dirty state is first-class and recorded. |
| RM-5 | The manifest contains no credential. |
| RM-6 | The manifest contains no conclusion, score or interpretation. |
| RM-7 | Content fingerprints default to SHA-256. |
| RM-8 | Runtime identity is recorded as actually resolved. |
| RM-9 | Model identity is recorded as requested and as resolved. |
| RM-10 | Reasoning configuration actually applied is recorded. |
| RM-11 | `runtime.resolution` is computable from the manifest's own data: it requires both a requested and a resolved runtime. |
| RM-12 | A core field is never silently missing: it is present with a value, or tagged unavailable with a non-empty reason. |
| RM-13 | A run outside a repository says so instead of fabricating repository state. |
| RM-14 | A withheld field is recorded as an omission with a reason, never as a value. |
| RM-15 | Fingerprints are SHA-256, with the algorithm optional and defaulted. |
| RM-16 | `schemaVersion` is required. |
| RM-17 | A run without a benchmark case is distinguishable from one whose case reference was lost. |
| RM-18 | A partial manifest is valid, so a crashed run can still be recorded. |
| RM-19 | Changed paths are recorded when the tree is dirty. |
| RM-20 | Prompt and schema versions are present; an empty object asserts that none were used. |
| RM-21 | The manifest contains no host-specific or sensitive local path. |
| RM-22 | Manifests are generated artifacts under `runs/` and are retained with results only when promoted to a reference benchmark. |

### Reconciliation with the previous revision

| Previous | Now |
| --- | --- |
| `runtime.version` + `resolution` with no requested runtime | tagged union with `requested` **and** `resolved` (`RM-11`) |
| `caseId` optional with a loose `availability` | required tagged union with a reason for absence (`RM-12`, `RM-17`) |
| `model` required but allowed to be `{}` | `model.resolved` required as a tagged union (`RM-12`) |
| `git.commit` / `dirty` required, no non-repo case | `git.availability` tagged union (`RM-13`) |
| `usage` redefined locally and diverging from TS | one local definition, single source of truth (`RM-12`) |
| no `schemaVersion` | required (`RM-16`) |
| `sourceBundle.refs[].digest` as a bare string | fingerprint object with SHA-256 default (`RM-15`) |
| "manifests committed?" unanswered | generated under `runs/`, retained on promotion (`RM-22`) |
| `platform.os` / `.node` / `.shell` free strings | reduced to `environmentRef` to avoid host-specific data (`RM-21`) |
