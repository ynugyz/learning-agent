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

已有 `ey-campus-demo-v0.1`，是仅用于开发验证的最小合成案例，覆盖两次输入、已有页面扩展、
公式/边界保留和有限 wikilink。它不包含人工 Gold，也不代表赛事正式数据。
