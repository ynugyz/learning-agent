# Schemas

Machine-readable JSON Schemas for Learning Agent artifacts. Each schema has a
human-readable counterpart in `specs/`.

## Contents (all drafts)

| File | Models | Layer |
| --- | --- | --- |
| `source-map.schema.json` | Where lesson content came from | B |
| `lesson-model.schema.json` | What the lesson contains | B |
| `semantic-card.schema.json` | Machine semantic layer unit | C |

Every draft is marked `"$comment": "DRAFT — NEEDS_REVIEW"` and carries
`version` and `status` properties so that later incompatibilities are visible
rather than silent.

## Rules

- `$id` uses the `https://learning-agent.local/schemas/...` namespace because
  the project has no published domain; switch to a real one before any external
  publication.
- Schemas are validated for JSON well-formedness by `tools/check.ps1`.
  Full JSON Schema validation against instances is **not** implemented yet.
- Any **incompatible** change to a schema is review-gated (`AGENTS.md` §15).
- A machine inference must never be promoted to a fact by storing it — schemas
  therefore require provenance or epistemic status on claims
  (`AGENTS.md` §7).

## Status

Draft placeholders. No code reads them yet. Field sets are expected to change;
see `docs/DECISIONS.md` D-0007.

**None of these schemas has passed human schema review.** They are retained
unchanged as discussion drafts and must not be treated as stable contracts by
any implementation code.
