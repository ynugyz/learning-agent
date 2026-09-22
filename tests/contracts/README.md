# Contract fixtures (M1A-V)

Executable evidence that the four M1A contracts hold as machine-checkable
artefacts. Run with:

```powershell
node tools/contract-tests.mjs     # or: npm run test:contracts
```

Full evidence and caveats: [`docs/reviews/M1A_EXECUTABLE_VERIFICATION.md`](../../docs/reviews/M1A_EXECUTABLE_VERIFICATION.md).

## Layout

```
tests/contracts/
  semantic-card/   valid.json + invalid-*.json
  source-map/      valid.json + invalid-*.json
  agent-runtime/   valid.json + invalid-*.json
  run-manifest/    valid.json + invalid-*.json
```

## Rules

1. **`valid.json` is the canonical example** for its contract and is asserted to
   be **accepted** by the schema. The spec's example is kept byte-consistent
   with it; the fixture is authoritative.
2. **`invalid-*.json` are generated** by `tools/generate-contract-fixtures.mjs`,
   one named mutation per file. Do not hand-edit them: edit the mutation, then
   regenerate, so the intent of each fixture stays reviewable and diffable.
3. **A rejection must be for the intended reason.** The runner requires every
   failing keyword to be on a reviewed allowlist. A fixture that fails with a
   `type` error proves only that the fixture is broken, and fails the test.
4. **Fixtures must not contain credential-shaped strings.** The repository's
   secret scanner runs over these files; an earlier version of the
   `credential-in-notes` fixture was flagged, correctly, and was changed to use a
   plain placeholder rather than weakening the scanner.
5. **No fixture may depend on a file outside this directory.** Cross-artifact
   reference integrity needs a Cross-artifact Validator that does not exist yet
   (`CH-11`), so the examples resolve within their own document.

## What these tests do NOT prove

- Cross-artifact reference integrity (`units[].sourceId` exists, relation
  targets resolve).
- That the TypeScript types admit exactly the schema's value space — the
  spec/schema/TypeScript three-carrier problem is deferred, with no codegen.
- Any behaviour: there is no implementation.

## Adding a fixture

1. Add a mutation to the relevant contract's `mutations` object in
   `tools/generate-contract-fixtures.mjs`, with a comment naming the requirement
   or challenger finding it guards (e.g. `// CH-03 / RM-12: ...`).
2. `node tools/generate-contract-fixtures.mjs`
3. `node tools/contract-tests.mjs` — the new fixture must be rejected via an
   allowlisted keyword, and must not be the only change.
