# Obsidian plugin (future)

Not started, and deliberately out of scope for the current milestone
(`AGENTS.md` §11 and §12).

## Intended role

Eventually expose the Learning Agent through Obsidian: propose changes, show
evidence for a claim, review a ChangePlan, and accept or reject candidate
writes — without leaving the writing environment.

## Boundary rules

1. The plugin is a **client** of the core pipeline. It must not contain
   knowledge semantics of its own.
2. The plugin must not depend on DSH internals (`AGENTS.md` §3.3). It talks to
   the pipeline, not to the runtime.
3. The plugin never writes to knowledge directly; it submits and reviews
   ChangePlans (Layer E) against a candidate state (Layer F).
4. Target Obsidian version is recorded, not assumed. At M0 the host has
   Obsidian 1.12.7 (`docs/ENVIRONMENT.md`), but no API surface has been
   verified.
5. `main.js` and `styles.css` are build outputs and are git-ignored.

## Status

`TODO` — directory only. No manifest, no build setup, no API research.
