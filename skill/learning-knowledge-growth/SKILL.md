---
name: learning-knowledge-growth
description: Use Codex to turn attached transcripts, slides, documents, or project files into linked, incrementally growing Human and AI knowledge notes.
---

# Learning Knowledge Growth

Use this skill when the user supplies learning materials and wants them compiled into an existing or new knowledge system.

## Required first-use setup

Before the first run, require two explicit output directories from the user:

- Human output root: Markdown notes for reading, review, and Obsidian linking.
- AI output root: machine artifacts and durable semantic state for later runs.

If the user already provided both paths in the current conversation, use them. Otherwise ask for exactly those two paths and stop before processing input. Save the resolved paths in a small configuration file named knowledge-growth.config.json in the selected AI output root or a separate workspace directory. Never put this configuration or intermediate artifacts in the production Vault by default.

On later runs, reuse the saved paths unless the user explicitly changes them. Treat the two roots as independent; do not place machine JSON beside the human Markdown unless the user deliberately chose the same directory.

## Inputs and routing

Accept files attached to the conversation or paths supplied by the user. Classify every input before compiling:

- .txt, .md, audio transcript, or pasted text: evidence source; use the existing SourceMap -> LessonModel -> Alignment -> ChangePlan pipeline.
- .pptx, .ppt, .pdf, images, or documents: inspect visible text, headings, formulas, tables, and diagrams with the appropriate document, presentation, or PDF tools. Preserve the original file as evidence and create a bounded normalized source for the pipeline. Mark information that cannot be read or verified as deferred.
- A project folder, .zip, or source tree: inspect its manifest and the smallest relevant set of files; treat code, README, diagrams, and examples as learning evidence. Do not recursively ingest unrelated build output or dependencies.
- Existing Markdown notes: seed Knowledge State, not new source material. Preserve useful definitions, formulas, examples, comparisons, methods, boundaries, study guidance, and links.

Infer the course or subject from an explicit user label, selected folder, existing profile, or the material itself. If two subjects are plausible, ask before writing. For a new subject, use a bounded snapshot of the selected course folder and create a new profile candidate rather than scanning the Vault.

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

Before accepting any machine intermediate, run a deterministic contract pass. For SourceMap, `sources[].quality` must be exactly an object with `rating` (`clean`, `noisy`, `partial`, `unreadable`, or `unknown`) and optional schema-approved `issues`/`note`; if Codex returns a useful description without `rating`, derive the least-committal rating and retain the description in the bounded `note`, then remove protocol-unknown keys. Preserve the raw response in the run diagnostics before normalization. A single mechanical shape mismatch must not trigger full-pipeline regeneration.

The Human Note must read like the user's strong existing Java OOP, macroeconomics, and accounting notes: direct knowledge expression, dense but readable knowledge blocks, definitions, mechanisms, formulas, examples, comparisons, conditions, boundaries, methods, mistakes, and meaningful wikilinks. Do not write a transcript diary or repeat “the teacher said”. Preserve existing valid content, but allow the target page to expand, reorganize, and complete its knowledge structure; the old page's length, section count, or current sparseness is not a limit. Do not discard a useful example, formula, boundary, method, or comparison merely because it is not in the old page. Keep deferred or uncertain material short and clearly bounded. The delivered note is a formal knowledge note: do not put `candidate`, `draft`, `preview`, run IDs, or pipeline status in its title, filename, or learning prose.

Render mathematics as Obsidian Markdown/LaTeX, never as unmarked plain text. Use single dollar delimiters for inline expressions (`$...$`) and double dollar delimiters on separate lines for display expressions (`$$...$$`). Keep the opening and closing delimiters paired, keep display delimiters on their own lines, and do not mix Markdown code fences with formula delimiters. Preserve an explicitly missing or uncertain formula as a clearly marked missing item instead of inventing it. Before delivery, scan the final Markdown for unpaired dollar delimiters and repair only unambiguous cases.

Build the surrounding knowledge network while writing the note. Reuse resolvable wikilinks to existing course notes and bounded reference notes when the relationship is supported by the input; add links for prerequisites, examples, contrasts, applications, and closely related concepts. Apply a dedicated page-level link pass before delivery: whenever a course scope, module list, outline, table of contents, relation list, or knowledge-map sentence names an existing loaded note or a loaded note's exact alias, write that item as an Obsidian wikilink at its first meaningful mention (for example, `[[货币与信用]]`), even when the item is also a broad category. If the visible wording is more descriptive than the target filename, use `[[Target|visible wording]]`. A category label is not a reason to leave an otherwise resolvable knowledge page unlinked. Do not create decorative links or link to files that were not loaded. Keep provenance and stable machine identity in the AI layer or manifest rather than polluting the human note.

The AI layer must be a retrieval layer, not a second copy of Human Markdown. Maintain two progressively loaded levels:

- **Course index (L0)**: one small `index.json` per course. It maps sources to note records, stable `knowledgeId`s, aliases, note paths, maintenance state, open items, hashes and page-level relations. It answers “which pages and objects are relevant?” without opening full notes.
- **Knowledge object cards (L1)**: compact records under `cards/` for concepts, mechanisms, formulas, methods, examples, boundaries and unresolved objects. Each card has a stable identity, canonical term, aliases, role, bounded semantic core, key claims, section anchors, human-note reference, source references, relations and update state. It answers “which object and section should change?”

Only after L0/L1 routing may the run open the relevant Human Note sections (L2) and original evidence (L3). Never recreate L1 by copying a whole Human Note. Human Markdown must not be polluted with machine IDs or JSON metadata. Read [references/ai-index-protocol.md](references/ai-index-protocol.md) when creating or updating the AI layer.

## Output placement

Each run gets an isolated temporary workspace under the configured AI output root or a separate workspace, with source, provenance, working artifacts, candidate, and audit files. After validation:

- copy or materialize the final Human Note candidate under the configured Human output root, preserving course and note identity;
- copy the AI artifacts under the configured AI output root, preserving the run ID and course;
- keep a manifest linking the two outputs and their source hashes.

After both final outputs are written and their basic integrity checks pass, delete disposable working artifacts. Keep only the two final layers, their manifest, and a compact audit record. If validation fails, retain the working directory and report its path for diagnosis.

The normal successful result is the formal Human Note and its corresponding AI knowledge state, written to the configured separate roots. Do not label successful outputs as candidates. When a target already exists, preserve its useful content and produce an explicit update with a readable change summary; never silently discard old material. The user is expected to inspect the resulting Git diff and can revert it. Do not delete existing knowledge automatically.

If validation fails, keep all intermediate artifacts and report the exact stage and file; do not present a partial artifact as a finished note. A malformed model response may receive bounded mechanical repair, but do not regenerate the entire pipeline unnecessarily.

## Self-growth and later runs

On every later run, load the previous course index first, then retrieve only the matching knowledge cards and Human Note sections. Match new lesson objects against canonical terms, aliases, claims, section anchors and relations before considering a new page. Use stable note identity and source provenance to decide NEW, EXPAND, REFINE, RELATION, CORRECT, CONFLICT, or NO_CHANGE. Evidence uncertainty belongs in Alignment; ChangePlan decides proposed mutations. A deferred item remains reactivatable when new evidence arrives. Update the index and affected cards atomically with the Human Note change, and record the old/new hashes and source refs in the manifest.

Every successful run must report input files and their types, selected course, Human output path, AI output path, run ID, validation status, deferred items, missing evidence, links added or updated, and whether any production Vault write occurred.

## Scope and safety

Never search the entire Vault. Use explicit course profiles, selected folders, or bounded existing-note references. Never modify or delete existing notes without an explicit write request. Keep API keys in environment configuration; do not copy them into notes, manifests, or skill files.
