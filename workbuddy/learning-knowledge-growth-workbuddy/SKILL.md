---
name: learning-knowledge-growth-workbuddy
display_name: Learning Knowledge Growth
display_name_en: Learning Knowledge Growth
description: Compile transcripts, slides, PDFs, documents, images, and project files into linked Human and AI knowledge notes in WorkBuddy.
description_zh: 在 WorkBuddy 中将转写、课件、PDF、图片和项目资料整理为可连接、可持续生长的人类笔记与 AI 知识层。
description_en: Compile transcripts, slides, PDFs, images, and project files into linked, incrementally growing Human and AI knowledge notes in WorkBuddy.
version: 0.2.1
author: Learning Agent
user-invocable: true
---

# WorkBuddy 使用约定

这是 WorkBuddy 适配版。执行前读取与当前资料类型相关的参考：

- @references/input-modes.md：PDF、PPT、图片、项目等非纯文本资料。
- @references/note-writing.md：简明提要、重点解释与详细整理。
- @references/ai-index-protocol.md：AI 层检索、来源、哈希与增量更新。
- @references/workbuddy-harness.md：WorkBuddy 权限、Skill 绑定、模型和测试方式。

WorkBuddy 的模型由当前 Expert、工作模式或 Buddy App 配置决定，Skill 不硬编码模型名称或平台凭证。使用用户在 WorkBuddy 中选定的模型；模型可以是 DeepSeek 或平台提供的其它模型。Skill 只规定资料处理和输出行为。
这是 WorkBuddy 本地资料版 Skill。它只处理当前对话附件和用户明确授权的目录；模型、账号和其它服务由 WorkBuddy 自己管理，Skill 不主动连接外部服务。
为降低首次使用门槛：如果用户只提供一个已授权工作区并明确同意，可以在其中使用 inbox、human-notes、ai-knowledge 三个子目录；如果用户已经给出两个输出目录，优先使用用户给出的目录，不要自行改写。

SKILL.md 下方的学习编译规则来自 Learning Agent 的规范版本。保留两个独立输出根目录，并在 WorkBuddy 已授权可访问的文件夹内运行。
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
2. **Explanation depth / 笔记展开程度** — offer `简明提要（推荐）` (recognizable terms, a brief meaning and only necessary qualifiers), `重点解释` (explain difficult or easily confused points selectively), or `详细整理` (retain source-supported detail, including requested examples and derivations). Explain the difference by how much is developed, not by promising that the longest option is best.

If several files have different types, record a type for each file and use `混合资料` for the batch. Reuse a clear preference, or ask once and save the answer in the existing course metadata or setup configuration; no per-run manifest or new configuration schema is required. “简洁 / 知道是什么即可 / 不懂我自己查” selects `简明提要` directly. When the user delegates the choice (`AI 自行取舍`), start concise and expand only to prevent misunderstanding. Recognize saved legacy values: `完整保留` means `详细整理`, `平衡整理` means `重点解释`, and `AI 自行取舍` means the concise adaptive behavior. The user's current request overrides a saved preference; do not silently override an explicit request for full detail. Depth governs newly written explanations, not permission to discard valid existing content. Read [references/note-writing.md](references/note-writing.md) before drafting Human Notes.

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

Use the model configured by the WorkBuddy harness for reasoning and generation. Do not launch DSH, Jev, or a second model provider from a script; DeepSeek may be the model selected in WorkBuddy. Do not require the user to understand or operate the internal stages.

Use the bundled companion repository (or its configured local checkout) for versioned prompts, schemas, course profiles, and conventions. The skill may use one WorkBuddy turn or several bounded internal passes. It may create temporary evidence maps, knowledge objects, alignment drafts, and change drafts as working memory, but these are implementation details rather than user-facing requirements.

For text inputs, read the selected profile or bounded course folder, the original source, and a small set of existing seed notes. Keep the original input immutable. Reuse the repository's SourceMap, LessonModel, Alignment, and ChangePlan semantics internally when useful, but one WorkBuddy orchestration may perform the whole compilation.

Use single-topic compilation by default. When several source files are attached,
group them by clearly distinct topic and produce a focused note at the selected depth;
do not rebuild an entire course unless the user explicitly requests a course
rebuild. A broad course folder is context for routing, not a reason to pass every
page into every note generation call.

For non-text inputs, first extract or transcribe only the bounded relevant content into the run workspace, record the original file and extraction method in provenance, then run the same compilation stages. Do not silently invent missing formulas or diagram content.

When a source PDF or slide contains a useful diagram, chart, spatial layout or visual derivation, consider embedding a selected original screenshot beside the relevant explanation. Follow the selection, attachment and cleanup rules in [references/input-modes.md](references/input-modes.md). Images supplement readable knowledge; do not turn a deck into a screenshot dump or replace searchable formulas with pictures.

Before accepting any machine intermediate, run a deterministic contract pass. For SourceMap, `sources[].quality` must be exactly an object with `rating` (`clean`, `noisy`, `partial`, `unreadable`, or `unknown`) and optional schema-approved `issues`/`note`; if the configured model returns a useful description without `rating`, derive the least-committal rating and retain the description in the bounded `note`, then remove protocol-unknown keys. Keep raw responses only in the temporary workspace while repairing or diagnosing a failure; never promote them to durable knowledge output. A single mechanical shape mismatch must not trigger full-pipeline regeneration.

Before an expensive Alignment or ChangePlan judgment, use a deterministic unchanged check. A lesson object may skip that judgment only when its stable identity, relevant source hash and locator, current Human Note hash, relevant AI-card hash, requested explanation depth and dependent relation/source hashes all match the last known state. A matching phrase, embedding score or similar summary is insufficient. If any hash, dependency or scope is missing or stale, send the object through the normal decision path. A skip reuses the existing state; it does not assert that the source is factually correct or that a new task has no effect.

The Human Note should help the reader recognize a knowledge point, recover its gist and find where to look next. Understand the selected material fully, but do not equate source coverage with printing every detail. In concise mode, start with a term and a short explanation, adding only a condition, distinction, formula, example or step that materially changes understanding. These content roles are a toolbox, not required sections for every point. Do not automatically fill a textbook-shaped structure or retell the lecture. Follow [references/note-writing.md](references/note-writing.md) for depth, selection and examples.

Preserve valid existing content during authorized updates; add or revise only genuinely new meaning, not another paraphrase of the same idea. Every new knowledge claim must be supported by supplied material or valid existing notes. Do not invent definitions, examples, causes, mistakes or missing formulas from model memory. Mark actual evidence gaps briefly; choosing not to elaborate a supported point is not a gap. Deliver formal knowledge notes without `candidate`, `draft`, `preview`, run IDs or pipeline status in their names or learning prose.

Use numbered second-level headings in every delivered Human Note: `## 1. ...`, `## 2. ...`, and so on, consecutively in document order. Keep them as headings, not numbered list items, and normalize existing heading numbers instead of adding duplicate prefixes. Number third-level headings when they express ordered steps, a progression, or a parallel set that benefits from numbered reference, using the parent number (`### 2.1 ...`, `### 2.2 ...`). Otherwise use descriptive unnumbered third-level headings; keep the choice consistent within a sibling group. This does not require numbering the page title or turning all body bullets into ordered lists. Use prose, lists, tables and headings according to the knowledge relationship, avoiding a page made entirely of nested bullets. Before delivery, check the real heading structure outside code fences and quoted source examples, including consecutive H2 numbers and consistent H3 parent numbers. When renaming a heading in an authorized update, synchronize affected section links and AI section references without changing stable knowledge IDs; do not scan or rewrite unrelated notes to enforce this style.

Use concise phrases throughout, not only in scenario introductions. `例：一年期存款` can replace a long setup; omit the setup when unnecessary. Sentence fragments are welcome if clear, with no forced subject–verb–object sentence or transition paragraph. Preserve the assumptions, quantities and steps needed to understand the selected point; optional examples and derivations follow the chosen depth. Use compact labels such as `近似` or `待核对` when the distinction matters. Remove redundant classroom narration, repeated explanations and nonessential expansion before delivery.

Render mathematics as Obsidian Markdown/LaTeX, never as unmarked plain text. Use single dollar delimiters for inline expressions (`$...$`) and double dollar delimiters on separate lines for display expressions (`$$...$$`). Keep the opening and closing delimiters paired, keep display delimiters on their own lines, and do not mix Markdown code fences with formula delimiters. Preserve an explicitly missing or uncertain formula as a clearly marked missing item instead of inventing it. Before delivery, scan the final Markdown for unpaired dollar delimiters and repair only unambiguous cases.

Build the surrounding knowledge network while writing the note. Reuse resolvable wikilinks to existing course notes and bounded reference notes when the relationship is supported by the input; add links for prerequisites, examples, contrasts, applications, and closely related concepts. Apply a dedicated page-level link pass before delivery: whenever a course scope, module list, outline, table of contents, relation list, or knowledge-map sentence names an existing loaded note or a loaded note's exact alias, write that item as an Obsidian wikilink at its first meaningful mention (for example, `[[货币与信用]]`), even when the item is also a broad category. If the visible wording is more descriptive than the target filename, use `[[Target|visible wording]]`. A category label is not a reason to leave an otherwise resolvable knowledge page unlinked. Do not create decorative links or link to files that were not loaded. Keep provenance and stable machine identity in the AI layer; do not add a separate provenance or manifest file merely to hold metadata.

Treat retrieval relevance as a routing signal, not as proof. A BM25/vector match can select candidate notes or source units, but it cannot authorize a merge, correction or factual claim. For each written claim, keep a source locator or a valid existing-note reference. Re-open the original span for formulas and their conditions, numerical or historical claims, teacher examples generalized into rules, corrections/conflicts, and any claim whose source is uncertain. If the source does not support the wording, shorten it to the supported observation, mark it as uncertain/deferred, or omit it; do not repair the gap from model memory. Use this targeted support check instead of an expensive fact-checking call for every ordinary claim.

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

Do not create a per-run manifest, a full change log, a duplicate provenance file, or a permanent audit directory by default. Source references, note hashes, maintenance state, unresolved items and relations belong in the AI index/cards; the conversation report can state what changed. If the user explicitly asks for a review bundle, export it separately and discard it after review.

Once the Human Note, its attachments and AI index/cards pass their integrity checks, discard the entire temporary run workspace, including raw model responses and unselected page/slide renders. First verify that final image links resolve outside that workspace; retain the referenced Human attachments. Do not discard the original source files or existing shared attachments. If a run fails, write one compact `run-error.md` (or report the error in the conversation) and discard the temporary workspace unless the user explicitly asks to retain diagnostics. Never present a partial artifact as a finished note.

The normal successful result is the formal Human Note and its corresponding AI knowledge state, written to the configured separate roots. Do not label successful outputs as candidates. When a target already exists, preserve useful content and integrate supported changes without appending duplicate explanations. A concise preference is not permission to batch-shorten old notes; apply it to new text unless the user authorizes a specific rewrite scope. A short change summary may be shown in the conversation, but is not a required file and should not accumulate on disk. Do not discard existing knowledge automatically.

A malformed model response may receive bounded mechanical repair, but do not regenerate the entire pipeline unnecessarily.

## Self-growth and later runs

On every later run, load the previous course index first, then retrieve only the matching knowledge cards and Human Note sections. Match new lesson objects against canonical terms, aliases, claims, section anchors and relations before considering a new page. Use stable note identity and source provenance to decide NEW, EXPAND, REFINE, RELATION, CORRECT, CONFLICT, or NO_CHANGE. Evidence uncertainty belongs in Alignment; ChangePlan decides proposed mutations. A deferred item remains reactivatable when new evidence arrives. Update the index and affected cards atomically with the Human Note change. Keep the new note hash, source references, maintenance state and open items in the AI layer; do not create a manifest solely to record old/new hashes.

For update decisions, keep three meanings separate: maintain an already supported state; profile/hold a plausible but insufficiently supported difference; correct only when reliable evidence overturns the existing claim. Use the existing `NO_CHANGE`/`resolutionState`, `maintenanceState: deferred`, and `CORRECT` semantics rather than inventing a new relation enum. A held item must stay discoverable and reactivatable; it must not overwrite the Human Note or be presented as settled knowledge. If a change is skipped by the unchanged check, report it as a deterministic reuse in the conversation rather than silently treating it as a fresh semantic decision.

Every successful run must report in the conversation input files and their types, selected course, Human output path, AI output path, validation status, deferred items, missing evidence, links added or updated, and whether any production Vault write occurred. A run ID may be mentioned for troubleshooting, but does not need to survive as a permanent file.

## Scope and safety

Never search the entire Vault. Use explicit course profiles, selected folders, or bounded existing-note references. Never modify or discard existing notes without an explicit write request. Keep credentials in environment configuration; do not copy them into notes, manifests, or skill files.
