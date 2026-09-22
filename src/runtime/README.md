# `src/runtime/` — AgentRuntime boundary

The single seam between the Learning Agent and whatever agent runtime executes
it. This is the boundary that makes DSH replaceable (`AGENTS.md` §3.3).

```
Learning Pipeline (src/pipeline)
        |
        v   AgentRuntime interface   <-- this directory
        |
        v   DSH adapter (src/runtime/dsh)
        |
        v   DSH runtime (external, user-installed)
```

## Status: placeholder, deliberately unimplemented

**No interface is defined yet.** The language is undecided
(`docs/DECISIONS.md` D-0005), and the interface should follow the pipeline's
real needs rather than anticipate them. This file records the boundary and its
rules so the first implementation cannot drift across it.

Planned artifact: a runtime-neutral interface module, e.g.
`src/runtime/agent-runtime.ts` or `src/runtime/agent_runtime.py`, depending on
D-0005.

## What the interface must express

| Capability | Why the pipeline needs it |
| --- | --- |
| Load a prompt/versioned task and run it against supplied context | Every model-calling step. |
| Return structured output validated against a schema | The pipeline consumes artifacts, not prose. |
| Report the runtime's own version | Required in every run manifest (`AGENTS.md` §9). |
| Report the model and model configuration actually used | Same. |
| Surface errors distinctly from empty results | `SYS-TOOL-FAILURE` vs a genuinely empty answer (`docs/ERROR_TAXONOMY.md`). |
| Record a run identifier | Traceability from a manifest back to raw run data. |
| Read scoped evidence from an injected root | Prevents the runtime from wandering into a production Vault. |

## Hard rules

1. **The pipeline imports the interface only.** It must not import
   `runtime/dsh`, nor any DSH type, CLI, session format or file path.
2. **No DSH representation escapes upward.** The adapter translates DSH
   activity into runtime-neutral events and results. If a DSH concept is
   genuinely needed by the pipeline, that is a signal the interface is
   missing a neutral concept — add the neutral concept, do not leak the DSH
   one.
3. **No core-schema coupling.** The interface must not force core artifacts
   (`schemas/*.json`) to change shape. Changing a core schema is review-gated
   (`AGENTS.md` §15).
4. **No network or filesystem discovery.** Roots and paths are injected by the
   caller; the runtime never picks a vault or a key location on its own.
5. **DSH is not modified.** The adapter consumes DSH as installed. Never patch
   it, and never require a patched DSH (`AGENTS.md` §5).
6. **Metadata, not secrets.** The interface exposes versions and model names.
   Credentials come from the environment and must never be returned, logged or
   written into an artifact.

## Unresolved questions

- `TODO` — is a run synchronous or a streaming/detached job? Affects whether
  the manifest can be written before results exist.
- `TODO` — how are multi-step agent runs expressed: one call per pipeline step,
  or one long-lived session? Leaning toward one call per step, so a failure is
  attributable to a step.
- `TODO` — how are token/cost budgets exposed, and are they part of the
  reproducibility record?
- `UNKNOWN` — which DSH capabilities actually exist for structured,
  schema-validated output. Must be established empirically before the interface
  is frozen.
- `UNKNOWN` — whether the interface should include a deterministic "no runtime"
  implementation for tests. Likely yes; not yet designed.

## Next step

Define this interface, and validate it against one real DSH call, before any
pipeline symbol exists.
