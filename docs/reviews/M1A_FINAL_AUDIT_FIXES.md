# M1A Final Audit Fixes (M1A-V2 Contract Hardening)

> Record of the M1A-V2 hardening pass: every adjudicated item from the final
> human audit, what it changed, and what remains open.
>
> The contracts remain **DRAFT — NOT IMPLEMENTATION-STABLE**, and milestone M0 is
> still not finally approved. This is a hardening record, not approval.
>
> Predecessor: `1c27e2c`, which was reviewed file-by-file by a human and
> returned `M1A_HUMAN_REVIEW = REVISE_SMALL`. `1c27e2c` is **not amended**.

---

## 1. Why this pass happened

The final human audit accepted the M1A direction but found that several
declared guarantees were still only *stated*, not *enforced*. Three classes of
problem:

1. **A verification loophole.** `verified` could be reached through "a human
   basis **or** the presence of evidence", which turned ordinary evidence into
   verification and let a machine-laundered inference become an established
   fact.
2. **Enums that assert without carrying.** Tagged unions were still partly
   "field present, value optional" rather than genuinely mutually exclusive.
3. **A harness that could not tell a lucky pass from a real one.** Rejection was
   checked against a keyword allowlist, so a fixture failing for the wrong
   reason could still be green.

---

## 2. SemanticCard

| # | Change | Requirement | Regression fixtures |
| --- | --- | --- | --- |
| 2.1 | `verified` no longer reachable via evidence alone. It requires `basis: human-verified` **and** ≥1 evidence reference. | `SC-28` | `invalid-verified-with-evidence-but-no-basis`, `invalid-verified-without-any-evidence` |
| 2.2 | New narrow verification primitive `basis: human-verified` — the only basis that can justify `verified`. | `SC-28` | (enum is schema-enforced; `machine-inferred` + `verified` impossible) |
| 2.3 | `basis: machine-inferred` + `epistemicState: verified` is **always** invalid, with or without evidence. | `SC-28` | `invalid-self-verified-with-machine-basis` |
| 2.4 | The same rule applies to `relations[]`: a machine-verified edge is illegal, and provenance alone is not verification. | `SC-28` | `invalid-relation-self-verified-with-machine-basis`, `invalid-relation-verified-with-provenance-but-no-basis` |
| 2.5 | `relations[].target` is now **required**. | `SC-29` | `invalid-relation-without-target` |
| 2.6 | Fingerprint values must be a 64-character SHA-256 hex digest. | `SC-20` | `invalid-fingerprint-not-sha256-hex` |

**How the loophole is mechanically closed.** The `then` branch sets
`properties.basis.const = "human-verified"` and requires `evidenceRefs` with
`minItems: 1`. Because the constraint is `const`, the machine value
`machine-inferred` cannot satisfy it — the prohibition is a consequence of the
required value, not a separate rule that could drift out of sync.

## 3. SourceMap

| # | Change | Requirement | Regression fixtures |
| --- | --- | --- | --- |
| 3.1 | `coverage` is **top-level required**. | `SM-27` | `invalid-missing-coverage` |
| 3.2 | An unaudited map must state `assessment: not_assessed`; absence may never be the way to say it. | `SM-27` | `invalid-coverage-without-assessment` |

Not implemented, by ruling: L0/L1, progressive index, Cross-artifact Validator.

## 4. AgentRuntime

| # | Change | Requirement | Regression fixtures |
| --- | --- | --- | --- |
| 4.1 | `RuntimeInvocationResult` is a truly mutually exclusive union: success forbids `error`, failure forbids `result`. | `RT-29` | `invalid-success-with-error`, `invalid-failure-with-result` |
| 4.2 | No empty success: a `RuntimeResult` needs at least one of `output` / `model` / `usage`. | `RT-30` | `invalid-empty-success` |
| 4.3 | `resolution: matched` / `substituted` requires **both** the requested model and an available resolved value. | `RT-31` | `invalid-matched-without-requested-model` |
| 4.4 | `input[].ref`, when present, must identify at least one real reference. | `RT-27` | `invalid-empty-task-input-ref` |
| 4.5 | `model`, when present, must carry `requested`. | `RT-28` | `invalid-empty-model-request` |
| 4.6 | `promptRef.path` gets the same absolute-path ban as `outputSchemaRef.path`. | `RT-26` | `invalid-absolute-prompt-path` |
| 4.7 | Availability branches are mutually exclusive: `available` carries no reason, `unavailable` carries no value. | `RT-32` | `invalid-resolved-unavailable-with-value` |

**Note on 4.7:** this rule was not on the audit list. The new fixture
`invalid-resolved-unavailable-with-value` was written to probe the branch
symmetry and **it failed** — the schema accepted `availability: unavailable`
carrying a `value`. That is a real defect the previous harness structurally
could not catch, and it is the clearest argument for the harness change in §7.

## 5. RunManifest

| # | Change | Requirement | Regression fixtures |
| --- | --- | --- | --- |
| 5.1 | Canonical fixture contradiction removed: it declared `model.provider` *and* omitted it. The `omissions[]` example is kept and the actual value is gone. | `RM-14` | (canonical fixture must validate) |
| 5.2 | `caseId`: `present` forbids `reason`; absent forbids `value`. | `RM-23` | `invalid-case-id-present-with-reason` |
| 5.3 | `git`: `present` forbids `reason`; `unavailable` forbids `commit` / `dirty` / `branch`. | `RM-23` | `invalid-git-unavailable-with-commit` |
| 5.4 | `runtime`: `present` forbids `reason`; `unavailable` forbids `requested` / `resolved` / `resolution`. | `RM-23` | `invalid-runtime-present-with-reason` |
| 5.5 | `model.resolved`: `available` forbids `reason`; `unavailable` forbids `value`. | `RM-23` | `invalid-model-available-with-reason` |
| 5.6 | `usage`: `reported` requires all three counts, `partial` at least one, `unavailable` none at all — zero is a measurement, not an absence. | `RM-24` | `invalid-usage-reported-without-counts`, `invalid-usage-partial-without-counts`, `invalid-usage-unavailable-with-zeros` |
| 5.7 | `sourceBundle.refs[].ref` and other portable refs reject absolute Windows / POSIX / UNC / home-relative paths. | `RM-25` | `invalid-source-bundle-absolute-path`, `invalid-source-bundle-posix-absolute-path` |
| 5.8 | Fingerprint digest shape enforced (`^[A-Fa-f0-9]{64}$`). | `RM-26` | `invalid-fingerprint-not-sha256-hex` |

Cost accounting was **not** extended, by ruling.

## 6. Shared primitives

| # | Change | Requirement |
| --- | --- | --- |
| 6.1 | `Fingerprint.value` is a branded `Sha256Hex` in TypeScript and a `pattern: "^[A-Fa-f0-9]{64}$"` in every schema. | `RM-26` / `SC-20` |
| 6.2 | The branded type exists because a model name and an anchor value are structurally strings too; without the brand they are interchangeable at the type level even though the contract forbids confusing them. | — |
| 6.3 | **Hashed-object semantics remain DEFERRED** — raw bytes vs canonical JSON is still unspecified. Only the digest's *shape* is fixed. | — |

`src/contracts/common.ts` still holds **only** primitives reused by two or more
contracts with identical semantics (`ReviewStatus`, `SchemaVersion`,
`Fingerprint`/`Sha256Hex`, `FingerprintAlg`), and `tools/check.ps1` still asserts
that no contract module imports another.

## 7. Verification harness

| # | Change |
| --- | --- |
| 7.1 | **Per-fixture declared expectations.** `tests/contracts/expectations.json` declares, for every invalid fixture, the expected `keyword` and `instancePath`. The test fails if the rejection does not match. This replaces the allowlist as the primary assertion. |
| 7.2 | **Precision where it matters.** For conditional rules the reported path is the object owning the `if`/`then`, so conditional keywords allow a prefix match; ordinary keyword failures require the exact path. Every `CH-01` / `CH-02` / `CH-03` fixture and every M1A-V2 regression uses an exact declared reason. |
| 7.3 | **Undeclared fixtures fail.** A fixture on disk that nobody declares is reported as a failure, because it looks like coverage without being coverage. |
| 7.4 | **Ajv strict mode enabled** (see §8). |
| 7.5 | Corpus grew from 48 to **75** invalid fixtures; total checks from 56 to **84**. |

### 7.6 Ajv strict-mode relaxations, itemised

Strict mode is ON. Exactly one check is relaxed, for a stated reason:

| Option | Setting | Reason |
| --- | --- | --- |
| `strict` | `true` | — |
| `strictSchema` | `true` | — |
| `strictTypes` | `true` | — |
| `strictRequired` | **`false`** | The contracts express their conditional rules with `if`/`then` adding `required` constraints. `strictRequired` rejects a `required` entry it cannot find in the sibling `properties` at that exact subschema, which is the normal shape of a `then` branch. Note this does **not** weaken enforcement: Ajv still applies the constraints; only the schema-authoring lint is relaxed. All other strict checks are active. |

### 7.7 Two real schema defects that strict mode found

Enabling strict mode immediately failed to compile the schemas. Both were
genuine defects, not lint noise:

1. Conditional subschemas applied `minItems` / `anyOf` **without declaring
   `type`** (`claims[].evidenceRefs`, `relations[].provenance`, nested
   `minLength` branches). Fixed by adding the type declarations, which makes the
   constraints well-defined rather than merely tolerated.
2. As a direct consequence, the harness proved the rules fire where intended.

This is the concrete value of the audit's "try enabling strict mode" item: it
found four missing type declarations across two schemas.

## 8. Repository hygiene

| # | Change |
| --- | --- |
| 8.1 | **Tracked `.npmrc` deleted.** The cache workaround served only this host's sandbox and must not be imposed on other machines. |
| 8.2 | The workaround now lives in [`docs/ENVIRONMENT.md`](../ENVIRONMENT.md) as an explicit per-command option: `npm install --cache .\.npm-cache`, with the `EPERM` failure it addresses, and a statement that it is an environment restriction rather than a network problem. `.npm-cache/` remains git-ignored. |
| 8.3 | `tsconfig.json`'s stale "TypeScript is not installed yet" comment corrected: the toolchain is installed, and `npm run typecheck` works. |

## 9. Consistency

Spec, JSON Schema, TypeScript and fixtures were changed together and verified
consistent:

- `npx --no-install tsc --noEmit` → **0 errors**
- `node tools/contract-tests.mjs` → **checks=84 failures=0**
- each spec's embedded example is asserted byte-identical to its fixture
- new requirement IDs (`SC-28`, `SC-29`, `SM-27`, `RT-26`…`RT-32`) are defined
  in both the prose sections and the requirement indexes, and the declared
  ranges were updated

## 10. Still open, unchanged by this pass

| Item | Status |
| --- | --- |
| Cross-artifact reference integrity | **DEFERRED** to a future Cross-artifact Validator. JSON Schema validates one document at a time. |
| TypeScript ↔ schema value-space equivalence | **Open.** A branded type helps for digests only; no general check exists. |
| Three-carrier source of truth (spec / schema / TS) | **DEFERRED.** No codegen. |
| `CH-09` differing reference shapes | **OPEN**, by ruling: different shapes are not forced together. |
| `CH-18` judgement-axis precedence in SourceMap | **OPEN.** |
| `CH-20` `unresolved[]` has no closure mechanism | **OPEN**; `unresolvedId` makes closure *possible*, not implemented. |
| `CH-24`, `CH-25`, `CH-26`, `CH-27`, `CH-28`, `CH-30` | **OPEN / DEFERRED** as recorded in [`M1A_HUMAN_ADJUDICATION_REV1.md`](M1A_HUMAN_ADJUDICATION_REV1.md) §3. |
| Fingerprint hashed-object semantics | **DEFERRED.** |
| `RM-A1` `dirtyPaths` when dirty | Still a design rule, not schema-enforced. |
| Behaviour of any kind | Nothing implemented. |

## 11. Explicitly not done

- No entry into M1B; no `LessonModel`, alignment, `ChangePlan`, writer, auditor,
  Obsidian plugin or OpenMAIC work.
- No DSH adapter.
- No Cross-artifact Validator, L0/L1, or SourceMap progressive index.
- No cost accounting.
- No architecture expansion beyond the adjudicated items.
- `1c27e2c` was **not** amended; this is a new commit.
- `main` was not created or pushed; nothing was force-pushed.

**This is a hardening record, not approval. M1A is not human-approved.**
