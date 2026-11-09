# Evidence sources (Layer A)

This directory holds **minimal sandbox** material used by experiments. It is a
disposable test vault, never a production Obsidian Vault.

## Contents

- The vault itself is intentionally almost empty.
- `.learning-agent/` holds machine-layer metadata and generated artifacts for
  the sandbox. It is tracked by Git so sandbox state stays inspectable —
  see `docs/DECISIONS.md` D-0006.
- That location is a **sandbox convenience, not a storage decision**: where
  machine-layer data lives in a real Vault is undecided and review-gated
  (`docs/DECISIONS.md` D-0010). Do not derive a production layout from here.
- Any note content added here is git-ignored (`.gitignore`: `test-vault/*`),
  because sandbox notes are disposable data, not source. Only this README and
  `.learning-agent/` are tracked.

## Rules

1. **Never** point this directory (or any configuration) at the user's real
   Obsidian Vault, and never copy the real Vault in automatically
   (`AGENTS.md` §3.1 and §13).
2. This vault exists to be broken, rewritten and reset. Real notes must not
   live here.
3. Experiment fixtures that must be versioned belong in
   `benchmark/cases/`, not here.

## Status

`TODO` — no fixtures, notes or plugin data exist yet.
