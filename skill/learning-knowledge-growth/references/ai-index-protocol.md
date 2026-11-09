# AI Index and Knowledge Object Protocol

This reference defines the compact AI-facing layer used by `learning-knowledge-growth`. It is an index and retrieval aid; the Human Note remains the readable source of learning detail.

## Retrieval levels

These levels govern retrieval from **existing knowledge**, not the first reading of new material. First establish the contents and coverage of the complete user-selected input scope, in bounded passes if necessary. Do not discard unread pages or source spans because they failed a keyword match; record extraction gaps instead of treating them as irrelevant.

1. **L0 course index** — load one small `index.json` first. Use it to find relevant note records, sources, aliases and page-level relations.
2. **L1 knowledge cards** — load only matching `cards/*.json`. Use them to identify the canonical object, its role, claims, section anchors and relations.
3. **L2 Human Note sections** — open only the sections named by the cards or alignment result. Preserve all useful existing content.
4. **L3 evidence** — return to the transcript, slide or document only for provenance, uncertainty, conflict or missing detail.

Do not jump from L0 to the entire Vault. Do not rebuild a card by copying a whole Markdown page.

Source understanding may be richer than the selected Human Note explanation depth. The AI layer remains a retrieval aid: preserve compact topic/object cues and original locators for later reading, not all prose omitted from a concise note. Deliberately unexpanded, source-supported detail is not `deferred`, and a short mention does not prove that all of its details are already covered by the current note. Do not create a separate card or page for every passing keyword.

## Selecting evidence for a knowledge object

- After understanding the selected new material, assemble only the context needed for the current object or proposed update. Match stable IDs, canonical terms, aliases and source locations before using broader keyword matches. Three to five candidate units can be a starting point, never a hard cap or a completeness guarantee.
- Include the definition, conditions, variable meanings, formula or derivation, example, method choice, boundary, learning advice and disagreement needed to understand the supported claim. Follow cross-references and adjacent spans when needed; an example or later qualification may be essential even without a matching keyword. Expand the context when a dependency is missing or a conflict remains unresolved.
- Keep the source locator attached to each selected excerpt: source identity, original file, page/slide or line/span, and source hash where available. Extracted text must retain a mapping to those original locations. A model summary or card can route retrieval, but cannot be the sole evidence for adding, correcting or resolving a claim. Open the referenced original material, or the actual valid existing note when it is the supplied seed knowledge; if neither is available, retain the gap explicitly.
- Reuse already loaded evidence within the run instead of repeatedly reading or summarizing it. Deduplicate identical spans, not distinct examples or qualifications. This is a Codex context-selection practice, not another model call, required stage, permanent evidence packet or new index format.

### Evidence packet for one decision (temporary)

When a card, Human Note section or proposed update needs context, the runner may assemble a small temporary packet with these in-memory fields:

```text
sourceId + original locator + excerpt + evidence role + adjacent-span reason
```

`evidence role` can be `definition`, `condition`, `formula`, `example`, `method`, `boundary`, `relation` or `uncertainty`. This is a selection convention, not a new durable schema or a fifth machine table. Build it deterministically from the already loaded SourceMap/LessonModel and bounded existing-note references: match stable IDs first, then canonical terms/aliases, then broader retrieval; deduplicate exact spans; retain distinct examples and qualifications; and widen the packet whenever a claim lacks its condition or counter-scope. Apply token limits only after those coverage checks. The packet may be discarded after the decision, while its source IDs and locators remain in the AI card or update result.

Retrieval ranking is a candidate selector only. A high similarity score does not prove that the selected source supports the claim. For formulas and conditions, numbers or historical claims, teacher examples being generalized, corrections/conflicts, and uncertain source units, return to the original span before writing or resolving the object. A simple existence check for a source ID is insufficient; the wording of the claim must be supported by the located content. If support is weaker than the proposed wording, shorten the claim, retain an uncertainty/deferred state, or leave it out.

When a later run proposes an update, run a cheap unchanged gate before semantic judgment. Compute a comparison tuple from the stable ID, task scope, selected depth, relevant source hashes and locators, current Human Note hash, relevant AI-card hash, and dependent relation/source hashes. Reuse the existing object only when every required component is present and exactly equal to the recorded tuple. Any unknown or stale component, changed scope, uncertain/conflicted source, or explicit correction request goes through Alignment/ChangePlan. This gate saves repeated decisions; it never turns similarity into `NO_CHANGE`, does not certify factual truth, and must be reported as deterministic reuse rather than a fresh semantic judgment. For a batch, keep only transient counts such as `prefiltered`, `evaluated`, and `forced_evaluation`; do not create a per-run history file.

## Course index minimum

The course `index.json` should contain:

```json
{
  "indexVersion": "knowledge-growth-index/1",
  "course": "...",
  "updatedAt": "...",
  "sources": [],
  "records": [],
  "relations": [],
  "sync": {}
}
```

Each record should identify a Human Note, stable `knowledgeId`, title, aliases when known, maintenance state, source references, open items and the current note hash. A last-update timestamp is optional; do not append a run-history entry for every invocation. Page relations are routing hints; they do not replace object relations.

Generated Human-layer visuals are listed once in the owning record's `attachments` with `assetRef`, `sha256`, `kind` and `generatedFrom`. Use `kind` values such as `excalidraw`, `chart-svg`, `interactive-html`, `interactive-model` and `excalidraw-review-map`, and `generatedFrom` values `source-derived`, `external-data` or `ai-relations`. A chapter review map belongs to the chapter's topic-page record; refresh its hash whenever the map is regenerated.

An authorized external supplement is also one `sources` entry, with `type: "外部补充"`, the page or dataset `url`, `title`, `accessedAt`, the series or section used, and a one-line `purpose`; it has no transcript line locators. Claims that rely on it reference that `sourceId` and state in `uncertainty` that the support is external rather than classroom evidence.

Store original source identity, locator convention and content hash once in `sources`; cards may reference that entry plus the relevant locations. Do not duplicate complete source descriptions in every card. A hash detects changed content; it does not prove factual correctness.

Selected source images are Human-layer attachments. When used, merge their metadata into the corresponding source entry's optional `attachments`: `assetRef` relative to the Human output root, image `sha256`, and `locator` with a positive original `page` or `slide` number; an optional `region` inside the locator identifies a crop. Keep the source's `sourceHash` tied to the original document. Deduplicate metadata by source, locator and asset identity: the same image bytes can share one file while occurring at different source locations. Cards reuse existing `sourceRefs` and locators instead of copying images, base64 or full OCR text. Map image-helper `assetPath` to `assetRef`, `imageHash` to `sha256`, and `source.hash`/`source.locator` to the original source and location. Helper JSON is temporary input to this merge, not a separate durable attachment manifest. Existing indexes without images need no migration.

The optional `sync` object is the compact place for current integrity state,
for example `lastValidatedAt`, `validationStatus`, `sourceHash` and a small
count summary. It is overwritten on the next successful update. Do not create
a separate manifest or validation log merely to preserve these values.

## Knowledge card minimum

Cards are compact and bounded. A card normally contains:

```json
{
  "knowledgeId": "course.object",
  "canonicalTerm": "...",
  "aliases": [],
  "knowledgeRole": "concept|mechanism|formula|method|example|boundary|moc",
  "semanticCore": "one or two precise sentences",
  "keyClaims": [],
  "sectionRefs": [],
  "humanNoteRef": "...",
  "sourceRefs": [],
  "relations": [],
  "uncertainty": [],
  "maintenanceState": "active|growing|deferred|conflicted",
  "fingerprint": "..."
}
```

`keyClaims` are short retrieval claims, not a replacement for the Human Note. Their count is proportional to the object: keep only the claims needed to retrieve and distinguish it; do not force every card into a fixed number of claims. `sectionRefs` must point to real headings or stable anchors. `relations` must name a target `knowledgeId` and a meaningful type such as `prerequisite-to`, `part-of`, `contrasts-with`, `applies-to`, `exemplifies`, `causes` or `related-to`. Do not invent a relation because two pages happen to share a chapter.

## Incremental update rules

- Match by `knowledgeId`, canonical term, aliases and claim similarity before creating a new object.
- If the object exists, update its card and the referenced Human Note section; do not create a duplicate page merely because the lesson came from a new session.
- Distinguish a supported addition, a correction, a difference in scope or assumptions, and unresolved evidence before writing. Integrate genuinely new meaning at the selected explanation depth; do not append another explanation merely because it is source-supported. Correct only the claim the evidence actually overturns; preserve compatible formulations with their conditions; defer uncertain differences instead of silently choosing one. A new session or different wording alone is not a correction.
- ChangePlan proposals are patches over the current state, not replacements. Allowed default intents are `add_supported`, `narrow_scope`, `add_relation`, `annotate_uncertainty`, and `correct_overturned_claim`; preserve existing compatible content and provenance for all other claims. A removal, archival or merge that would discard information needs an explicit user instruction and a bounded target. If that instruction is absent, keep both formulations with their conditions or mark the difference deferred.
- Treat update state as three meanings even though no new enum is needed: maintain a supported object; hold/profile an ambiguous difference with `maintenanceState: "deferred"` and the existing deferred resolution semantics; correct only when evidence overturns the old claim. A deferred object remains discoverable and reactivatable, and must not overwrite a settled Human Note claim.
- If evidence is insufficient, keep the card with `maintenanceState: "deferred"` and preserve the evidence gap. Split unrelated evidence gaps into separate cards when they require different future evidence or point to different sections; do not put every unresolved item into one catch-all card.
- If two objects may be the same but cannot be safely merged, keep separate cards and add a bounded relation or unresolved note.
- Update `sourceRefs`, `sectionRefs`, hashes and relations together with the note change.
- Heading numbers are presentation, not identity: when Human Note headings are numbered or renumbered, update affected `sectionRefs` and authorized note links to their actual final targets. Preserve `knowledgeId`; never derive it from a heading's sequence number. Report known incoming links outside the authorized edit scope that still need repair without expanding to a full-Vault scan.
- Never delete a card or human section solely because the latest source omitted it.
- After drafting a high-level semantic core or compact summary, compare it back to the selected original spans. If a condition, limitation, numerical qualifier or uncertainty marker is not supported by the spans, shorten the summary or reopen a wider packet before writing. The AI card is a routing aid and cannot validate its own summary.
- Retain current knowledge and its source references without accumulating permanent per-run versions or full source copies. Use the user's existing version control when available; this skill does not require a new history store.

## Token and integrity rules

- Keep the L0 index small enough to load for every run.
- Before reusing a retrieved card or extraction, compare its recorded source and Human Note hashes with the relevant current files. Refresh stale locations or claims from those files, preserving manual note edits. Missing hashes mean freshness is unknown, not unchanged. Unchanged bytes permit reuse of extraction or routing data; they do not by themselves prove `NO_CHANGE` when the task or other evidence differs.
- Keep the AI layer bounded: update the current index and affected cards in
  place instead of creating timestamped copies. Provenance is retained as
  source references and hashes, not as duplicated source files.
- Keep each card focused on one learning object; split cards when unrelated claims cannot share a section anchor.
- Do not put full transcript excerpts, full note bodies, or long teaching narratives in cards.
- Every card claim must retain source references or an explicit uncertainty marker.
- Rebuild only affected records, cards and relations; an unchanged course is not a reason to reread all its notes. If evidence selection omits a necessary condition, formula, example or boundary, widen retrieval before writing rather than accepting the omission to meet a context budget.
- Reject broken note paths and unresolved relation targets during preflight; keep a compact unresolved item instead of silently presenting them as valid links. Check changed records/cards, their relation targets, section anchors, image references and known affected incoming references; load referenced targets as needed without reading the entire Vault. Any `PASS` applies only to this stated scope, not to untouched parts of the course. Update the compact integrity counts when an authorized repair splits or removes a card.
