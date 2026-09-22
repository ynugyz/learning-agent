# M1A Executable Contract Verification (M1A-V)

> **Scope of this document: the M1A-V revision.** M1A-V2 superseded parts of it:
> see [`M1A_FINAL_AUDIT_FIXES.md`](M1A_FINAL_AUDIT_FIXES.md) for what changed.
> The counts below were updated to reflect the current corpus, but the harness
> description, the guarantee list and the "not verified" list in this document
> describe **M1A-V** and are kept as the historical record of that revision.
> Read the M1A-V2 document for the current state.
>
> Proves that the four M1A contracts hold **as machine-checkable artefacts**
> under a real TypeScript compiler and a real JSON Schema validator, rather than
> only as prose.
>
> The contracts themselves remain **DRAFT — NOT IMPLEMENTATION-STABLE**, and
> milestone M0 is still not finally approved. This document records evidence,
> not approval.

- Verified commit content: `design/m1a-core-contracts` at the M1A-V commit
- Verifier entry points: `tools/contract-tests.mjs`, `tools/check.ps1`
- Fixture corpus: `tests/contracts/**`

---

## 1. Toolchain actually used

| Tool | Version | Role |
| --- | --- | --- |
| Node.js | v22.23.2 | runs the fixture tests |
| TypeScript (`tsc`) | **5.9.3** (exact pin, dev-only) | compiles the contract declarations |
| Ajv | **8.20.0** (exact pin, dev-only) | validates fixtures against the JSON Schemas |
| Ajv dialect | JSON Schema **draft 2020-12** (`ajv/dist/2020.js`) | matches the schemas' `$schema` |
| Lockfile | `package-lock.json` committed | reproducible install |
| npm cache | `.npm-cache/` inside the repo (`.npmrc`) | host workaround, git-ignored — see §7 |

Both dependencies are **dev-only**. `dependencies` stays empty: no product or
runtime dependency was introduced (`DECISIONS.md` D-0005, D-0013).

Versions are exact, not ranges; `tools/check.ps1` fails if either is unpinned or
if the lockfile is missing.

---

## 2. What was verified

### 2.1 TypeScript compiles

```
npx --no-install tsc --noEmit     →  exit 0, 0 errors
```

All of `src/contracts/*.ts` — `common.ts`, `semantic-card.ts`, `source-map.ts`,
`agent-runtime.ts`, `run-manifest.ts`, `index.ts` — compile under `strict`,
`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`,
`verbatimModuleSyntax` and `isolatedModules` (see `tsconfig.json`).

**This check found two real defects on first run**, which is the point of the
milestone:

| Defect | How it was found | Fix |
| --- | --- | --- |
| `index.ts` re-exported `ReviewStatus`, `SchemaVersion`, `Fingerprint`, `FingerprintAlg` from `./semantic-card` after they had moved to `./common` (4 × TS2459/TS2305) | `tsc --noEmit` | barrel now exports the shared primitives from `./common` |
| `minLength: 1` accepts whitespace-only strings, so `knowledgeId: "   "` satisfied "non-empty" | fixture test `invalid-whitespace-knowledge-id` | every `minLength: 1` string also carries `pattern: "\\S"` |

### 2.2 JSON Schema fixtures

```
node tools/contract-tests.mjs     →  checks=84 failures=0  →  PASSED
```

| Contract | Canonical valid fixture | Invalid fixtures | Total checks |
| --- | --- | --- | --- |
| SemanticCard v0.1 | 1 accepted | 13 rejected | 14 |
| SourceMap v0.1 | 1 accepted | 12 rejected | 13 |
| AgentRuntime Boundary v0.1 | 1 accepted | 11 rejected | 12 |
| RunManifest v0.1 | 1 accepted | 12 rejected | 13 |
| **Total** | **4** | **75** | **75** (+4 spec/fixture identity checks + 1 declaration-coverage check = **84**) |

At M1A-V the runner asserted three things per invalid fixture:

1. it **is rejected**;
2. it is rejected **for a rule violation, not a malformed document** — every
   failing JSON Schema keyword had to be on a reviewed allowlist, so a `type`
   error (proving only that the fixture was broken) failed the test;
3. where a conditional rule was under test, the `if`/`then` machinery had to be
   the thing that fired.

**Known weakness of this revision, fixed in M1A-V2:** an allowlist is not an
expectation. A fixture could be rejected by *any* allowlisted keyword — including
`required` firing for an entirely unrelated reason — and still pass. M1A-V2
replaced the allowlist with a per-fixture declared `keyword` **and**
`instancePath` (`tests/contracts/expectations.json`). See
[`M1A_FINAL_AUDIT_FIXES.md`](M1A_FINAL_AUDIT_FIXES.md).

### 2.3 Required regression coverage

The three blockers from the review have dedicated, named regressions:

| Blocker | Regression fixtures | Asserted rejection reason |
| --- | --- | --- |
| **CH-01** — presence checks must be content checks | `invalid-empty-knowledge-id`, `invalid-whitespace-knowledge-id`, `invalid-empty-anchor-value`, `invalid-empty-evidence-ref`, `invalid-empty-unit-id`, `invalid-opaque-locator-without-value`, `invalid-conflict-with-empty-unit` | `minLength` + `pattern`, `anyOf` with a non-empty branch |
| **CH-02** — no field may carry note prose | `invalid-claim-prose-escape`, `invalid-summary-over-budget`, `invalid-unit-summary-over-budget`, `invalid-credential-in-notes` | `additionalProperties` (the field does not exist), `maxLength` |
| **CH-03** — states must be tagged unions carrying their proof | `invalid-integrity-ok-without-proof`, `invalid-integrity-unknown-without-reason`, `invalid-resolved-available-without-value`, `invalid-resolved-unavailable-without-reason`, `invalid-matched-without-resolved-value`, `invalid-git-present-without-commit`, `invalid-git-present-without-dirty`, `invalid-case-id-present-without-value`, `invalid-model-resolved-available-without-value`, `invalid-runtime-present-without-resolved`, `invalid-runtime-unavailable-without-reason`, `invalid-failure-without-error` | `if` + `required` |

### 2.4 Adjudicated rules now machine-checked

| Rule | Fixture(s) | Asserted reason |
| --- | --- | --- |
| CH-04 / RM-11 — `runtime.resolution` requires both sides | `invalid-resolution-without-requested` | `if` + `required` |
| CH-05 / SM-20 — no write-back of final dispositions | `invalid-disposition-write-back` | `additionalProperties` |
| CH-06 / SM-5 — observations are package-local only | `invalid-knowledge-network-observation` | `enum` |
| CH-06 / SM-5 — observations carry no authority | `invalid-observation-without-advisory` | `required` |
| CH-07 / SM-6 — preservation is an inference | `invalid-preservation-not-marked-inference` | `required` |
| CH-08 / RT-19 — cost is not core runtime usage | `invalid-usage-with-cost` | `additionalProperties` |
| CH-11 — every example reference resolves | fixture examples + spec examples reviewed; see §4 | n/a (not schema-checkable) |
| CH-16 / RT-11 — no host-specific paths | `invalid-implementation-note-host-path`, `invalid-output-schema-absolute-path`, `invalid-host-path-in-repo-ref` | `additionalProperties`, `pattern`, `not` |
| A1 — card state is a maintenance state | `invalid-knowledge-truth-card-state`, `invalid-legacy-cardstate-name` | `enum`, `additionalProperties` + `required` |
| A2 (M1A-V) — `unresolvedId` is required and non-empty | `invalid-unresolved-without-id` | `required` |
| A3 / SC-13 — a machine may not self-verify a claim | `invalid-self-verified-claim` | `anyOf` + `const` + `if` + `required` |
| SC-17 — an unflagged bare relation is rejected | `invalid-unflagged-bare-relation` | `if` + `required` |
| SM-16 — a machine may not assert source verification | `invalid-source-verified-status` | `enum` |
| SM-17 — coverage may not claim completeness | `invalid-coverage-claims-complete` | `enum` |
| SM-18 — a conflict needs ≥ 2 non-empty refs | `invalid-conflict-with-one-unit`, `invalid-conflict-with-empty-unit` | `minItems`, `pattern` |
| RT-12 — prompts are versioned | `invalid-prompt-without-version` | `required` |
| RT-14 — streaming is reserved false | `invalid-streaming-claimed-supported` | `const` |
| RT-25 — `outputSchemaRef` is versioned when present | `invalid-output-schema-without-version` | `required` |
| RM-16 — `schemaVersion` required | `invalid-missing-schema-version` | `required` |
| RM-12 — core fields are never silently absent | `invalid-missing-case-id`, `invalid-missing-versions`, `invalid-missing-task-request-fields` | `required` |

### 2.5 Canonical examples really pass

Each contract's canonical example is a **fixture**, not prose, and is asserted
accepted by its schema:

| Contract | Fixture |
| --- | --- |
| SemanticCard | `tests/contracts/semantic-card/valid.json` |
| SourceMap | `tests/contracts/source-map/valid.json` |
| AgentRuntime Boundary | `tests/contracts/agent-runtime/valid.json` |
| RunManifest | `tests/contracts/run-manifest/valid.json` |

The spec examples are kept byte-consistent with these fixtures; the fixtures are
authoritative.

---

## 3. What is now genuinely machine-verified

| # | Guarantee | Evidence |
| --- | --- | --- |
| 1 | Every contract declaration type-checks under strict TypeScript | `tsc --noEmit` = 0 errors |
| 2 | Every schema is a valid draft-2020-12 schema Ajv can compile | 4/4 schemas compiled in the runner |
| 3 | Each canonical example is structurally valid per its schema | 4/4 valid fixtures accepted |
| 4 | 75 hand-specified invalid inputs are rejected | 75/75 rejected, each via an allowlisted keyword (M1A-V2 upgraded this to a declared expectation per fixture) |
| 5 | Non-empty identifiers really are non-empty (incl. whitespace) | `minLength` + `pattern: "\\S"` fixtures |
| 6 | No field exists that accepts arbitrary note prose | `additionalProperties` rejection of `claims[].note` |
| 7 | Tagged-union states cannot be asserted without their data | 12 conditional-rule fixtures |
| 8 | `runtime.resolution` is computable from the manifest alone | `invalid-resolution-without-requested` |
| 9 | SourceMap cannot record a final knowledge disposition | `invalid-disposition-write-back` |
| 10 | Host-specific paths are rejected in the contract | 3 fixtures across 2 contracts |
| 11 | No contract module imports another contract module | `tools/check.ps1` cross-import assertion |
| 12 | Dev tooling is exactly pinned and lockfile-backed | `tools/check.ps1` dependency assertions |
| 13 | Each spec's embedded example is byte-identical to its canonical fixture | 4 spec/fixture identity assertions, confirmed to FAIL when a spec is tampered with |

### What remains verified only by hand, or not at all

| # | Not machine-verified | Why, and what remains |
| --- | --- | --- |
| 1 | **Cross-artifact reference integrity** | JSON Schema validates one document at a time. That `units[].sourceId` exists in `sources[]`, that `evidenceRef.sourceUnitId` names a real unit, and that a relation `target.knowledgeId` resolves are **not** checked. This is `CH-11`, deliberately deferred to a future **Cross-artifact Validator**. |
| 2 | **Spec ↔ schema ↔ TypeScript equivalence** | Only the *spec ↔ fixture* half is now asserted. That the TypeScript types admit exactly the schema's value space is still unchecked: a field could be optional in TS and required in the schema and no test would fail. The three-carrier source-of-truth problem remains **DEFERRED** (no codegen). |
| 3 | **Prose invariants without a schema keyword** | e.g. `history` semantics of `unresolved[]`, `SM-23` progressive loading, `CH-18` axis precedence, `CH-25` the `contentType: unknown` loophole. A `// TODO` in a comment or a spec sentence is not enforcement. |
| 4 | **Behaviour** | There is no implementation. Nothing here proves what a pipeline will *do*, only what data a validator will *accept*. |
| 5 | **`dirtyPaths`-when-dirty (`RM-A1`)** | Expressing "required when a sibling is true" is possible in JSON Schema but the fixture does not cover it, and the current schema does not enforce it. Still a design rule. |
| 6 | **Fingerprint semantics** | What exactly is hashed (raw bytes vs canonical JSON) remains unspecified; no test can assert a value. |
| 7 | **Real SourceMap sizes and progressive loading** | `CH-26`/`CH-27` are deferred pending real documents. |

---

## 4. Fixture corpus design

`tests/contracts/<contract>/valid.json` is hand-written. The 75 invalid fixtures
are **generated** by `tools/generate-contract-fixtures.mjs`, which applies one
named mutation per fixture to a deep clone of the valid document.

Why generated rather than hand-written: a hand-edited JSON file hides *what* was
changed, so a reviewer cannot tell whether the fixture tests the intended rule.
Each mutation in the generator is a two-line, greppable statement of intent
(`'empty-anchor-value': (doc) => { doc.humanNoteRef.anchor.value = ''; ... }`),
and the fixtures can be regenerated and diffed.

The generator's `credential-in-notes` fixture deliberately contains **no**
credential-shaped string: the repository's own secret scanner correctly flagged
an earlier version that used one, and weakening the scanner to accommodate a
test would have been a worse trade than using a plain placeholder.

---

## 5. Repository check integration

`tools/check.ps1` now performs, on every run:

```
== Executable contract verification ==
  PASS  TypeScript contract declarations compile (tsc --noEmit)
  PASS  contract fixtures verified (checks=84 failures=0)
```

plus, from M1A-V:

- `no contract module imports another contract module` — enforces that shared
  primitives live in `common.ts` rather than one contract reaching into another;
- `package.json declares zero RUNTIME dependencies`;
- `all N dev dependencies pinned to exact versions`;
- `package-lock.json is present for the pinned dev tooling`.

If `node_modules` is absent the check **fails** rather than skipping silently,
so a fresh clone cannot pass without installing the pinned tooling.

Full run at this commit: **PASSED, 0 failures, 0 warnings.**

---

## 6. Scope discipline — what was NOT done

- No `LessonModel`, alignment, `ChangePlan`, writer, auditor, Obsidian plugin or
  OpenMAIC work.
- No DSH adapter.
- No Cross-artifact Validator.
- No L0/L1 routing or SourceMap internal index contract (`CH-26`, `CH-27`
  deferred by ruling).
- No codegen between spec, schema and TypeScript (deferred by ruling).
- No attempt to make all 30 challenger findings green; only the adjudicated
  rules and their direct dependencies.
- `ce8fd2a` and `b871744` were **not** amended.

---

## 7. Known environmental caveat

The npm cache is redirected into the repository by `.npmrc`
(`cache=.npm-cache`). Reason: on this host the default cache
(`%LOCALAPPDATA%\npm-cache`) lies outside the writable workspace and npm fails
with `EPERM`. `.npm-cache/` is git-ignored, so no cache content is committed,
and the resolved package URLs in `package-lock.json` still point at the default
public registry. On a machine with a writable global cache the setting is
unnecessary; deleting `.npmrc` costs only a re-download.

This is a **host workaround, not a project convention**, and it is recorded here
so it is not mistaken for one later.

---

## 8. Verdict for human review

M1A-V's stated goal — prove the contracts hold under a real compiler and a real
JSON Schema validator — is **met for structural constraints**:

- 84/84 checks pass (4 valid accepted, 75 invalid rejected, 4 spec/fixture identity assertions, 1 declaration-coverage check);
- `tsc --noEmit` is clean;
- the three blockers each have dedicated, named regressions that fail for the
  intended keyword;
- the check suite now runs both automatically.

It is **not** met for referential, semantic or behavioural guarantees, which no
single-artifact validator can express. Those remain open and are listed in §3.

**This is evidence, not approval: M1A is not human-approved, and M1B has not
started.**
