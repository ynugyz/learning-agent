# Architecture

**Status:** repository-wide layer sketch. The current source-first Human Note
and knowledge-update design is specified in
[Learning Knowledge Compilation Workflow](architecture/KNOWLEDGE_COMPILATION_WORKFLOW.md).
The older linear layers below describe boundaries, not a serial Human Note
pipeline.
Implementation milestones and decisions are recorded in [DECISIONS.md](DECISIONS.md).

## 1. Separation of concerns

The project deliberately keeps four things apart:

| Concern | Lives in | May depend on DSH? |
| --- | --- | --- |
| Product logic (knowledge semantics) | `src/core`, `src/pipeline` | No |
| Experiment logic (runs, manifests, comparison) | `src/pipeline`, `benchmark/` | No |
| Model/runtime implementation | `src/runtime/dsh` | Yes — only here |
| Obsidian integration | `obsidian-plugin/` (future) | No |

DSH is an **Agent Runtime**, not the Learning Agent. Every core concept,
schema, prompt, benchmark and business rule must survive replacing DSH.

## 2. Layered pipeline

```
Layer A  Evidence              raw or minimally transformed sources
   |
Layer B  Lesson understanding  SourceMap, LessonModel
   |
Layer C  Machine semantics     SemanticCard (mirrors human notes)
   |
Layer D  Knowledge alignment   NEW / EXPAND / REFINE / CORRECT / EXAMPLE /
   |                            RELATION / CONFLICT / NO_CHANGE
Layer E  Change planning       ChangePlan (proposed, never applied directly)
   |
Layer F  Candidate writing     applied to a sandbox/candidate state only
   |
Layer G  Auditing              evidence, coverage, architecture, regression,
                                learning utility
```

### Layer A — Evidence

Transcripts, slides, textbooks, student notes, board images. Evidence is *not*
automatically verified knowledge; its provenance and quality travel with it.
Owned by `src/core/` (concepts) and `src/modules/` (ingestion).

### Layer B — Lesson understanding

Model what the lesson contains **before** consulting the existing knowledge
network too heavily, so that incoming material is not distorted by prior
beliefs. The two artifacts are **SourceMap** (what the source contains and
where it came from) and **LessonModel** (what the lesson teaches and how its
parts relate).

### Layer C — Machine semantic knowledge

Human-readable notes get a parallel machine-readable representation. The
machine layer must **not** duplicate full human notes. Its job is navigation,
retrieval, routing, network understanding, change planning and token
efficiency, through:

- stable IDs;
- compact semantic description;
- section index;
- relations;
- provenance;
- epistemic status;
- learning-asset index;
- integrity state.

Working name for this unit: **SemanticCard**.

Invariant: the machine layer is never an independent source of truth. A
machine inference must not silently become a verified fact merely because it
was stored previously.

### Layer D — Knowledge alignment

Classify how the current lesson relates to existing knowledge using a small
closed vocabulary: `NEW`, `EXPAND`, `REFINE`, `CORRECT`, `EXAMPLE`,
`RELATION`, `CONFLICT`, `NO_CHANGE`.

### Layer E — Change planning

Agents propose structured changes before writing knowledge. An **Alignment**
relates lesson items to existing notes or semantic identities; a
**ChangePlan** describes candidate operations, preservation references,
supporting evidence, confidence, risks and status. Direct unplanned
modification is discouraged.

### Layer F — Candidate writing

Proposed changes are applied to a candidate/test state first. They must never
touch production knowledge. This is the layer that makes review cheap and
reversal free.

### Layer G — Auditing

Audit dimensions: evidence, source coverage, knowledge architecture,
regression, learning utility. Auditing must distinguish **factual
correctness** from **writing quality** — they are different failure modes.

## 3. Human note <-> SemanticCard

```
Human Note  <->  stable knowledge_id  <->  SemanticCard  ->  Evidence
```

Human notes are optimized for human learning and review. SemanticCards are
optimized for machine navigation and change planning. The `knowledge_id` is
the join key and must be stable across edits.

## 4. Runtime boundary (DSH adapter)

```
Learning Pipeline (src/pipeline)
        |
        v  AgentRuntime contract  (src/contracts/agent-runtime.ts)
        |
        v  DSH adapter (src/runtime/dsh)
        |
        v  DSH runtime (external)
```

Rules:

1. `src/core`, `src/pipeline` and `src/modules` import the **contract** from
   `src/contracts`, never the adapter.
2. DSH-specific types, CLIs, session formats, versions and file paths appear
   **only** in `src/runtime/dsh/`. A relative-path assertion is enforced by
   `tools/check.ps1`.
3. The adapter translates DSH activity into runtime-neutral results; it does not
   leak DSH representations upward.
4. Nothing in this repository modifies DSH source.
5. **The runtime does not validate output.** It returns raw model output; the
   core validates it against the schema the caller named. A runtime that
   silently repairs or rejects output destroys the failure signal
   (`specs/agent-runtime-v0.1.md` `RT-7`).

The contract is **defined but not implemented**: see
[`src/contracts/agent-runtime.ts`](../src/contracts/agent-runtime.ts) and
[`specs/agent-runtime-v0.1.md`](../specs/agent-runtime-v0.1.md). It lives in
`src/contracts/` rather than `src/runtime/` because `core` and `runtime` both
depend on it and neither may depend on the other (`docs/DECISIONS.md` D-0012).

The `AgentRuntime` boundary is **status: DRAFT — NOT IMPLEMENTATION-STABLE** and
has not passed human review. Implementing an adapter is a later milestone, and
any core-schema impact is a review-gated decision.

## 5. Context-loading principle

Progressive disclosure, cheapest layer first:

```
L0 Vault / domain index
  -> L1 Module manifest
  -> L2 SemanticCard
  -> L3 Human note
  -> L4 Evidence
```

Full notes or a full Vault are read only when necessary. Machine-readable
layers exist to decide which human notes and evidence must be opened.

## 6. Experiment reproducibility

Every run should be able to record: case ID, Git commit, runtime version, DSH
version, model, model configuration, prompt versions, schema versions, source
bundle, timestamp. Generated runs live under `runs/` (git-ignored); reviewed
results may be promoted to `benchmark/results/`.

Comparisons are invalid if uncontrolled infrastructure changed. Source
variation and prompt variation are tested separately; multiple major variables
must not change silently in one comparison.

Human Gold data is never fabricated by the agent. Where it does not exist, the
repository carries placeholders or `TODO`/`UNKNOWN` markers instead.

## 7. Deferred by design

Not part of the current milestone: production plugin, OpenMAIC integration,
production Vault writes, autonomous large-scale rewriting, full multi-agent
architecture, learner-state modeling, large benchmark suites.

Prefer a deterministic module with structured input/output over an autonomous
agent step. Add complexity only when experiments justify it.
