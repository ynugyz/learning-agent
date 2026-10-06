# Learning Agent

A personal AI learning system that turns heterogeneous learning sources
(lecture transcripts, slides, textbooks, manual notes, board images) into an
auditable, incrementally-updated knowledge network that stays aligned with
human-readable Obsidian notes.

## What it does

The repository now includes a portable Codex Skill for turning learning
materials into a growing two-layer knowledge base:

- Add a transcript, PDF, slide deck, image, or project file to a Codex chat.
- Choose the Human Note folder and the separate AI knowledge folder on first use.
- Generate formal, readable Markdown notes for study and review.
- Generate a compact AI index and knowledge cards for later retrieval and updates.
- Reuse existing notes, preserve useful content, and add meaningful Obsidian
  wikilinks instead of creating isolated summaries.
- Keep formulas in valid Obsidian LaTeX syntax, including inline `$...$` and
  display `$$...$$` expressions.
- Continue growing the same course or subject when new source material is added.

The Skill is designed for Codex and does not require DSH, DeepSeek, Jev, or a
separate local service for its normal workflow. Intermediate run files stay in
the working area; durable Human and AI outputs are written to the two folders
you select.

This repository also contains versioned prompts, contracts, tests, routing
utilities, and a portable `.skill.zip` package for installation.

## Quick start

Install the Skill into the current Codex profile:

```powershell
npm install
npm run skill:install
```

Then invoke `learning-knowledge-growth` in a Codex chat and attach the learning
material. On the first run, provide two output folders:

```text
Human Note root: the Obsidian Markdown folder you read and review
AI knowledge root: a separate folder for index.json and knowledge cards
```

For later runs, attach new material and identify the same course or subject.
The Skill reads the existing index and relevant cards first, then updates the
corresponding notes and links. It does not require copying a complete existing
course into this repository.

For a ready-to-install package, use
`dist/learning-knowledge-growth.skill.zip`.

如果这个项目对你的学习整理有帮助，欢迎在 GitHub 上点一个 Star，支持项目继续改进。

## Repository layout

```
AGENTS.md            Development protocol (authoritative working rules)
README.md            This file
.gitattributes       Line-ending policy: LF in the repo, CRLF for Windows scripts
.editorconfig        Editor defaults matching .gitattributes
.env.example         Variable NAMES only; copy to .env (git-ignored)
.npmrc               Registry + local npm cache (host workaround; see its comments)
package.json         Scripts + exactly pinned DEV-only tooling; no runtime deps
package-lock.json    Lockfile for the pinned dev tooling (committed)

docs/                ARCHITECTURE.md, DECISIONS.md, ERROR_TAXONOMY.md, ENVIRONMENT.md
docs/reviews/        Independent challenge + human adjudication + executable verification
specs/               Human-readable specifications for protocols and artifacts
schemas/             Machine-readable JSON Schemas (live drafts; archive/m0-draft superseded)
prompts/             Versioned prompt assets
src/contracts/       The four core contract type declarations (shared, no behaviour)
src/core/            Runtime-independent concepts and logic (not implemented)
src/pipeline/        Layer A->G orchestration; no runtime-specific code
src/modules/         Deterministic single-purpose modules
src/runtime/         Concrete AgentRuntime implementations
src/runtime/dsh/     DSH adapter — the ONLY place DSH specifics may appear
tests/contracts/     Valid + invalid fixtures proving the contracts are enforced
benchmark/cases/     Benchmark input cases (no fabricated Gold answers)
benchmark/gold/      Human-authored Gold data (placeholders until authored)
benchmark/results/   Reviewed, promoted experiment results
test-vault/          Disposable sandbox vault; never a production Vault
runs/                Generated run artifacts (git-ignored)
obsidian-plugin/     Future Obsidian integration (not started)
tools/               Repository checks and contract verification
skill/learning-knowledge-growth/  Portable Codex Skill source bundle
```

## Codex Skill bundle

The portable Skill source is under
`skill/learning-knowledge-growth/`. Install or copy that directory into the
target Codex skills directory. It contains the Skill instructions, UI metadata,
AI index protocol and repository integration reference. The Skill uses Codex
only; DSH-related scripts in this repository are legacy experiment tools and
are not part of the normal Skill workflow.

The Skill still needs two user-selected roots at first use: a Human Note root
and an AI knowledge root. Those roots contain the user's growing knowledge
state and are intentionally kept outside this repository. Intermediate run
artifacts are disposable; the durable AI layer is the course index plus
knowledge-object cards.

## Environment

Verified on 2026-09-22 (see [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md)):

| Component | Version |
| --- | --- |
| OS | Windows 11 (NT 10.0.26200.0) |
| Git | 2.55.0.windows.2 |
| Node.js | v22.23.2 |
| npm | 10.9.8 |
| pnpm | 11.7.0 |
| Python | 3.14.7 |
| uv | 0.12.10 |
| DSH (`@deepseek-ai/dsh`) | 0.1.6-alpha.2 |
| TypeScript (dev-only, exact) | 5.9.3 |
| Ajv (dev-only, exact) | 8.20.0 |

There are **no runtime dependencies**. Two dev-only tools are exactly pinned for
executable contract verification (`npm install`); see
[docs/DECISIONS.md](docs/DECISIONS.md) D-0013 and
[docs/ENVIRONMENT.md](docs/ENVIRONMENT.md).

## Repository checks

```powershell
npm install                                          # installs the pinned dev tooling
powershell -NoProfile -ExecutionPolicy Bypass -File tools\check.ps1
```

Verifies the expected skeleton exists, checks that credential files are
git-ignored and never tracked/staged (without forbidding a local `.env`),
scans the files Git would commit for secret-like content, validates that schema
files parse as JSON, guards the core↔runtime dependency boundary, and **runs
the executable contract verification**: `tsc --noEmit` plus 84 JSON Schema
fixture assertions. See [tools/README.md](tools/README.md).

## Temporary pilot-safe note trial

For a real classroom-note trial, use the isolated `pilot-vault` boundary:

```powershell
npm run pilot:note -- --config <pilot-config.json>
```

The command supports `dry-run` and `commit` configs, writes only new candidate
`.md`/`.json` files under the pilot vault, and keeps a local run manifest. It
does not modify the production Vault or Human Note Composer semantics. See
[docs/PILOT_SAFE_MODE.md](docs/PILOT_SAFE_MODE.md).

## Contract verification

The four M1A contracts are checked as machine-readable artefacts, not only as
prose:

```powershell
npx --no-install tsc --noEmit        # contract declarations compile
node tools/contract-tests.mjs        # 4 valid + 75 invalid fixtures, Ajv
```

Evidence and honest limits: [M1A_EXECUTABLE_VERIFICATION.md](docs/reviews/M1A_EXECUTABLE_VERIFICATION.md).
Cross-artifact reference integrity is **not** covered — JSON Schema validates
one document at a time — and no product pipeline implementation exists yet.

## Safety boundaries

- **Never** modify a production Obsidian Vault. Experiments use `test-vault/`
  or copied fixtures only.
- **Never** commit secrets or credentials. A local `.env` is expected to exist
  on a developer machine and is git-ignored; it must never be tracked or
  staged, and only `.env.example` (names, no values) is committed.
- DSH is a *runtime*, not the product. Core logic must remain replaceable.
- No destructive Git or filesystem operations without an explicit review gate.

## Development workflow

`main` holds the stable, runnable state. Substantial work happens on
`feature/*` or `experiment/*` branches. Commit small and meaningful; run
`tools/check.ps1` before committing. The agent stops at the review gates
defined in [AGENTS.md](AGENTS.md) §15.
