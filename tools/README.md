# Tooling

Reproducible repository checks. No project dependencies, no build system.

| Script | Purpose |
| --- | --- |
| `check.ps1` | Validate the M0 skeleton, scan for secret-looking content, verify schemas parse as JSON, and report Git status. |

## Usage

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools\check.ps1
```

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
