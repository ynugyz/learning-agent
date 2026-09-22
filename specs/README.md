# Specifications

Human-readable specifications for Learning Agent protocols and artifacts.

A spec describes **intent, invariants and edge cases** in prose. The
corresponding machine-readable contract lives in `schemas/`. When the two
disagree, that is a defect to fix — not a matter of taste.

## Planned specs

| Spec | Describes |
| --- | --- |
| `source-map.md` | How a claim is located in, and traced back to, its source. |
| `lesson-model.md` | How a lesson's content is modelled before alignment. |
| `semantic-card.md` | The machine semantic layer, its fields and invariants. |
| `alignment.md` | The `NEW`/`EXPAND`/`REFINE`/`CORRECT`/`EXAMPLE`/`RELATION`/`CONFLICT`/`NO_CHANGE` vocabulary and when each applies. |
| `change-plan.md` | Proposed-change format, evidence requirements, risk flags. |
| `run-manifest.md` | Reproducibility fields recorded for every experiment run. |
| `error-taxonomy.md` | Pointer to `docs/ERROR_TAXONOMY.md` and how it is applied. |

## Rules

- One spec per artifact; keep them short enough to actually be read.
- Record unresolved questions explicitly as `TODO` / `UNKNOWN` rather than
  leaving them implicit.
- Changing a spec in a way that breaks an existing schema is review-gated
  (`AGENTS.md` §15).

## Status

`TODO` — no spec is authored yet. This is the first work item of the next
milestone, after the implementation language is decided
(`docs/DECISIONS.md` D-0005).
