# `src/pipeline/` — orchestration (Layer A -> G)

Coordinates the layers. Orchestration only: it decides **what runs, in what
order, with what recorded**, and nothing about **how** a step works.

## Current implementation

`knowledge-compilation.ts` provides the minimal deterministic SourceMap →
LessonModel → Alignment runner. `ScopeManifest` pins the run id, source package,
stage order, prompt versions and output-schema versions. `StageRunner` invokes
only the LessonModel and Alignment tasks through the neutral `AgentRuntime`,
validates each artifact through an injected `StageValidator`, and records
sequence-ordered events. It does not write artifacts or invoke a Human renderer.

The runtime output validator is intentionally injected; this layer owns the
orchestration boundary, not any contract/schema implementation. Tests use a
mock runtime and fixture artifacts.

## Future responsibilities (not implemented)

| Unit | Purpose |
| --- | --- |
| `run-manifest` | Builds the reproducibility record for a run (`AGENTS.md` §9). |
| `evidence` | Layer A: load and register evidence items. |
| `plan` | Layer E: produce a ChangePlan. |
| `apply-candidate` | Layer F: apply a plan to a candidate state only. |
| `audit` | Layer G: evaluate evidence, coverage, architecture, regression, utility. |

## Hard rules

1. **Runtime-agnostic.** The pipeline depends on the `AgentRuntime` interface
   in `src/contracts/agent-runtime.ts` — never on `runtime/dsh` (`AGENTS.md` §3.3).
2. **No direct knowledge writes.** Writing to knowledge happens only through
   Layer F candidate application, and only after a ChangePlan exists
   (`AGENTS.md` §6 Layer E/F).
3. **Never touch a production Vault.** Paths are injected; the production Vault
   is not a valid input in experiments (`AGENTS.md` §3.1).
4. **Deterministic by default.** Prefer a deterministic step with structured
   input/output over an agent step. Add agent autonomy only where experiments
   show a deterministic module is insufficient (`AGENTS.md` §18).
5. **No silent variable changes.** Source variation and prompt variation are
   tested separately; record every version that could affect a comparison.

## Status

This is an orchestration skeleton, not a production pipeline. No concrete
schema validator, DSH adapter, ChangePlan stage or artifact persistence is wired.
The `AgentRuntime` interface remains the runtime boundary
(`src/contracts/agent-runtime.ts`).
