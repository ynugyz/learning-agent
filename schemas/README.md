# Schemas

Machine-readable JSON Schemas for Learning Agent artifacts. Each schema has a
human-readable counterpart in `specs/` and a TypeScript mirror in
`src/contracts/`.

## Live drafts (M1A, v0.1)

> **Status: DRAFT — NOT IMPLEMENTATION-STABLE.**
> None of these has passed human schema review, and no implementation code may
> treat any of them as a stable contract. Milestone M0 itself is still awaiting
> final human approval.

| File | Models | Layer | Spec |
| --- | --- | --- | --- |
| `semantic-card.v0.1.schema.json` | Machine semantic index entry | C | [`specs/semantic-card-v0.1.md`](../specs/semantic-card-v0.1.md) |
| `source-map.v0.1.schema.json` | Source structure & coverage ledger | B | [`specs/source-map-v0.1.md`](../specs/source-map-v0.1.md) |
| `agent-runtime.v0.1.schema.json` | Runtime boundary shapes | — | [`specs/agent-runtime-v0.1.md`](../specs/agent-runtime-v0.1.md) |
| `run-manifest.v0.1.schema.json` | Run reproducibility record | — | [`specs/run-manifest-v0.1.md`](../specs/run-manifest-v0.1.md) |

## Archived M0 drafts — superseded, do not implement against them

`archive/m0-draft/` holds the three M0 seed schemas
(`source-map`, `lesson-model`, `semantic-card`). They were **written before the
design principles were stated** and are retained for historical comparison only.

The M1A `semantic-card` and `source-map` contracts were **rederived from the
design principles** recorded in their specs, not extended from these drafts.
`lesson-model` has **no** successor: `LessonModel` is deliberately out of scope
for M1A.

## Naming and versioning

- Live schemas use the `<artifact>.v<major>.<minor>.schema.json` pattern. A new
  major version is a new file; the old one moves to `archive/`, so no reader can
  silently pick up a changed contract under an unchanged name.
- Every schema is marked in `$comment` with the exact status string so an
  automated check (`tools/check.ps1`) can verify it has not been quietly
  promoted to stable.

## Rules

- `$id` uses the `https://learning-agent.local/schemas/...` namespace because
  the project has no published domain; switch to a real one before any external
  publication.
- `tools/check.ps1` validates JSON well-formedness and the presence of the
  `DRAFT — NOT IMPLEMENTATION-STABLE` marker. **Full JSON Schema validation of
  instances is not implemented**, so a schema that parses may still be wrong.
- Any **incompatible** change to a schema is review-gated (`AGENTS.md` §15).
- A machine inference must never be promoted to a fact by storing it — schemas
  therefore require provenance or epistemic status on assertions
  (`AGENTS.md` §7).

## Known gaps

- No JSON Schema meta-validation (are the schemas themselves valid schemas?).
- No schema ↔ TypeScript consistency check, so `src/contracts/*.ts` can drift
  from the schemas undetected.
- No instance validation.
