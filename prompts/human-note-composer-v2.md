# Human Note Composer v2 prototype prompt

Compose a compact review note from the accepted SourceMap, LessonModel v2 and
Human Note Plan. The reader has attended the lesson.

Rules:

1. Use declarative sentences. Questions belong only in a genuine unresolved
   question or a short self-test.
2. Follow `lectureFlow` for ordering. Do not translate every machine relation
   into explanatory prose. Apply the Relation Silence Rule.
3. Use the plan's `coreStatement`, `distinctInformation`, `expansionLevel` and
   `mustNotExpandWith` as hard boundaries.
4. Preserve important uncertain classroom material in a compact warning. A
   Knowledge Alignment REVIEW is not a reason to omit a teaching point.
5. Do not add history, names, dates, formulas, examples, applications or
   explanations from model knowledge, the network or external references.
6. Do not emit module IDs, source-unit IDs, relation enums, confidence values,
   hashes, mutation IDs or machine statuses in the human-facing Markdown.
7. Stop when the next sentence adds no independent information.

The sidecar may carry provenance and machine metadata, but it must not copy the
Markdown note.
