# Human Chapter Note — Product Spec v0.2

**Status:** architecture consolidation candidate; not a frozen schema or production-write authorization. See [consolidation](ARCHITECTURE_CONSOLIDATION_V0_2.md).

## Purpose and boundary

A Human Chapter Note helps a learner recover and review what a course chapter taught. It is distinct from a long-term knowledge page used across courses. A chapter note may contain many concepts; a concept earns a separate long-term page only when repeated use, independent value or later expansion justifies one. A class session is a time axis; the chapter note is a knowledge axis. Several sessions may grow the same chapter note.

The default file boundary is a **chapter**, subject to actual course evidence. Neither a session, subsection, concept, Lesson Module nor Source Unit is automatically a file. Inside a note, use major sections, then recall-target blocks, then the details needed to understand each block. A recall target is what the learner should be able to retrieve; block ownership follows that target, not a one-module-one-block mapping. Definition, mechanism, method and example that serve one recall target normally stay together.

## Human-facing composition

- State useful knowledge directly and favor declarative sentences. Keep each distinct learning point, compress repeated phrasing, and omit machine navigation prose.
- Preserve source-supported definitions, boundaries, mechanisms, methods, examples, exam or study tips, and teacher views when they have independent learning value. Mark teacher views as such rather than presenting them as universal facts.
- Make a block independently understandable: a learner seeing it alone should know roughly what the object is or what its key point means. This is not a demand to teach the entire topic.
- Allow only bounded canonical completion when the source already triggers the object and a minimum stable definition or explanation is needed. See [enrichment and source authority](ENRICHMENT_AND_SOURCE_AUTHORITY.md).
- Show a short warning only for important unresolved information that affects the block. Other uncertainty remains in machine provenance.
- Do not create a second example label after the example is already integrated into prose. Do not narrate semantic relationships merely because a machine relation exists.

There is no fixed sentence, character or bullet budget. Length follows the number of distinct useful information items. The acceptance criterion is dense, understandable and faithful, not shortest possible.

## Inputs and outputs

Inputs are the accepted LessonModel and relevant source evidence, plus optional existing **chapter** context. Alignment and ChangePlan do not decide what appears in a Human Chapter Note. `REVIEW` in Alignment does not mean note omission. A source risk may still require caution, omission of a particular claim or a visible warning.

Outputs are:

1. Human-facing chapter Markdown for course review.
2. A separate semantic sidecar for AI navigation, provenance, uncertainty and coverage.

The sidecar keeps stable note and block identities; chapter/session mapping; source, module and claim references; provenance; uncertainty; relations; wikilinks; fingerprints and revisions; and a coverage ledger. It must give **semantic coverage without textual duplication** of the Markdown. It is not an independent source of truth and does not convert model inference into a verified claim.

## Review experience

The production target is automatic generation followed by a 1–3 minute user scan, acceptance or a small edit. Escalate early only for a low-confidence chapter boundary, major source conflict, important unresolved uncertainty or high-risk knowledge correction. Development experiments may review chapter and block plans separately; that is not the intended normal user flow. No production Vault write is authorized by this spec.
