# Decision Log

Architectural decisions that may affect future work are recorded here. Chat
history is **not** a record.

## Format

```
### D-NNNN — <title>
- Date: YYYY-MM-DD
- Status: accepted | proposed | NEEDS_REVIEW | superseded by D-NNNN
- Decision: ...
- Rationale: ...
- Alternatives considered: ...
- Consequences: ...
```

---

### D-0001 — Repository layout follows AGENTS.md §12
- Date: 2026-09-22
- Status: accepted
- Decision: Create the skeleton exactly as sketched in `AGENTS.md` §12, adding
  two directories: `tools/` (reproducible repository checks) and `docs/`
  file `ENVIRONMENT.md` (recorded toolchain/environment facts).
- Rationale: The documented layout already separates product logic, pipeline,
  runtime adapter, benchmark and future plugin. The two additions are
  non-architectural: `tools/` holds only checks, and `ENVIRONMENT.md` records
  facts needed for experiment reproducibility (AGENTS.md §9).
- Alternatives considered: (a) wait for human confirmation of the exact tree;
  (b) fold checks into a `scripts/` dir. (a) wastes a round trip on a purely
  mechanical choice; (b) `tools/` reads better for developer tooling.
- Consequences: Later milestones may still add or rename directories, but
  `src/core`, `src/pipeline`, `src/runtime/dsh` are treated as stable names.

### D-0002 — Empty areas get placeholder READMEs, not fake implementations
- Date: 2026-09-22
- Status: accepted
- Decision: Every empty directory carries a concise `README.md` stating its
  future responsibility. No stub code, no invented APIs, no fabricated
  benchmark Gold data.
- Rationale: AGENTS.md §12 explicitly forbids inventing fake production
  implementation to fill directories, and §16 requires `TODO` / `UNKNOWN`
  markers over plausible-looking generated content.
- Alternatives considered: `.gitkeep` files plus a single top-level roadmap.
  Rejected: readers would have to guess each directory's purpose.
- Consequences: Placeholders must be replaced, not silently accumulated, when
  their layer is implemented.

### D-0003 — DSH is treated as an external runtime at M0; pinning strategy deferred
- Date: 2026-09-22
- Status: accepted (scope: M0 only)
- Decision:
  - M0 does **not** vendor, modify, install, upgrade or project-pin the current
    DSH. It is consumed as an already-installed external runtime.
  - Whether later milestones adopt a project-local exact version, some other pin
    strategy, or keep DSH as an external runtime is **not decided here**. That
    choice is deferred until the `AgentRuntime` / DSH adapter work has been
    attempted, and it is a human decision.
  - Every experiment run must record the DSH version actually resolved at run
    time, whatever the eventual pinning strategy turns out to be.
  - The currently installed `0.1.6-alpha.2` is an **environment fact**, not a
    standing architectural commitment of this project.
- Rationale: `AGENTS.md` §5 forbids modifying global software and DSH source
  without approval, and §9 requires the DSH version to be recorded per
  experiment. Committing the project to a pinning policy before the adapter
  exists would settle a dependency-management question on no evidence
  (`AGENTS.md` §18: add complexity only when experiments justify it). DSH also
  lives outside this repository (`D:\Enviroment\nodejs\node_modules\@deepseek-ai\dsh`).
- Alternatives considered: (a) project-pin `@deepseek-ai/dsh` now for
  reproducibility — attractive, but it fixes a dependency-management strategy
  before the adapter reveals what actually needs pinning (the package, the CLI
  invocation, or nothing); (b) declare DSH permanently unpinned — rejected as a
  premature permanent commitment in the opposite direction.
- Consequences: Reproducibility today rests on the machine's installed DSH, so
  run manifests must capture the detected version and cross-version comparisons
  stay invalid until that is recorded. This decision must be revisited in M1/M2
  with adapter evidence and closed by human review.

### D-0004 — No project dependencies are introduced at M0
- Date: 2026-09-22
- Status: accepted
- Decision: M0 ships no `package.json`, no `pyproject.toml`, no lockfile. The
  only executable artifact is `tools/check.ps1`, written against Windows
  PowerShell using the already-installed toolchain.
- Rationale: AGENTS.md §5 and §18 require project-local, reversible, inspectable
  choices and forbid premature abstraction. Adding a manifest would force a
  language/runtime decision (D-0005) before any experiment justifies it.
- Alternatives considered: a minimal Node `package.json` with a `check` script
  for cross-platform convenience. Rejected for now: it implicitly selects the
  Node/TypeScript track and adds a convention the project has not decided on.
- Consequences: When the first real module lands, this decision must be
  revisited and a lockfile committed in the same change.

### D-0005 — TypeScript is the primary implementation language (human ruling)
- Date: 2026-09-22
- Status: accepted (human ruling recorded during M1A; supersedes the M0 deferral)
- Decision: TypeScript is the Learning Agent's primary implementation language.
  - `src/core` → TypeScript
  - `src/pipeline` → TypeScript
  - `src/modules` → TypeScript
  - `src/runtime` → TypeScript
  - the future Obsidian plugin → TypeScript
  - `src/contracts` (added in M1A to hold the four core contracts) → TypeScript
  - **Python is not a core runtime language.** It may be used later for offline
    experiment analysis, statistics or research scripts, but only when a
    concrete need exists. No Python package layout is created now.
- Rationale: (a) DSH is a Node/TypeScript runtime, so the adapter boundary needs
  no cross-language bridge; (b) the future Obsidian plugin is TypeScript, so the
  plugin becomes a client rather than a re-implementation; (c) JSON Schema and
  TypeScript types can be kept structurally aligned, which is hard across
  languages. The M0 host has Node v22.23.2 and pnpm 11.7.0 available.
- Alternatives considered: (a) Python — strong analysis ecosystem, but would
  force interop with the DSH adapter and the plugin; (b) a split
  (TS transport + Python analysis) — rejected for now as two toolchains and two
  validation paths before any experiment justifies it.
- Consequences: This unblocks the first real module. **No dependency is
  installed and no implementation is written by this decision** — M1A is
  design-only. A `package.json` scaffold with no dependencies is added in M1A
  so `npm run typecheck` becomes available once `typescript` is deliberately
  installed; no lockfile exists yet. Python remains available on the host for
  future offline scripts without becoming part of the core runtime.

### D-0006 — Test vault is a disposable sandbox with a tracked machine layer
- Date: 2026-09-22
- Status: accepted
- Decision: `test-vault/` holds only a minimal sandbox vault plus
  `.learning-agent/` metadata. The vault's note content is git-ignored
  wholesale; the `.learning-agent/` metadata directory is explicitly tracked.
  The production Vault is never read into or referenced by this repository.
  **See D-0010: this sandbox location is a development convenience and does
  not decide where machine-layer data lives in a real Obsidian Vault.**
- Rationale: AGENTS.md §3.1 requires experiments to use a test vault,
  fixtures or snapshots. Tracking the machine-layer metadata makes sandbox
  state and generated artifacts inspectable and diffable, which is the point
  of the sandbox.
- Alternatives considered: tracking the whole test vault (risk of drifting
  toward real notes) or tracking nothing (no reviewable sandbox state).
- Consequences: `.gitignore` needs explicit negations, which must be preserved
  as the vault grows. Nothing here may ever be pointed at a production Vault.

### D-0007 — Seed schemas are placeholder drafts, not frozen contracts
- Date: 2026-09-22
- Status: proposed
- Decision: Include three draft JSON Schemas (`source-map.schema.json`,
  `lesson-model.schema.json`, `semantic-card.schema.json`) marked
  `"$comment": "DRAFT — NEEDS_REVIEW"`, with `version` and `status` fields so
  later incompatibilities are detectable.
- Rationale: AGENTS.md §12 asks for schema placeholders. Schemas make the
  layer boundaries concrete enough to discuss, and `tools/check.ps1` can verify
  they parse as JSON. Inventing final field sets would overreach.
- Alternatives considered: prose-only placeholders in `schemas/README.md`.
  Rejected: JSON Schema is cheap and immediately machine-checkable.
- Consequences: Any incompatible change to these drafts is a review-gated
  situation (AGENTS.md §15). No implementation may treat them as stable.

**Schema review status (as of REVIEW_GATE_M0_REV1):** the three schemas are
retained unchanged as discussion drafts. **None of them has passed human schema
review**, and no implementation code may treat any of them as a stable
contract. Fields are expected to change; see D-0007.

### D-0008 — Repository stores LF; Windows scripts are checked out CRLF
- Date: 2026-09-22
- Status: accepted
- Decision: Add `.gitattributes` with `* text=auto eol=lf` plus explicit
  `text eol=crlf` for `*.ps1`, `*.psm1`, `*.psd1`, `*.cmd`, `*.bat`; add a
  matching `.editorconfig`.
- Rationale: The M0 host is Windows, so Git defaulted to CRLF in the working
  tree and emitted warnings on every add (`AGENTS.md` §18 asks for reproducible,
  inspectable state). A single stored line ending keeps diffs stable across
  machines and future CI, while PowerShell 5.1 script parsing stays safe with
  CRLF. `pwsh` is absent on this host, so `.ps1` files must remain 5.1-clean.
- Alternatives considered: (a) accept Git's platform default — non-reproducible
  diffs, noisy warnings; (b) normalize everything to LF including `.ps1` —
  works under PowerShell 7 but risks 5.1 edge cases on multi-line constructs.
- Consequences: `git add --renormalize .` was run once; the working tree of
  pre-existing files (`AGENTS.md`) still shows CRLF until it is next rewritten,
  which is harmless because the index is already LF. Any future change to these
  rules requires renormalizing again.

### D-0009 — Git initialized here; the first commit is left for human review
- Date: 2026-09-22
- Status: accepted
- Decision: Run `git init -b main` because `REVIEW_GATE_M0` requires a
  reportable Git status and AGENTS.md §13 step 16 asks for a *prepared* commit.
  Stage the bootstrap, but do not author the commit until the human approves
  the tree at the review gate.
- Rationale: `main` represents stable runnable state (AGENTS.md §4). An
  unreviewed bootstrap commit would claim stability the tree has not earned.
  The tree contents are fully inspectable while staged, so review costs
  nothing.
- Alternatives considered: committing immediately with a conventional message,
  then amending after review. Rejected: rewriting history is exactly what
  AGENTS.md §3.4 prohibits without a gate.
- Consequences: The repository has no commits at the gate; `git status` shows
  a staged initial commit. Nothing is pushed anywhere.
### D-0010 — Machine-layer physical layout in a Vault is NOT decided
- Date: 2026-09-22
- Status: NEEDS_REVIEW
- Decision: `test-vault/.learning-agent/` is a **development/test sandbox
  location only**. It does not express, imply or pre-select the eventual
  physical layout of SemanticCard data in a real Obsidian Vault. Whether that
  layout is Vault-root centralized, module-local sidecar files, a database, or
  something else remains **undecided and review-gated**.
- Rationale: The sandbox needs *some* directory to exist at M0 so the layer
  boundary is concrete, and a vault-local `.learning-agent/` directory is the
  cheapest reversible choice. It is not evidence for a product decision:
  the test vault has no real modules, no scale constraints, no sync conflicts
  and no Obsidian plugin. Deriving a storage architecture from it would be
  exactly the premature commitment `AGENTS.md` §18 warns against, and changing
  a knowledge-storage layout later is the kind of irreversible migration §15
  places behind human review.
- Alternatives considered: (a) leave the sandbox vault without a machine layer
  at all — rejected, the layer boundary would stay abstract; (b) pick a
  candidate layout now (e.g. sidecar-per-note) — rejected as unfounded;
  (c) store the sandbox layer outside the vault tree — rejected because the
  human-note/machine-layer join (`AGENTS.md` §7) is what the sandbox exists to
  exercise.
- Consequences: Anything written under `test-vault/.learning-agent/` is
  sandbox-shaped and must be assumed throwaway. Storage-layout questions must
  be answered by a human decision recorded here before any production Vault
  integration work starts. No code may hard-code the `.learning-agent/`
  directory name as a product-level assumption.


### D-0011 — The M1A core contract set exists as four explicit contracts
- Date: 2026-09-22
- Status: accepted (design record; the contracts themselves are DRAFT and
  **NEEDS_REVIEW** — see §15 of `AGENTS.md` on review gates)
- Decision: The Learning Agent's cross-cutting artifact shapes are defined as
  exactly four contracts, each with a prose spec, a draft JSON Schema and a
  TypeScript declaration file:

  | Contract | Answers | Spec |
  | --- | --- | --- |
  | **SemanticCard v0.1** | How is one concept indexed machine-readably without duplicating the human note? | `specs/semantic-card-v0.1.md` |
  | **SourceMap v0.1** | What is actually present in this source package, and what is missing? | `specs/source-map-v0.1.md` |
  | **AgentRuntime Boundary v0.1** | What may the pipeline ask of a runtime, and what comes back? | `specs/agent-runtime-v0.1.md` |
  | **RunManifest v0.1** | Is comparing this run with another valid? | `specs/run-manifest-v0.1.md` |

  The set is deliberately closed at four. A fifth contract requires its own
  decision entry.
- Rationale: `AGENTS.md` §14 requires architecture-affecting decisions to be in
  the log rather than only in chat history, and §12/§13 expect placeholder
  artifacts to be replaced by real ones. Four contracts is the minimum needed
  to make the Layer A–G pipeline and the runtime boundary describable:
  evidence structure (SourceMap), machine semantics (SemanticCard), execution
  (AgentRuntime) and reproducibility (RunManifest). Anything more would be
  design for a milestone that has not started (`AGENTS.md` §18).
- Alternatives considered: (a) deriving contracts one at a time as each module
  needs them — rejected because they reference each other
  (SemanticCard → SourceMap, RunManifest → AgentRuntime) and piecemeal design
  produced the circularity found in M1A; (b) defining `LessonModel`,
  alignment and `ChangePlan` at the same time — rejected as M1B work and as
  premature, since none of them has a consumer yet.
- Consequences: The M0 seed schemas were rederived rather than extended and are
  archived at `schemas/archive/m0-draft/`; `lesson-model` has **no successor**
  yet. Contracts live in `src/contracts` (D-0012) and are consumed by specs,
  schemas and code alike. The contracts are **DRAFT — NOT
  IMPLEMENTATION-STABLE**; no implementation may treat them as frozen, and an
  incompatible change remains review-gated.

### D-0012 — Contract types live in `src/contracts/`, not `src/runtime/` or `src/core/`
- Date: 2026-09-22
- Status: accepted
- Decision: The four contract type declarations live in a new neutral directory
  `src/contracts/`. `src/core`, `src/pipeline`, `src/modules` and
  `src/runtime/**` may all import from it. No contract type may live in
  `src/runtime/`, and `src/core` must not become the home for types that
  `src/runtime` needs.
- Rationale: The M0 sketch placed the runtime interface in `src/runtime/`, which
  would have forced `src/core` to import `src/runtime/` for shared types — the
  exact dependency direction `AGENTS.md` §3.3 and `docs/ARCHITECTURE.md` §4
  forbid. `src/core` is also the wrong home: it is product logic, and making
  `src/runtime` depend on product logic couples the replaceable boundary to the
  thing it exists to isolate. A neutral declarations-only directory keeps
  `core`/`pipeline`/`modules` → `contracts` and `runtime` → `contracts`, with
  no edge between `core` and `runtime` in either direction.
- Alternatives considered: (a) `src/runtime/agent-runtime.ts` (the M0 sketch) —
  rejected for the core→runtime edge; (b) `src/core/contracts.ts` — rejected for
  the runtime→core edge; (c) per-layer contract files with duplicated types —
  rejected because a shared contract with two definitions is not a contract.
- Consequences: `src/contracts/` holds declarations only and must contain no
  behaviour. A `tools/check.ps1` assertion guards the dependency boundary by
  rejecting `runtime/dsh` / `@deepseek-ai` module references anywhere outside
  the adapter. `docs/ARCHITECTURE.md` §4 and `src/runtime/README.md` were
  corrected to match. `ReviewStatus` and `SchemaVersion` — shared by all four
  contracts — live in `semantic-card.ts`, which is a **known wart** (`CH-15`):
  a shared scalar should have a neutral home, and this is recorded as an open
  issue rather than fixed by adding a fifth file in this revision.

### D-0013 — Project-local dev-only tooling: exact-pinned TypeScript and Ajv
- Date: 2026-09-22
- Status: accepted (M1A-V; supersedes the "zero dependencies at all" reading of
  D-0004 for **dev** dependencies only)
- Decision:
  - Add exactly two project-local **dev** dependencies, at **exact** versions:
    `typescript@5.9.3` (compiler) and `ajv@8.20.0` (JSON Schema draft-2020-12
    validator).
  - Commit the generated `package-lock.json`.
  - Install locally only. **Nothing is installed globally**, and DSH is not
    touched.
  - `dependencies` stays **empty**: no product/runtime dependency is introduced.
  - `tools/check.ps1` fails if either dev dependency is not exactly pinned, if
    the lockfile is missing, or if any runtime dependency appears.
- Rationale: M1A-V's purpose is to prove the contracts hold under real tooling
  rather than under prose. That is impossible without a compiler and a
  validator. Both are dev-only, so they never enter the shipped system, and
  `AGENTS.md` §5 requires project-local dependencies with exact versions where
  reproducibility matters.
- Alternatives considered: (a) relying on a globally installed `tsc` — rejected
  as unreproducible and as touching global software; (b) `ajv-cli` instead of
  `ajv` — rejected as a heavier dependency whose CLI provides no assertion
  strength the direct API lacks, and it would obscure the allowlist logic that
  makes the negative tests meaningful; (c) skipping executable verification —
  rejected because it is the entire point of the milestone; (d) `typescript@7`
  (the current `latest`) — rejected in favour of the mature 5.9 line for a
  verification milestone.
- Consequences: `npm install` becomes a prerequisite for a green
  `tools/check.ps1`; a fresh clone therefore cannot pass without installing the
  pinned tooling, which is deliberate. The repository now contains
  `node_modules` and an npm cache (`.npm-cache/`, git-ignored) — the cache is
  redirected into the repo by `.npmrc` because this host's default cache
  directory is outside the writable workspace. That `.npmrc` is a **host
  workaround, not a project convention**, and is documented as such in
  `docs/reviews/M1A_EXECUTABLE_VERIFICATION.md` §7.

### D-0014 — Contract fixtures are generated from named mutations
- Date: 2026-09-22
- Status: accepted
- Decision: The 48 invalid contract fixtures under `tests/contracts/**` are
  generated by `tools/generate-contract-fixtures.mjs`, which applies one named
  mutation per fixture to a deep clone of the canonical valid document. The
  canonical `valid.json` fixtures are normalised to the same 2-space JSON layout
  so each spec's embedded example is byte-identical to its fixture, and that
  identity is asserted by the test runner.
- Rationale: A hand-edited invalid JSON file hides *what* was changed, so a
  reviewer cannot tell whether it tests the intended rule or merely tests that
  malformed input is rejected. With generated fixtures each violation is a
  two-line greppable statement of intent, fixtures can be regenerated and
  diffed, and the spec/prose copy cannot silently drift from the executable one.
  The runner additionally requires each rejection to come from a reviewed
  keyword allowlist, so a fixture that fails for an unintended reason (a `type`
  error) fails the test instead of passing it.
- Alternatives considered: (a) hand-written invalid fixtures — rejected for
  reviewability; (b) snapshot testing of validator error output — rejected as
  brittle and noisy across Ajv versions; (c) generating valid fixtures from the
  schema (`ajv` has no such facility; would also require a fixture generator
  library) — rejected as a new dependency and as circular (a schema-generated
  valid document proves little about intent).
- Consequences: changing a contract means regenerating fixtures
  (`node tools/generate-contract-fixtures.mjs`) and, if the example changed,
  re-syncing specs (`node tools/sync-spec-examples.mjs`). Both are plain Node
  scripts with no extra dependency. The generated fixtures are committed so a
  reviewer can read them without running anything.

### D-0015 — Human learning notes are a separate v2 branch from knowledge updates
- Date: 2026-09-23
- Status: proposed
- Decision: Keep SourceMap and accepted LessonModel v1 frozen. Add a prototype
  Human Note Composer branch that consumes a dual-axis LessonModel v2 view and a
  declarative Human Note Plan. Keep Alignment, ChangePlan and the old Writer on
  the long-term knowledge update path. Human-facing Markdown and machine
  semantic sidecars are separate artifacts.
- Rationale: REAL_CASE_001 showed that safe, provenance-preserving Vault
  updates and useful human review notes have different objectives. Combining
  them produced a safety/readability tradeoff that failed learning utility. A
  lecture-flow axis, coverage ledger and explicit quality audits address the
  note problem without weakening the frozen SourceMap or update path.
- Alternatives considered: (a) continue extending the old Writer — rejected
  because its patch target and human-note goals remain coupled; (b) let
  Alignment REVIEW suppress note content — rejected because uncertainty needs
  a warning, not silent omission; (c) freeze a new formal schema immediately —
  rejected because this is an Architecture v2 prototype, not M1B schema freeze.
- Consequences: v2 adds reusable prototype types, deterministic planning and
  audit utilities. The current sidecar layout, section vocabulary and prose
  policy remain reviewable and are not implementation-stable contracts.

---

## Template for new decisions

```
### D-0015 — <title>
- Date:
- Status: proposed | accepted | NEEDS_REVIEW | superseded by D-NNNN
- Decision:
- Rationale:
- Alternatives considered:
- Consequences:
```
