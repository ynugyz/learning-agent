# `src/core/` — core concepts and logic

Runtime-independent, product-level concepts. This is the code most likely to
outlive every other directory here.

## Relationship to `src/contracts`

Since M1A, the **type and shape declarations** for the core artifacts live in
`src/contracts/` rather than here, because `src/runtime` also needs them and
`core` → `runtime` must not become a dependency direction
(`docs/ARCHITECTURE.md` §4).

| Concept | Layer | Contract location |
| --- | --- | --- |
| `Evidence` | A | not yet specified |
| `SourceMap` | B | [`src/contracts/source-map.ts`](../contracts/source-map.ts) |
| `LessonModel` | B | **not designed** — out of scope for M1A |
| `SemanticCard` | C | [`src/contracts/semantic-card.ts`](../contracts/semantic-card.ts) |
| `ChangePlan` | E | not yet specified |

`src/core` will hold the **logic** that operates on those shapes: construction,
invariant checking, id stability rules, fingerprinting. None of it exists yet.

## Hard rules

1. **No DSH.** Nothing here may import from or reference DSH, its session
   formats, its tools or its file layout (`AGENTS.md` §3.3).
2. **No I/O assumptions.** Reading a vault, calling a model or writing files is
   someone else's job. Core defines meaning and invariants.
3. **Evidence is not knowledge.** A source item does not become a verified fact
   by being loaded. Epistemic status must be carried explicitly
   (`AGENTS.md` §6 Layer A, §7).
4. **Concept over convenience.** If a field exists only to make a current
   pipeline step easier, it does not belong in a core concept.

## Status

`TODO` — no logic exists. The implementation language is now decided
(TypeScript, `docs/DECISIONS.md` D-0005), so this directory is unblocked, but
M1A deliberately produces contracts only.
