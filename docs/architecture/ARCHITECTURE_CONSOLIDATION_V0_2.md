# Learning Agent — Architecture Consolidation v0.2

**Status:** historical consolidation candidate, retained for comparison. This
is not Architecture v1 freeze, M1B schema freeze, a Composer v2.3
specification or production Vault authorization. The current design point is
[Learning Knowledge Compilation Workflow](KNOWLEDGE_COMPILATION_WORKFLOW.md),
which supersedes its fixed page and branch constraints.

## Minimal architecture

```text
Raw lesson sources
       |
       v
SourceMap -> LessonModel
                 |\
                 | \-> Human Note Generator + source evidence
                 |        -> Human Chapter Note + semantic sidecar
                 |
                 \----> Alignment -> ChangePlan -> Knowledge Updater
                                      -> long-term Vault candidate / reviewed update
```

The branch point is **after LessonModel**. Safe long-term knowledge update and human course-note generation have different objectives. The old serial path `SourceMap -> LessonModel -> Alignment -> ChangePlan -> Writer -> Human Note` is rejected. The Human Note branch may consult existing chapter context, but Alignment does not control visibility and ChangePlan does not constrain composition.

## Four machine forms

| Form | Question it answers | Responsibility | Branch |
| --- | --- | --- | --- |
| SourceMap | What actually appeared in the sources? | Inventory, segmentation, content type, location, coverage, uncertainty, provenance, conflicts and no silent omission. It does not choose chapter structure. | Shared |
| LessonModel | What does the lesson teach? | Concepts, definitions, mechanisms, methods, examples, tips, warnings, teacher views, conceptual relations, lecture flow, emphasis and semantic grouping. A Lesson Module is an organizing container, not a compression endpoint. | Shared |
| Alignment | How does lesson knowledge relate to existing long-term knowledge? | `NEW`, `EXPAND`, `REFINE`, `LINK`, `KEEP`, `REVIEW`, conflict and existing references. `REVIEW` does not imply omission from Human Notes. | Knowledge update only |
| ChangePlan | How can long-term knowledge be changed safely? | Proposed mutations, target files, anchors, stale hashes, transactions, rollback and human review. | Knowledge update only |

These duties consolidate prototype findings; they do not create or freeze new formal schemas. Source evidence remains distinct from verified knowledge.

## Two note layers

The **Human Chapter Note** is for rapid recovery and review of course learning. Its default boundary is a chapter, with major sections and recall-target blocks inside it. A chapter may grow across multiple sessions. Lecture flow explains one session's progression but does not permanently determine the chapter's order.

The **semantic sidecar** is AI-facing. It records stable note/knowledge/block identities, chapter and session mapping, source/module/claim references, provenance, uncertainty, relations, wikilinks, revisions, fingerprints and a coverage ledger. It offers semantic coverage, not a rewritten copy of the Markdown, and cannot become a second source of truth. See [product spec](HUMAN_NOTE_PRODUCT_SPEC.md).

Human Chapter Notes and long-term knowledge pages also differ. One chapter note can contain many concept blocks; an individual concept becomes or links to a cross-course knowledge page only when repeated reuse, expansion or independent value warrants it.

## Distinct Learning Information

**DLI** means information that remains independently useful for learning after semantic deduplication. Several Source Units may produce one DLI; one Lesson Module may contain several. Minimal roles are `CORE`, `DETAIL`, `EXAMPLE`, `METHOD`, `TEACHER_NOTE` and `UNCERTAIN_ESSENTIAL`. DLI is an internal representation and coverage unit within LessonModel/Human Note Generator, not a fifth form, stage, Agent or LLM call.

Composition preserves learning-useful DLI while merging repetitions. A module appearing in a block does not prove its DLI are covered. Length follows retained information; a fixed 1–3 sentence or bullet budget cannot be used to erase distinct meaning. See [information preservation rules](INFORMATION_PRESERVATION_RULES.md).

## Enrichment, sources and warnings

The classroom selects **what** is taught. A generator may complete only the **minimum needed to understand that selected object**, through a basic definition, explanation or terminology completion. The object must be source-triggered, the block must need the completion, the claim must be stable and low dispute, and it must stay within the existing recall target. The sidecar marks canonical enrichment separately from source-derived content.

Source authority depends on claim type: teacher/PPT/course structure for chapter boundaries; PPT/board/textbook above transcript for formulas; recording for teacher opinions and examples; textbook/PPT, then transcript, then bounded enrichment for canonical definitions. Student rough notes are salience cues, not sole proof. Visible warnings are reserved for important unresolved DLI after source resolution and safe enrichment fail. See [enrichment and source authority](ENRICHMENT_AND_SOURCE_AUTHORITY.md).

## Runtime budget and human gate

The target normal flow is approximately 2–3 main LLM calls: an Analyzer for SourceMap and LessonModel, a Human Note Generator for chapter/block/DLI/composition/sidecar, and a conditional Quality Gate or low-cost deterministic audit. Conceptual layers do not imply Agent count. The intended user gate is a 1–3 minute scan and acceptance or minor edit. Deeper review is exceptional. These are **targets**, not measured performance claims. See [runtime minimal flow](RUNTIME_MINIMAL_FLOW.md).

## Future Architecture v1 freeze criteria

1. **Context independence:** a fresh Agent, without this chat history, can use repository docs, schemas and Gold examples to reproduce the intended behavior.
2. **Generalization:** Cases 001, 002 and 003 from different lesson types work without another top-level architecture layer.
3. **Cost:** normal lessons approach 2–3 main LLM calls and 1–3 minutes of human review.
4. **Maintainability:** several new cases require only bug fixes, prompts or examples, without recurring architecture growth.

None of these criteria is certified by this document. No Context Independence Test is run in this consolidation.

## Explicitly rejected designs

- One session = one final note.
- One Source Unit = one Human Note item.
- One Lesson Module = one Presentation Block.
- Fixed 1–3 sentences per block or other fixed length as a reason to drop distinct information.
- Alignment controls Human Note visibility, including treating `REVIEW` as omission.
- ChangePlan writes or constrains a Human Note.
- A warning for every source uncertainty.
- Absolute ban on AI enrichment, or unrestricted AI expansion.
- Every conceptual layer becomes a separate Agent or pipeline stage.
- Every small concept becomes a standalone Markdown file.
- Automatic repair loops during prototype evaluation.

## Open questions before freeze

- DLI identity and coverage must be shown to generalize beyond REAL_CASE_001 without overcounting trivial statements or losing methods and examples.
- The exact sidecar storage layout in a production Vault remains undecided (see `DECISIONS.md` D-0010).
- The target call and review budgets require measurement across Cases 002 and 003.
- Source priority must be tested when PPT, board, transcript and existing course structure disagree. High-risk conflicts still need human judgment.
