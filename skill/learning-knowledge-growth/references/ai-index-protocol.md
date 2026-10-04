# AI Index and Knowledge Object Protocol

This reference defines the compact AI-facing layer used by `learning-knowledge-growth`. It is an index and retrieval aid; the Human Note remains the readable source of learning detail.

## Retrieval levels

1. **L0 course index** — load one small `index.json` first. Use it to find relevant note records, sources, aliases and page-level relations.
2. **L1 knowledge cards** — load only matching `cards/*.json`. Use them to identify the canonical object, its role, claims, section anchors and relations.
3. **L2 Human Note sections** — open only the sections named by the cards or alignment result. Preserve all useful existing content.
4. **L3 evidence** — return to the transcript, slide or document only for provenance, uncertainty, conflict or missing detail.

Do not jump from L0 to the entire Vault. Do not rebuild a card by copying a whole Markdown page.

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

Each record should identify a Human Note, stable `knowledgeId`, title, aliases when known, maintenance state, source references, open items, note hash and last run. Page relations are routing hints; they do not replace object relations.

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

`keyClaims` are short retrieval claims, not a replacement for the Human Note. `sectionRefs` must point to real headings or stable anchors. `relations` must name a target `knowledgeId` and a meaningful type such as `prerequisite-to`, `part-of`, `contrasts-with`, `applies-to`, `exemplifies`, `causes` or `related-to`. Do not invent a relation because two pages happen to share a chapter.

## Incremental update rules

- Match by `knowledgeId`, canonical term, aliases and claim similarity before creating a new object.
- If the object exists, update its card and the referenced Human Note section; do not create a duplicate page merely because the lesson came from a new session.
- If evidence is insufficient, keep the card with `maintenanceState: "deferred"` and preserve the evidence gap.
- If two objects may be the same but cannot be safely merged, keep separate cards and add a bounded relation or unresolved note.
- Update `sourceRefs`, `sectionRefs`, hashes and relations together with the note change.
- Never delete a card or human section solely because the latest source omitted it.

## Token and integrity rules

- Keep the L0 index small enough to load for every run.
- Keep each card focused on one learning object; split cards when unrelated claims cannot share a section anchor.
- Do not put full transcript excerpts, full note bodies, or long teaching narratives in cards.
- Every card claim must retain source references or an explicit uncertainty marker.
- Reject broken note paths and unresolved relation targets during preflight; record them for repair instead of silently presenting them as valid links.
