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

## Status

`TODO` — no prompt is authored yet. Writing prompts before the artifact schemas
freeze would bake in guesses.
