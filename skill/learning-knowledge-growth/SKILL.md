---
name: learning-knowledge-growth
description: Use Codex to turn transcripts, slides, PDFs, documents, images, or project files into linked, incrementally growing Human and AI knowledge notes.
---

# Learning Knowledge Growth

Use this skill when the user supplies learning materials and wants them compiled into an existing or new knowledge system.

## Required first-use setup

Before the first run, require two explicit output directories from the user:

- Human output root: Markdown notes for reading, review, and Obsidian linking.
- AI output root: machine artifacts and durable semantic state for later runs.

If the user already provided both paths in the current conversation, use them. Otherwise ask for exactly those two paths and stop before processing input. Save the resolved paths in a small configuration file named knowledge-growth.config.json in the selected AI output root or a separate workspace directory. Never put this configuration or intermediate artifacts in the production Vault by default.

On later runs, reuse the saved paths unless the user explicitly changes them. Treat the two roots as independent; do not place machine JSON beside the human Markdown unless the user deliberately chose the same directory.

## Intake questions

At the beginning of a new course or a new kind of material, ask the user for two small preferences before deep processing, unless the user has already answered them in the current conversation:

1. **Material type** — choose one or more: `课堂转写`, `课件/PPT`, `PDF/教材/文档`, `图片/扫描资料`, `项目/代码/ZIP`, or `混合资料`.
2. **Information density** — choose one: `完整保留` (keep all source-supported learning value and remove only verbal or administrative repetition), `平衡整理` (keep useful detail while compressing repetition), or `AI 自行取舍` (let Codex choose the amount based on future review value).

If several files have different types, record a type for each file and use `混合资料` for the batch. If the user has not selected a density, do not silently choose aggressive compression: ask once, then keep the choice in the AI index's course metadata or the small setup configuration. Do not create a per-run manifest just to store this preference. The density preference applies to newly compiled material; it never authorizes deletion of valid existing note content. If the user says “完整” or “让 AI 自己判断”, map it directly to the corresponding option without asking the same question again.

## Inputs and routing

Accept files attached to the conversation or paths supplied by the user. Classify every input before compiling:

- .txt, .md, audio transcript, or pasted text: evidence source; use the existing SourceMap -> LessonModel -> Alignment -> ChangePlan pipeline.
- .pptx, .ppt, .pdf, images, or documents: inspect visible text, headings, formulas, tables, and diagrams with the appropriate document, presentation, or PDF tools. Preserve the original file as evidence and create a bounded normalized source for the pipeline. Mark information that cannot be read or verified as deferred.
- A project folder, .zip, or source tree: inspect its manifest and the smallest relevant set of files; treat code, README, diagrams, and examples as learning evidence. Do not recursively ingest unrelated build output or dependencies.
- Existing Markdown notes: seed Knowledge State, not new source material. Preserve useful definitions, formulas, examples, comparisons, methods, boundaries, study guidance, and links.

Infer the course or subject from an explicit user label, selected folder, existing profile, or the material itself. If two subjects are plausible, ask before writing. For a new subject, use a bounded snapshot of the selected course folder and create a new profile candidate rather than scanning the Vault.

Use the input type to choose the reading tool before compiling. Read [references/input-modes.md](references/input-modes.md) when the batch contains anything beyond plain text. The tool is for extraction and evidence navigation; it must not turn the source into an unsupported textbook summary:

- `课堂转写` / `.txt` / pasted text: read the source directly and preserve source spans, repetitions that carry teaching value, examples, formulas, and uncertainty.
- `课件/PPT` / `.pptx` / `.ppt`: use the presentation-reading capability to inspect slide text, speaker notes, tables, formulas, diagrams, and slide order; keep slide numbers as provenance.
- `PDF/教材/文档`: use the PDF or document-reading capability appropriate to the file. Render pages when layout, formulas, tables, or diagrams affect meaning; keep page numbers and extraction limits.
- `图片/扫描资料`: use image understanding or image viewing to read visible text, handwriting, formulas, and diagrams; mark unreadable regions as deferred instead of guessing.
- `项目/代码/ZIP`: inspect the manifest and the smallest relevant set of README, source, examples, and diagrams; do not ingest dependencies or build output.
- `混合资料`: route each file with its own tool, then reconcile them as one bounded lesson only when their topic and scope match.

Preserve the original files as evidence. If a tool can extract only part of a file, record what was read and what was unavailable; do not silently treat a partial extraction as complete.

## Compilation behavior

Codex is the only reasoning and generation model for this skill. Do not call DSH, Luna, DeepSeek, Jev, or another external model. Do not require the user to understand or operate the internal stages.

Use the bundled companion repository (or its configured local checkout) for versioned prompts, schemas, course profiles, and conventions. The skill may use one Codex turn or several bounded internal passes. It may create temporary evidence maps, knowledge objects, alignment drafts, and change drafts as working memory, but these are implementation details rather than user-facing requirements.

For text inputs, read the selected profile or bounded course folder, the original source, and a small set of existing seed notes. Keep the original input immutable. Reuse the repository's SourceMap, LessonModel, Alignment, and ChangePlan semantics internally when useful, but one Codex orchestration may perform the whole compilation.

Use single-topic compilation by default. When several source files are attached,
group them by clearly distinct topic and produce a complete note for each topic;
do not rebuild an entire course unless the user explicitly requests a course
rebuild. A broad course folder is context for routing, not a reason to pass every
page into every note generation call.

For non-text inputs, first extract or transcribe only the bounded relevant content into the run workspace, record the original file and extraction method in provenance, then run the same compilation stages. Do not silently invent missing formulas or diagram content.

When a source PDF or slide contains a useful diagram, chart, spatial layout or visual derivation, consider embedding a selected original screenshot beside the relevant explanation. Follow the selection, attachment and cleanup rules in [references/input-modes.md](references/input-modes.md). Images supplement readable knowledge; do not turn a deck into a screenshot dump or replace searchable formulas with pictures.

Before accepting any machine intermediate, run a deterministic contract pass. For SourceMap, `sources[].quality` must be exactly an object with `rating` (`clean`, `noisy`, `partial`, `unreadable`, or `unknown`) and optional schema-approved `issues`/`note`; if Codex returns a useful description without `rating`, derive the least-committal rating and retain the description in the bounded `note`, then remove protocol-unknown keys. Keep raw responses only in the temporary workspace while repairing or diagnosing a failure; never promote them to durable knowledge output. A single mechanical shape mismatch must not trigger full-pipeline regeneration.

The Human Note must read like the user's strong existing Java OOP, macroeconomics, and accounting notes: direct knowledge expression, dense but readable knowledge blocks, definitions, mechanisms, formulas, examples, comparisons, conditions, boundaries, methods, mistakes, and meaningful wikilinks. Do not write a transcript diary or repeat “the teacher said”. Preserve existing valid content, but allow the target page to expand, reorganize, and complete its knowledge structure; the old page's length, section count, or current sparseness is not a limit. Do not discard a useful example, formula, boundary, method, or comparison merely because it is not in the old page. Every added definition, mechanism, formula, example, comparison, boundary, method, or mistake must be traceable to an explicit statement in the supplied source or to already existing valid note content. You may clarify, normalize notation, merge duplicates, and reorganize supported material, but do not invent textbook knowledge, new examples, unstated causes, extra error types, or conclusions from general model knowledge. If the source does not support a needed detail, mark it as missing or deferred instead of expanding it. Keep deferred or uncertain material short and clearly bounded. The delivered note is a formal knowledge note: do not put `candidate`, `draft`, `preview`, run IDs, or pipeline status in its title, filename, or learning prose.

Use numbered second-level headings in every delivered Human Note: `## 1. ...`, `## 2. ...`, and so on, consecutively in document order. Keep them as headings, not numbered list items, and normalize existing heading numbers instead of adding duplicate prefixes. Number third-level headings when they express ordered steps, a progression, or a parallel set that benefits from numbered reference, using the parent number (`### 2.1 ...`, `### 2.2 ...`). Otherwise use descriptive unnumbered third-level headings; keep the choice consistent within a sibling group. This does not require numbering the page title or turning all body bullets into ordered lists. Use prose, lists, tables and headings according to the knowledge relationship, avoiding a page made entirely of nested bullets. Before delivery, check the real heading structure outside code fences and quoted source examples, including consecutive H2 numbers and consistent H3 parent numbers. When renaming a heading in an authorized update, synchronize affected section links and AI section references without changing stable knowledge IDs; do not scan or rewrite unrelated notes to enforce this style.

Keep scenario introductions terse: a few words or one short phrase, such as `例：一年期存款` or `情境：价格上涨`, are enough when supported by the source. Sentence fragments are welcome; do not force a subject–verb–object sentence or narrate what the teacher introduced, asked or explained next. Omit the setup entirely when the point is already clear. This compression applies to the framing, not to the evidence: retain necessary assumptions, quantities, steps, comparisons and conclusions. Use a compact label such as `近似` or `待核对` when its epistemic distinction matters; keep detailed classroom attribution in the AI layer. A final prose pass should remove redundant classroom narration without reducing the learning content.

Render mathematics as Obsidian Markdown/LaTeX, never as unmarked plain text. Use single dollar delimiters for inline expressions (`$...$`) and double dollar delimiters on separate lines for display expressions (`$$...$$`). Keep the opening and closing delimiters paired, keep display delimiters on their own lines, and do not mix Markdown code fences with formula delimiters. Preserve an explicitly missing or uncertain formula as a clearly marked missing item instead of inventing it. Before delivery, scan the final Markdown for unpaired dollar delimiters and repair only unambiguous cases.

Build the surrounding knowledge network while writing the note. Reuse resolvable wikilinks to existing course notes and bounded reference notes when the relationship is supported by the input; add links for prerequisites, examples, contrasts, applications, and closely related concepts. Apply a dedicated page-level link pass before delivery: whenever a course scope, module list, outline, table of contents, relation list, or knowledge-map sentence names an existing loaded note or a loaded note's exact alias, write that item as an Obsidian wikilink at its first meaningful mention (for example, `[[货币与信用]]`), even when the item is also a broad category. If the visible wording is more descriptive than the target filename, use `[[Target|visible wording]]`. A category label is not a reason to leave an otherwise resolvable knowledge page unlinked. Do not create decorative links or link to files that were not loaded. Keep provenance and stable machine identity in the AI layer; do not add a separate provenance or manifest file merely to hold metadata.

The AI layer must be a retrieval layer, not a second copy of Human Markdown. Maintain two progressively loaded levels:

- **Course index (L0)**: one small `index.json` per course. It maps sources to note records, stable `knowledgeId`s, aliases, note paths, maintenance state, open items, hashes and page-level relations. It answers “which pages and objects are relevant?” without opening full notes.
- **Knowledge object cards (L1)**: compact records under `cards/` for concepts, mechanisms, formulas, methods, examples, boundaries and unresolved objects. Each card has a stable identity, canonical term, aliases, role, bounded semantic core, only the key claims needed for retrieval, section anchors, human-note reference, source references, relations and update state. Card size and claim count follow object complexity; do not force unrelated evidence gaps into a fixed template or one catch-all card. It answers “which object and section should change?”

Use L0/L1 routing before opening historical Human Note sections (L2) and evidence (L3). This limits repeated historical retrieval, not the initial understanding of the current authorized material: establish its coverage before choosing smaller context for each later decision. Never recreate L1 by copying a whole Human Note. Human Markdown must not be polluted with machine IDs or JSON metadata. Before marking a run successful, resolve affected card relation targets, note paths, section anchors and image references; record the scope of the final integrity status rather than implying a full-Vault check. Read [references/ai-index-protocol.md](references/ai-index-protocol.md) when creating or updating the AI layer.

## Output placement

Use a disposable run workspace outside both final roots (for example, a configured workspace `runs/<run-id>`). It may contain extracted source, provenance, temporary knowledge objects, alignment decisions and repair material while the run is executing. These files are working memory, not a third knowledge layer.

After validation, the durable result is deliberately small:

- formal Human Notes (or additive updates) under the Human output root, plus only the selected source images they use in `_assets/learning/`; these attachments belong to the Human layer;
- one AI knowledge layer under the AI output root: `index.json` and the affected `cards/<knowledgeId>.json` files;
- the one-time `knowledge-growth.config.json` setup file, kept outside the Human Note tree;
- optionally, one overwritten `last-run.md` containing at most a few lines for the user's orientation. It is not required for retrieval or self-growth and must never become a timestamped history.

Do not create a per-run manifest, a full change log, a duplicate provenance file, or a permanent audit directory by default. Source references, note hashes, maintenance state, unresolved items and relations belong in the AI index/cards; the conversation report can state what changed. If the user explicitly asks for a review bundle, export it separately and delete it after review.

Once the Human Note, its attachments and AI index/cards pass their integrity checks, delete the entire temporary run workspace, including raw model responses and unselected page/slide renders. First verify that final image links resolve outside that workspace; retain the referenced Human attachments. Do not delete the original source files or existing shared attachments. If a run fails, write one compact `run-error.md` (or report the error in the conversation) and delete the temporary workspace unless the user explicitly asks to retain diagnostics. Never present a partial artifact as a finished note.

The normal successful result is the formal Human Note and its corresponding AI knowledge state, written to the configured separate roots. Do not label successful outputs as candidates. When a target already exists, preserve its useful content and produce an additive update; never silently discard old material. A short change summary may be shown in the conversation, but it is not a required file and should not accumulate on disk. Do not delete existing knowledge automatically.

A malformed model response may receive bounded mechanical repair, but do not regenerate the entire pipeline unnecessarily.

## Self-growth and later runs

On every later run, load the previous course index first, then retrieve only the matching knowledge cards and Human Note sections. Match new lesson objects against canonical terms, aliases, claims, section anchors and relations before considering a new page. Use stable note identity and source provenance to decide NEW, EXPAND, REFINE, RELATION, CORRECT, CONFLICT, or NO_CHANGE. Evidence uncertainty belongs in Alignment; ChangePlan decides proposed mutations. A deferred item remains reactivatable when new evidence arrives. Update the index and affected cards atomically with the Human Note change. Keep the new note hash, source references, maintenance state and open items in the AI layer; do not create a manifest solely to record old/new hashes.

Every successful run must report in the conversation input files and their types, selected course, Human output path, AI output path, validation status, deferred items, missing evidence, links added or updated, and whether any production Vault write occurred. A run ID may be mentioned for troubleshooting, but does not need to survive as a permanent file.

## Scope and safety

Never search the entire Vault. Use explicit course profiles, selected folders, or bounded existing-note references. Never modify or delete existing notes without an explicit write request. Keep API keys in environment configuration; do not copy them into notes, manifests, or skill files.
