# `src/runtime/dsh/` — DSH adapter

The **only** place in this repository where DSH-specific code may exist
(`AGENTS.md` §3.3).

## Detected runtime

| Item | Value |
| --- | --- |
| Package | `@deepseek-ai/dsh` |
| Version at M0 | `0.1.6-alpha.2` |
| Location | `D:\Enviroment\nodejs\node_modules\@deepseek-ai\dsh\` |
| Entry point | `lib/bin.js` |

Recorded in `docs/ENVIRONMENT.md`. Detected read-only; DSH is not vendored,
installed or pinned here (`docs/DECISIONS.md` D-0003).

## Status: placeholder, no adapter code

Not implemented. Blocks on the `AgentRuntime` interface
(`src/runtime/README.md`), which in turn blocks on the implementation-language
decision (`docs/DECISIONS.md` D-0005).

## Responsibilities (planned)

1. Implement the `AgentRuntime` interface against DSH.
2. Translate DSH results into runtime-neutral, schema-validated output.
3. Report the detected DSH version for run manifests.
4. Surface DSH failures as structured errors (`SYS-TOOL-FAILURE`), distinct from
   a valid empty result.
5. Keep all DSH paths, session identifiers and CLI invocation details contained
   in this directory.

## Hard rules

1. **Never modify DSH.** No patching, no forking, no required local patch. If
   DSH lacks something, record it as a limitation or an open question
   (`AGENTS.md` §5, §16).
2. **Never leak DSH types upward.** Everything crossing back into `pipeline/`
   must be runtime-neutral.
3. **Never assume a version.** `0.1.6-alpha.2` is an alpha; detect and record
   the version at runtime instead of hard-coding behaviour to it.
4. **No credentials in code.** Keys come from the environment; the adapter must
   not log, persist or return them.
5. **No production Vault access.** The adapter operates on paths given by the
   caller (`AGENTS.md` §3.1).

## Open questions

- `TODO` — which DSH invocation mode the adapter should use, and whether it can
  enforce structured/schema-validated output at all.
- `TODO` — how a DSH run identifier maps onto our run manifest.
- `UNKNOWN` — DSH behaviour differences across `0.1.x` alpha versions; until
  measured, cross-version comparisons are invalid.
