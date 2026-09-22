# `src/` — source tree

Nothing here is implemented yet. This milestone creates the boundaries only;
see `docs/ARCHITECTURE.md` and `docs/DECISIONS.md` D-0005.

| Directory | Responsibility | May reference DSH? |
| --- | --- | --- |
| `core/` | Runtime-independent concepts and schemas: Evidence, SourceMap, LessonModel, SemanticCard, ChangePlan. | No |
| `pipeline/` | Orchestrates Layer A -> G. Pure coordination; no DSH specifics. | Only via `runtime/` interface |
| `modules/` | Small deterministic units with structured input/output. | No |
| `runtime/` | The `AgentRuntime` interface — the only contract the pipeline knows. | Interface only |
| `runtime/dsh/` | The DSH adapter. The only place DSH-specific code may exist. | Yes |

## Import rule

```
core, modules   <-  pipeline  <-  runtime interface  <-  runtime/dsh
```

Dependencies point one way only. `core` must never import `pipeline`,
`runtime` or `runtime/dsh`. If a core module needs something from the runtime,
the interface is wrong — fix the interface, not the import.

## Status

`TODO` — no implementation language has been chosen
(`docs/DECISIONS.md` D-0005), so no source file exists. Adding source before
that decision would bake in an assumption.
