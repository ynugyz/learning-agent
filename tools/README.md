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

## Usage

```powershell
npm install                                          # installs the pinned dev tooling
powershell -NoProfile -ExecutionPolicy Bypass -File tools\check.ps1   # everything
node tools/contract-tests.mjs                        # fixture verification alone
node tools/validate-knowledge-compilation.mjs <source-map> <lesson-model> <alignment> <change-plan>
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
