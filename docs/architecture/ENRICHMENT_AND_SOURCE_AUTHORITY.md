# Bounded Enrichment and Source Authority

**Status:** historical content-policy draft. Its bounded-completion intuition
may inform future experiments, but it is not a mandatory schema or fixed gate
in the current [Learning Knowledge Compilation Workflow](KNOWLEDGE_COMPILATION_WORKFLOW.md).

## Bounded pedagogical enrichment

The lesson decides **what to teach**. The generator may add only the **minimum needed to understand it**. Source evidence need not be treated as a complete textbook: transcription can omit a slide, board, formula or spoken premise. Equally, model knowledge cannot select new lesson topics.

Allowed completions are a `CANONICAL_DEFINITION`, `MINIMAL_EXPLANATION`, or `TERMINOLOGY_COMPLETION`. Each must pass all four gates:

1. A classroom source already triggered the knowledge object.
2. The current block lacks the minimum needed for independent understanding.
3. The completion is stable, basic and low dispute.
4. It stays inside the existing recall target and creates no new one.

Stop once the block is independently understandable. A sentence that only restates, generalizes or emphasizes an existing point adds no DLI. Do not add history, dates, people, complex algorithms, new theories, applications, philosophical implications, research trends, new examples, contested judgments or quantitative claims without source support. Do not reconstruct a missing formula or silently correct uncertain ASR.

Human-facing prose does not label a sentence “AI added.” The sidecar records its block, statement reference, enrichment type, triggering module/source references, recall target, confidence and scope reason as `CANONICAL_ENRICHMENT`; directly supported information is `SOURCE_DERIVED`. Free inference is not the default route into a Human Note. A sidecar must not reproduce the whole note.

## Source authority by information kind

| Information | Preferred evidence order | Caution |
| --- | --- | --- |
| Chapter title and structure | Explicit teacher speech, PPT chapter title, textbook contents, existing course structure | A transcript that begins mid-lesson may not establish the first boundary. |
| Formula and symbol | PPT, board, textbook, then transcript | Do not complete an absent expression by guesswork. |
| Teacher opinion | Classroom recording before other material | Retain attribution; do not turn an opinion into a universal fact. |
| Teacher example | Classroom recording before PPT or textbook | Preserve its teaching purpose, not every spoken repetition. |
| Canonical definition | Textbook or PPT, then transcript, then bounded canonical enrichment | A model completion needs the four gates above. |
| Student rough note | Salience, personal cue or context only | It cannot alone prove a fact. |

This is an authority guide, not a rule to ingest all source types in every run. Preserve provenance and explicit conflict when sources disagree; do not quietly choose a winner on high-risk claims.

## Warning decision

1. Does uncertainty affect current Human Note understanding? If no, keep it sidecar-only.
2. Can a better source resolve it? If yes, use that source and record provenance.
3. Can a safe bounded completion resolve it? If yes, add the minimum and record enrichment.
4. Is the unresolved information a useful, important DLI? If no, omit it from human prose while retaining machine provenance. If yes, mark `UNCERTAIN_ESSENTIAL` and show a short warning.

Warnings are an exception. An uncertain person, year, number, algorithm or formula absent from the human prose normally needs no visible warning. An unresolved teacher view or claim conflict must not be rewritten as fact. The quality gate checks unsupported additions, enrichment scope and severe warning failures; it does not turn every source risk into a callout.
