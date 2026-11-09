# `.learning-agent/` — machine layer of the sandbox vault

Metadata written and read by the Learning Agent, kept inside the sandbox vault
so the human notes and their machine-readable counterpart travel together.

Per `AGENTS.md` §7 the intended join is:

```
Human Note  <->  stable knowledge_id  <->  SemanticCard  ->  Evidence
```

## This location is provisional (sandbox only)

This directory exists to make the machine-layer boundary concrete during
development and testing. **It is not a storage-architecture decision.**

The eventual physical layout of SemanticCards in a real Obsidian Vault is
**undecided and review-gated** (`docs/DECISIONS.md` D-0010). Candidates that
remain open include, at minimum:

- a Vault-root centralized store;
- module-local sidecar files next to the human notes;
- a database or index outside the note tree;
- something else not yet considered.

Nothing here — directory name, file granularity, tracked-vs-ignored treatment —
may be carried into production Vault integration as an assumption. Treat
everything written under this directory as sandbox-shaped and disposable.

## Rules

- This layer is **never** an independent source of truth. A machine inference
  must not become a verified fact merely because it was stored here.
- Machine claims retain provenance or explicit epistemic status.
- Nothing in this directory may be hand-edited into a state that contradicts
  the human notes without a recorded conflict.

## Status

`TODO` — empty. Contents are described by `schemas/semantic-card.schema.json`,
which is a **draft that has not passed human schema review** and must not be
treated as a stable contract. The future `specs/` documents will define it.
