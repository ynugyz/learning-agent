# Knowledge Router and Human Note Quality Gate

This is a runtime sidecar. It does not change the SourceMap, LessonModel,
Alignment or ChangePlan contracts.

## Router

`src/knowledge-router` classifies every SourceMap unit as `compile`, `support`,
`review` or `retain-only`. It is high-recall: uncertain or valuable material
cannot be routed to `retain-only`. A retain-only unit remains in SourceMap and
can be revisited later. Shadow mode records decisions without changing
LessonModel input; active mode selects compile, support and review units.

The deterministic router is always available. The optional TypeSafe adapter can
batch typed Choice/Score questions against TeamoRouter's `jev` endpoint. Set
`TEAMOROUTER_API_KEY` and pass `--live` to use it. Without a key, the canary
records a deterministic result rather than pretending Jev ran.
The non-secret endpoint/model metadata is kept in `configs/jev-teamorouter.json`;
the key itself is intentionally not stored there.

## Quality gate

`src/quality` runs a cheap deterministic preflight first. It checks source
traces, visible structure, epistemic boundary wording, machine metadata,
classroom narration and baseline preservation. `src/quality/jev.ts` provides an
optional structured Jev evaluation with independent dimensions; Jev never
writes prose.

## Human Note inclusion gate

`src/knowledge-router/note-gate.ts` is the second Jev decision point. It sits
between a candidate ChangePlan and Human Note writing. For every proposed
operation it asks typed Choice/Score questions about inclusion route, knowledge
role, learning value, evidence sufficiency, redundancy and review utility.
The output is a runtime sidecar (`human-note-gate/0.1`), not a fifth core
knowledge table. The deterministic evidence floor always wins: insufficient or
uncertain evidence is deferred, covered content is skipped as duplicate, and
teacher opinions, analogies or advice can enter only with a boundary label.
The gate cannot delete existing Human Note content. In shadow mode it records
what would happen; it does not reduce the LessonModel input or write notes.

Jev is therefore used in three bounded places: high-recall SourceMap routing,
candidate inclusion decisions, and post-generation quality scoring. Luna (or
another writing model) still writes candidate prose; Jev only returns
structured decisions and evidence-backed issues.

Use `tools/note-quality-gate.mjs` for a scratch-only local section patch. It
accepts at most two patches, refuses machine metadata, and writes a new
`*.quality-candidate.md` beside the input. It never writes a Production Vault
note and is separate from the existing pilot-safe commit path.

## Examples

```powershell
node --experimental-strip-types tools/knowledge-router-canary.mjs `
  scratch/canary/final-note-low-model-20260928T045602817Z/input/source-map.json `
  --lesson-model scratch/canary/final-note-low-model-20260928T045602817Z/input/lesson-model.json `
  --note scratch/canary/final-note-low-model-20260928T045602817Z/final-note.md `
  --baseline scratch/canary/final-note-low-model-20260928T045602817Z/input/existing-note.md

$env:TEAMOROUTER_API_KEY = '...'
node --experimental-strip-types tools/knowledge-router-canary.mjs <source-map.json> --live

node --experimental-strip-types tools/note-inclusion-canary.mjs `
  <change-plan.json> --alignment <alignment.json> --out scratch/canary/note-gate --live
```

All outputs belong under `scratch/`. DSH remains behind the existing runtime
boundary; TypeSafe is an optional decision adapter, not a core Learning Agent
dependency.
