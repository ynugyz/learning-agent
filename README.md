# Learning Agent

A personal AI learning system that turns heterogeneous learning sources
(lecture transcripts, slides, textbooks, manual notes, board images) into an
auditable, incrementally-updated knowledge network that stays aligned with
human-readable Obsidian notes.

## Status

**Milestone M0 — Repository Bootstrap (active).**

This repository is a skeleton and a set of internal protocols, not a working
product. Nothing here reads, writes or understands learning material yet.
See [AGENTS.md](AGENTS.md) for the full development protocol and
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the intended design.

Explicitly **not** implemented at M0:

- a production Obsidian plugin;
- OpenMAIC integration;
- production Vault editing;
- autonomous knowledge rewriting;
- a complete multi-agent architecture;
- learner-state modeling;
- large benchmark suites.

## Intended design in one paragraph

A lesson passes through layers: raw **Evidence** (A), **Lesson understanding**
producing a SourceMap/LessonModel (B), a compact machine **SemanticCard** layer
mirroring human notes (C), **Knowledge alignment** against existing knowledge
(D), a proposed **ChangePlan** (E), **Candidate writing** into a sandbox state
(F), and **Auditing** (G). Humans own architecture approval, semantic judgment,
Gold data and final acceptance; the agent does the mechanical work.

## Repository layout

```
AGENTS.md            Development protocol (authoritative working rules)
README.md            This file
.gitattributes       Line-ending policy: LF in the repo, CRLF for Windows scripts
.editorconfig        Editor defaults matching .gitattributes
.env.example         Variable NAMES only; copy to .env (git-ignored)

docs/                ARCHITECTURE.md, DECISIONS.md, ERROR_TAXONOMY.md, ENVIRONMENT.md
specs/               Human-readable specifications for protocols and artifacts
schemas/             Machine-readable JSON Schemas for the same artifacts
prompts/             Versioned prompt assets
src/core/            Evidence, SourceMap, LessonModel, SemanticCard concepts
src/pipeline/        Layer A->G orchestration; no runtime-specific code
src/modules/         Deterministic single-purpose modules
src/runtime/         AgentRuntime interface (runtime-agnostic)
src/runtime/dsh/     DSH adapter — the ONLY place DSH specifics may appear
benchmark/cases/     Benchmark input cases (no fabricated Gold answers)
benchmark/gold/      Human-authored Gold data (placeholders until authored)
benchmark/results/   Reviewed, promoted experiment results
test-vault/          Disposable sandbox vault; never a production Vault
runs/                Generated run artifacts (git-ignored)
obsidian-plugin/     Future Obsidian integration (not started)
tools/               Reproducible repository checks
```

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

No project dependencies are installed yet: M0 declares none. Dependency
decisions are recorded in [docs/DECISIONS.md](docs/DECISIONS.md).

## Repository checks

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools\check.ps1
```

Verifies the expected skeleton exists, checks that credential files are
git-ignored and never tracked/staged (without forbidding a local `.env`),
scans the files Git would commit for secret-like content, and validates that
schema files parse as JSON. See [tools/README.md](tools/README.md).

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
