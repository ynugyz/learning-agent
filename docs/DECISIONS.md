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

### D-0005 — Implementation language and core runtime are NOT yet decided
- Date: 2026-09-22
- Status: NEEDS_REVIEW
- Decision: Defer the choice of implementation language/runtime for
  `src/core`, `src/pipeline` and `src/modules` (Node.js + TypeScript vs
  Python, or a split).
- Rationale: This is an architecture-level choice that constrains every later
  schema, module and test, so it belongs to human judgment, not to an
  autonomous bootstrap step. The available local toolchain supports both
  (Node v22.23.2, Python 3.14.7, uv 0.12.10).
- Alternatives considered: choosing Node/TypeScript now because DSH and the
  future Obsidian plugin are both TypeScript. Attractive, but it is exactly the
  kind of decision that should be made once, deliberately.
- Consequences: Blocks the first real module. Needs a human answer before or at
  the start of the next milestone. Recorded under `Needs human review` in the
  M0 report.

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

---

## Template for new decisions

```
### D-0011 — <title>
- Date:
- Status: proposed | accepted | NEEDS_REVIEW | superseded by D-NNNN
- Decision:
- Rationale:
- Alternatives considered:
- Consequences:
```
