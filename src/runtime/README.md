# `src/runtime/` — runtime implementations

Where concrete `AgentRuntime` implementations live. The **contract** they
implement does **not** live here: it is in
[`src/contracts/agent-runtime.ts`](../contracts/agent-runtime.ts), because
`src/core` needs the same types and `core` → `runtime` must not become a
dependency direction (`docs/DECISIONS.md` D-0012).

```
Learning Pipeline (src/pipeline)
        |
        v  AgentRuntime contract  <-- src/contracts/agent-runtime.ts
        |
        v  DSH adapter            <-- src/runtime/dsh
        |
        v  DSH runtime (external, user-installed)
```

## Status: no implementation

The contract is **DRAFT — NOT IMPLEMENTATION-STABLE** and has not passed human
review. `src/runtime/dsh/` is a placeholder. Nothing here executes.

See [`specs/agent-runtime-v0.1.md`](../../specs/agent-runtime-v0.1.md) for the
contract design, the capability vocabulary and the requirement index.

## What the contract expresses

| Capability | Why the pipeline needs it |
| --- | --- |
| Run one logical task against supplied context, by prompt id **and version** | Every model-calling step; unversioned prompts break reproducibility. |
| Return output **raw and unvalidated** | The pipeline consumes artifacts, and validation belongs to the core (`RT-7`). |
| Report the runtime's own kind and version | Required in every run manifest (`AGENTS.md` §9). |
| Report the model actually resolved, or a reason it is unknown | Silent substitution invalidates comparisons (`RT-13`, `RT-18`). |
| Report token usage, or that it is unavailable | Absent usage must not read as zero (`RT-18`). Cost is **not** part of core usage (`RT-19`). |
| Surface errors classified by kind, distinct from empty results | `SYS-TOOL-FAILURE` vs a genuinely empty answer (`docs/ERROR_TAXONOMY.md`). |
| Declare capabilities before they are relied on | The pipeline must not branch on the runtime's name (`RT-6`). |
| Perform transport-safe retry | Adapter-owned; semantic retry belongs to the orchestrator (`RT-4`). |

## Hard rules

1. **Core imports the contract only.** `core`, `pipeline` and `modules` must not
   import `runtime/dsh`, any DSH type, CLI, session format or file path. A
   composition root that wires an adapter in is the only permitted exception,
   and it does not exist yet.
2. **No DSH representation escapes upward.** If the pipeline needs a DSH
   concept, add a **neutral** concept to the contract — do not leak the DSH one.
3. **No host-specific data in the contract.** An install path or machine detail
   is an environment fact for `docs/ENVIRONMENT.md`, never a contract field
   (`RT-11`).
4. **No credentials in the contract.** Credential acquisition is the adapter's
   private concern; it is not representable in `TaskRequest` or any result
   (`RT-22`).
5. **No output validation in the adapter.** Do not repair, coerce or reject
   model output against a schema; return it as received.
6. **No network or filesystem discovery.** Context is passed in; the adapter
   never picks a vault, a file or a key location on its own.
7. **DSH is not modified.** The adapter consumes DSH as installed. Never patch
   it, and never require a patched DSH (`AGENTS.md` §5).

## Open questions

- `TODO` — which DSH invocation mode the adapter should use, and whether DSH can
  enforce structured output at all. Must be established empirically.
- `TODO` — how a DSH run identifier maps onto our run manifest.
- `TODO` — whether a deterministic in-memory runtime should be mandated for
  tests (`specs/agent-runtime-v0.1.md` Q1).
- `UNKNOWN` — DSH behaviour differences across `0.1.x` alpha versions; until
  measured, cross-version comparisons are invalid.

## Next step

Implement an adapter against the frozen contract only after the contract passes
human review, and validate it with one real DSH call before any pipeline symbol
exists.
