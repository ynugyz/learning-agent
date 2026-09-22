# `src/core/` — core concepts (Layer A, B, C artifacts)

Runtime-independent, product-level concepts. This is the code most likely to
outlive every other directory here.

## Expected contents (none exist yet)

| Concept | Layer | Purpose |
| --- | --- | --- |
| `Evidence` | A | A source item plus its provenance and observed quality. |
| `SourceMap` | B | Where lesson content came from. Schema: `schemas/source-map.schema.json`. |
| `LessonModel` | B | What the lesson contains. Schema: `schemas/lesson-model.schema.json`. |
| `SemanticCard` | C | Machine semantic layer unit. Schema: `schemas/semantic-card.schema.json`. |
| `ChangePlan` | E | Proposed change + evidence + confidence + risk flags. No schema yet. |

## Hard rules

1. **No DSH.** Nothing here may import from or reference DSH, its session
   formats, its tools or its file layout. The whole point of this directory is
   that another runtime can replace DSH (`AGENTS.md` §3.3).
2. **No I/O assumptions.** Reading a Vault, calling a model or writing files is
   someone else's job. Core defines meaning and invariants.
3. **Evidence is not knowledge.** A source item does not become a verified fact
   by being loaded. Epistemic status must be carried explicitly
   (`AGENTS.md` §6 Layer A, §7).
4. **Concept over convenience.** If a field exists only to make a current
   pipeline step easier, it does not belong in a core concept.

## Status

`TODO` — empty. Blocks on the implementation-language decision
(`docs/DECISIONS.md` D-0005).
