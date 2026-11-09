# Tooling

Reproducible repository checks and contract verification. M1A-V introduced the
only dev tooling in the project (`typescript`, `ajv`), both exactly pinned and
dev-only; there is still no build system and no runtime dependency.

| Script | Language | Purpose |
| --- | --- | --- |
| `check.ps1` | PowerShell 5.1 | Full repository check: skeleton, secret hygiene + self-test, contract markers, dependency boundary, schema well-formedness, line endings, ignore policy, dependency policy, and **it also runs the two verification scripts below** and reports Git status. |
| `contract-tests.mjs` | Node ESM | Validates `tests/contracts/**` against the four JSON Schemas with Ajv, asserting each invalid fixture is rejected for an allowed reason. |
| `generate-contract-fixtures.mjs` | Node ESM | Regenerates the 75 invalid fixtures from the canonical valid ones, one named mutation each. Run only when a mutation or a valid fixture changes. |
| `validate-knowledge-compilation.mjs` | Node ESM | Checks references and preservation invariants across one SourceMap, LessonModel, Alignment and ChangePlan draft bundle. |
| `run-dsh-low-model.ps1` | Windows PowerShell | Runs one read-only DSH headless task with `gpt-6-luna` by default, using a temporary model patch. |
| `canary-run.ps1` + `knowledge-compilation-canary.mjs` | PowerShell + Node ESM | Creates isolated scratch runs; mock/fixture replays fixtures, while real mode sends a single `.txt` source through DSH. `-Stages` selects a contiguous prefix of SourceMap, LessonModel and Alignment; omitted means all three. Real stage timeout defaults to 15 minutes and can be overridden with `LEARNING_AGENT_STAGE_TIMEOUT_MS`. |
| `knowledge-router-canary.mjs` | Node ESM | Produces a high-recall Router sidecar and deterministic Human Note quality report; `--live` optionally sends batched typed decisions to TypeSafe/Jev. |
| `note-quality-gate.mjs` | Node ESM | Runs deterministic note preflight and applies at most two bounded section patches into a new scratch candidate. It never writes production notes. |
| `run-learning-session.ps1` | Windows PowerShell | One-input session wrapper: reads a bounded Vault snapshot, runs SourceMap → LessonModel → Alignment → ChangePlan → Human Note candidate, then audits the result without writing the Production Vault. |
| `apply-candidate.ps1` | Windows PowerShell | Explicitly writes one reviewed candidate to a chosen note path, backing up an existing file first; requires `-ConfirmWrite`. |
| `run-learning-session.cmd` | Windows command wrapper | Drag a transcript `.txt` file onto it to start the one-input session (defaults to 人工智能导论; pass a second profile argument for another course). |
| `feed-*.cmd` | Windows course wrappers | Drag a transcript onto `feed-ai.cmd`, `feed-macro.cmd`, `feed-java-oop.cmd` or `feed-accounting.cmd` to select a bounded course profile without typing commands. |

## Usage

```powershell
npm install                                          # installs the pinned dev tooling
powershell -NoProfile -ExecutionPolicy Bypass -File tools\check.ps1   # everything
node tools/contract-tests.mjs                        # fixture verification alone
node tools/validate-knowledge-compilation.mjs <source-map> <lesson-model> <alignment> <change-plan>
node --experimental-strip-types tools/knowledge-router-canary.mjs <source-map.json> --mode shadow
node --experimental-strip-types tools/note-quality-gate.mjs <note.md> <source-map.json>
.\tools\run-learning-session.ps1 -Transcript <transcript.txt> -Model gpt-6-luna -Reasoning low
.\tools\run-learning-session.ps1 -Transcript <transcript.txt> -Profile 宏观经济学 -Model gpt-6-luna -Reasoning low
.\tools\canary-run.ps1 -Name bayes-mock -Source .\tests\knowledge-compilation\bayes-example -Mode mock
.\tools\canary-run.ps1 -Name bayes-source-only -Source .\tests\knowledge-compilation\bayes-example -Mode mock -Stages SourceMap
.\tools\canary-run.ps1 -Name bayes-understand -Source .\tests\knowledge-compilation\bayes-example -Mode mock -Stages SourceMap,LessonModel
.\tools\canary-run.ps1 -Name lesson-real -Source .\scratch\lesson.txt -Mode real -Model gpt-6-luna -Reasoning low
npx --no-install tsc --noEmit                        # contract types alone
```

`check.ps1` is the authoritative entry point: it fails if `node_modules` is
absent rather than silently skipping the compile and fixture checks, so a fresh
clone cannot pass without installing the pinned tooling.

## Secret hygiene behaviour

A local `.env` or `credentials.json` is a **normal, expected** file on a
developer machine. The check does not treat its existence as a problem. It
verifies three things instead:

1. the ignore **rules** cover credential files (checked with
   `git check-ignore --no-index`, so the answer comes from `.gitignore` rather
   than from staging state);
2. no credential file is **tracked or staged** — this is the hard failure;
3. secret-like content in the files Git would actually commit (tracked/staged
   plus untracked-not-ignored) is reported by path only.

Ignored local secrets are deliberately excluded from the content scan: they are
not part of the change set, and forbidding them on disk would contradict how
`.env.example` is meant to be used. **No secret value is ever printed** — only
file paths and the name of the matched pattern.

A self-test (`Secret hygiene self-test`) runs in an isolated throwaway Git
repository under `%TEMP%` and proves the logic distinguishes the cases that
matter:

- a local `.env` that is correctly ignored passes and is excluded from the
  commit candidates;
- the same `.env` becomes a failure once it is staged or tracked;
- secret-like content in a tracked file is detected, and the finding reports a
  location rather than a value.

## Rules

- Checks must be **non-destructive**: no writes, no network, no Git mutations,
  no execution of repository content.
- Checks must be runnable from a clean clone with only the documented toolchain
  installed.
- `tools/check.ps1` targets Windows PowerShell 5.1 because `pwsh` is not on
  `PATH` on the M0 host (`docs/ENVIRONMENT.md`). Keep it 5.1-compatible.
- A failing check exits non-zero. Warnings do not fail the run unless they
  indicate a safety-boundary violation.

## Status

`check.ps1` exists and covers M0 bootstrap expectations. It will need extending
as real modules, schemas and tests appear — and should then be superseded by
whatever test runner the project adopts (see `docs/DECISIONS.md` D-0004).
