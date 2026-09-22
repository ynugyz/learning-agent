# Specifications

Human-readable specifications for Learning Agent protocols and artifacts.

A spec describes **intent, invariants and edge cases** in prose. The
corresponding machine-readable contract lives in `schemas/`, and the TypeScript
mirror in `src/contracts/`. When they disagree, that is a defect to fix — not a
matter of taste.

## M1A core contracts (active)

> **Status: DRAFT — NOT IMPLEMENTATION-STABLE.**
> None of these has passed human review. Milestone M0 itself is still awaiting
> final human approval.

| Spec | Contract | Requirement IDs |
| --- | --- | --- |
| [`semantic-card-v0.1.md`](semantic-card-v0.1.md) | SemanticCard v0.1 — machine semantic index | `SC-1` … `SC-23` |
| [`source-map-v0.1.md`](source-map-v0.1.md) | SourceMap v0.1 — structure & coverage ledger | `SM-1` … `SM-26` |
| [`agent-runtime-v0.1.md`](agent-runtime-v0.1.md) | AgentRuntime Boundary v0.1 — capability boundary | `RT-1` … `RT-21` |
| [`run-manifest-v0.1.md`](run-manifest-v0.1.md) | RunManifest v0.1 — reproducibility record | `RM-1` … `RM-18` |

Every spec carries the same sections: design rationale, scope, field table,
required vs optional with conditions, enumerations, invariants, example,
counterexamples / failure cases, known ambiguities, open questions requiring
human review, and explicitly-undecided items.

## Not yet specified (deliberately)

| Spec | Describes | Why not now |
| --- | --- | --- |
| `lesson-model.md` | How a lesson's content is modelled | Out of scope for M1A; no successor to the archived M0 draft. |
| `alignment.md` | `NEW`/`EXPAND`/`REFINE`/… vocabulary | Layer D; depends on the card and lesson model. |
| `change-plan.md` | Proposed-change format | Layer E. |
| `error-taxonomy.md` | Application of `docs/ERROR_TAXONOMY.md` | Vocabulary exists; application rules need real runs. |

## Rules

- One spec per artifact; keep them short enough to actually be read.
- Record unresolved questions as `TODO` / `UNKNOWN` / `NEEDS_REVIEW` rather than
  leaving them implicit. Each spec has dedicated sections for this.
- Requirement IDs are stable: the challenger review and future experiments cite
  them, so renumbering breaks references.
- Changing a spec in a way that breaks an existing schema is review-gated
  (`AGENTS.md` §15).

## Review artefacts

- [`../docs/reviews/M1A_CONTRACT_CHALLENGE.md`](../docs/reviews/M1A_CONTRACT_CHALLENGE.md)
  — independent adversarial critique of the four contracts. It describes
  problems; it does not fix them.
