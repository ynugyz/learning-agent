# Alignment candidate prompt

Version: 1
Output schema: `schemas/alignment.v0.2.schema.json`

Using only the supplied LessonModel and the supplied existing-knowledge context, produce one Alignment v0.2 candidate. Return only one JSON object: no Markdown, code fences, preamble, or trailing commentary. Follow the supplied JSON Schema exactly and do not add properties.

Do not invent existing knowledge or note references. When no existing-knowledge context is provided, classify each lesson item as `NEW`; otherwise use only supplied references. Preserve unresolved decisions with `resolutionState: "deferred"` and confidence other than `high`. Keep `status` as `draft`. Do not create a ChangePlan or write/update notes.
