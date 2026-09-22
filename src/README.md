# `src/` — source tree

The implementation language is **TypeScript** for every directory below
(`docs/DECISIONS.md` D-0005, human ruling during M1A).

| Directory | Responsibility | May reference DSH? |
| --- | --- | --- |
| `contracts/` | Shared type/shape declarations for the four core contracts. Types only, no behaviour. | No |
| `core/` | Runtime-independent concepts and logic: Evidence, SourceMap, SemanticCard, ChangePlan. | No |
| `pipeline/` | Orchestrates Layer A → G. Pure coordination; no DSH specifics. | Only via the `AgentRuntime` contract |
| `modules/` | Small deterministic units with structured input/output. | No |
| `runtime/` | The runtime boundary. Implementations live under it. | Implementations yes |
| `runtime/dsh/` | The DSH adapter. The only place DSH-specific code may exist. | Yes |

## Dependency rule

```
contracts  ←  core, modules, pipeline, runtime   (everyone may import contracts)
core, modules  ←  pipeline
AgentRuntime contract  ←  runtime/dsh            (implements)
```

`core`, `modules` and `pipeline` must **never** import `src/runtime/dsh`. The
only file permitted to name a concrete runtime is a composition root that wires
an adapter in; that file does not exist yet.

## Contract status

> **DRAFT — NOT IMPLEMENTATION-STABLE.** The M1A contracts in `src/contracts/`
> have **not passed human review**, and milestone M0 itself is still awaiting
> final human approval. See [`src/contracts/README.md`](contracts/README.md).

## Status

M1A delivered `contracts/` as declaration-only drafts. `core/`, `pipeline/`,
`modules/` and `runtime/dsh/` contain **no** implementation
(`TODO` — deferred to later milestones).
