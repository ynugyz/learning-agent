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
| [`semantic-card-v0.1.md`](semantic-card-v0.1.md) | SemanticCard v0.1 — machine semantic index | `SC-1` … `SC-29` |
| [`source-map-v0.1.md`](source-map-v0.1.md) | SourceMap v0.1 — structure & coverage ledger | `SM-1` … `SM-27` |
| [`agent-runtime-v0.1.md`](agent-runtime-v0.1.md) | AgentRuntime Boundary v0.1 — capability boundary | `RT-1` … `RT-32` |
| [`run-manifest-v0.1.md`](run-manifest-v0.1.md) | RunManifest v0.1 — reproducibility record | `RM-1` … `RM-26` |

Every spec carries the same sections: design rationale, scope, field table,
required vs optional with conditions, enumerations, invariants, example,
counterexamples / failure cases, known ambiguities, open questions requiring
human review, and explicitly-undecided items.

Each spec also ends with a **requirement index** that defines every ID it uses,
plus a **reconciliation with the previous revision** table. Requirement IDs are
stable and must not be renumbered: the challenger review, the adjudication
record and future experiments cite them.

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
  — independent adversarial critique of the four contracts (first revision).
  It describes problems; it does not fix them.
- [`../docs/reviews/M1A_HUMAN_ADJUDICATION_REV1.md`](../docs/reviews/M1A_HUMAN_ADJUDICATION_REV1.md)
  — the human ruling on those findings and what REV1 changed in response.
  Findings not covered by a ruling remain **OPEN** on purpose.
- [../docs/reviews/M1A_FINAL_AUDIT_FIXES.md](../docs/reviews/M1A_FINAL_AUDIT_FIXES.md)
  — M1A-V2 hardening: which declared guarantees became machine-enforced, and what stays open.
- [../docs/reviews/M1A_EXECUTABLE_VERIFICATION.md](../docs/reviews/M1A_EXECUTABLE_VERIFICATION.md)
  — compiler and JSON Schema evidence for the contracts.
