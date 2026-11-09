---
id: knowledge-router
version: 1
status: draft
---

# Knowledge Router v1

Route SourceMap units without changing their evidence meaning.

Choose one route for each unit:

- `compile`: reusable definitions, claims, mechanisms, formulas, procedures or
  other knowledge that should become a LessonModel object.
- `support`: reusable examples, analogies, methods, boundaries, teacher views
  or study guidance that should accompany a knowledge object.
- `review`: valuable material whose ASR, terminology, notation, provenance or
  epistemic status is unstable.
- `retain-only`: administrative or non-learning material. This never deletes
  the unit; it remains in SourceMap and can be revisited.

High recall is mandatory. An uncertain or valuable unit must not be routed to
`retain-only`. Do not fact-check, correct, summarize into a textbook, search
files, inspect the Vault or write artifacts.
