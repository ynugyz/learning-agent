# Prompts

Versioned prompt assets for pipeline steps that call a model.

## Rules

1. **Versioning.** Prompt changes alter experiment outcomes, so every prompt
   file carries a `version` in its frontmatter. A run manifest records the
   prompt versions used (`AGENTS.md` §9).
2. **One prompt, one job.** A prompt that both extracts and judges makes
   failures unattributable.
3. **Runtime independence.** Prompts are data. They must not contain
   DSH-specific directives, tool names or session formats; the runtime adapter
   is responsible for transport (`AGENTS.md` §3.3).
4. **No secrets.** Prompts are committed files and must never contain API keys,
   tokens or personal Vault content.
5. **Uncertainty is explicit.** Prompts should instruct the model to emit
   `TODO` / `UNKNOWN` / `NEEDS_REVIEW` rather than inventing content
   (`AGENTS.md` §16).

## Layout (planned)

```
prompts/
  <layer-or-task>/
    <task>.v1.md
```

## Frontmatter (planned)

```yaml
---
id: lesson-model.extract-segments
version: 1
schema_out: schemas/lesson-model.schema.json
status: draft
---
```

## Canary prompt assets

`canary/*.v1.md` are draft, versioned prompts for the experimental
SourceMap → LessonModel → Alignment v0.2 path. They do not imply that the
underlying schemas have passed human review. Real canaries validate every model
output locally and stop on the first invalid result; they never enter ChangePlan
or write to any Vault.

`human-note-composer-v3.md` is the current experimental Human Note writing
prompt. It uses the Java OOP, macroeconomics and accounting notes as structural
references: content blocks are selected by knowledge role, useful existing
content is reorganized instead of appended as a transcript, and uncertain
course-specific claims remain explicitly bounded.
