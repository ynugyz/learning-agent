# Benchmark cases

One directory per case: `cases/<case-id>/`.

Suggested case layout (not yet fixed — `NEEDS_REVIEW`):

```
cases/<case-id>/
  case.md            what this case tests and why it exists
  manifest.json      category, source bundle, expected difficulty
  sources/           the input material (transcript, slides, ...)
```

## Rules

- The case description must state which capability the case probes, and which
  error categories from `docs/ERROR_TAXONOMY.md` it is expected to elicit.
- Input material here is **test data**, not the user's production Vault notes.
  Do not copy a real Vault wholesale; take the smallest fixture that tests the
  behaviour.
- Cases must not embed expected answers. Answers live in `benchmark/gold/`.
- Changing a case's inputs invalidates results recorded against the old version;
  note the change instead of editing silently.

## Status

`TODO` — no cases exist. The first cases should be tiny and target specific
error categories rather than approximating a full curriculum.
