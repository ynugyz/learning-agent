# Error Taxonomy

**Status:** draft vocabulary. No error type is implemented or enforced yet.

## Purpose

Make failures comparable across runs, layers and future models. An error label
carries three things: **where** it happened (layer), **what kind** of failure it
is (category), and **who can act on it** (disposition).

A single run may produce many errors. Errors are observations about the run's
output, not exceptions thrown by code — code exceptions are a different,
narrower concern and are not yet modelled here.

## 1. Layers

Reuse the architectural layers (`docs/ARCHITECTURE.md` §2) so audit findings map
directly onto a pipeline stage:

| Code | Layer |
| --- | --- |
| `EVID` | A — Evidence (source capture/transcription) |
| `LSN` | B — Lesson understanding (SourceMap, LessonModel) |
| `SEM` | C — Machine semantic layer (SemanticCard) |
| `ALIGN` | D — Knowledge alignment |
| `PLAN` | E — Change planning (ChangePlan) |
| `WRITE` | F — Candidate writing |
| `AUDIT` | G — Auditing |
| `SYS` | Infrastructure, runtime, configuration |

## 2. Categories

### 2.1 Source and evidence errors (`EVID`)

| ID | Meaning |
| --- | --- |
| `EVID-ASR-NOISE` | Automatic transcription garbled terms, names or numbers. |
| `EVID-ASR-MISSING` | Source audio/text is partially or entirely missing. |
| `EVID-SLIDE-UNREADABLE` | Slide or board image cannot be reliably read. |
| `EVID-TIMESTAMP-DRIFT` | Source timestamps do not match the referenced content. |
| `EVID-PROVENANCE-LOST` | A claim cannot be traced back to its source location. |

### 2.2 Lesson understanding errors (`LSN`)

| ID | Meaning |
| --- | --- |
| `LSN-SCOPE-OVERREACH` | Lesson model asserts content the source does not contain. |
| `LSN-SCOPE-UNDERREACH` | Material taught in the lesson is omitted entirely. |
| `LSN-MISREAD` | Correctly located content interpreted incorrectly. |
| `LSN-ANALOGY-AS-FACT` | A teacher's analogy recorded as literal knowledge. |
| `LSN-OPINION-AS-FACT` | A teacher's opinion or aside recorded as established fact. |
| `LSN-HEURISTIC-AS-THEOREM` | A problem-solving tip or shortcut recorded as a general rule. |
| `LSN-NOTATION-UNRESOLVED` | Symbol or notation introduced but never defined. |
| `LSN-SEGMENT-MERGE` | Distinct concepts merged into one segment. |
| `LSN-SEGMENT-SPLIT` | One coherent concept split into unrelated fragments. |

### 2.3 Semantic layer errors (`SEM`)

| ID | Meaning |
| --- | --- |
| `SEM-ID-COLLISION` | Two concepts share a `knowledge_id`. |
| `SEM-ID-INSTABILITY` | A concept's ID changed although the concept did not. |
| `SEM-DESCRIPTION-LOSS` | SemanticCard no longer identifies the human note's content. |
| `SEM-LINK-BROKEN` | Card points at a missing note, evidence item or relation. |
| `SEM-PROVENANCE-MISSING` | Claim present without provenance or epistemic status. |
| `SEM-INFERENCE-AS-FACT` | Machine inference promoted to verified fact by storage. |
| `SEM-DUPLICATE-CARD` | Two cards model the same concept. |
| `SEM-STALE` | Source changed but the card was not updated. |

### 2.4 Alignment errors (`ALIGN`)

| ID | Meaning |
| --- | --- |
| `ALIGN-FALSE-NEW` | Genuinely existing knowledge labelled `NEW`. |
| `ALIGN-MISSED-NEW` | Genuinely new knowledge labelled `NO_CHANGE` or matched to the wrong note. |
| `ALIGN-WRONG-RELATION` | Correct pair, wrong relation (`EXPAND` vs `REFINE`, etc.). |
| `ALIGN-CONFLICT-IGNORED` | Contradiction between sources not raised as `CONFLICT`. |
| `ALIGN-FALSE-CONFLICT` | Compatible statements reported as contradictory. |
| `ALIGN-CORRECTION-MISSED` | A real correction to old knowledge treated as a restatement. |

### 2.5 Change planning and writing errors (`PLAN`, `WRITE`)

| ID | Meaning |
| --- | --- |
| `PLAN-UNSUPPORTED` | Planned change lacks supporting evidence. |
| `PLAN-OVERBROAD` | Plan rewrites far more knowledge than the lesson justifies. |
| `PLAN-CONFIDENCE-MISCALIBRATED` | Stated confidence unsupported by evidence. |
| `PLAN-REVIEW-FLAG-MISSING` | High-risk change not flagged for human review. |
| `WRITE-DESTRUCTIVE` | Candidate write removed content it was not asked to remove. |
| `WRITE-OUT-OF-SCOPE` | Candidate write touched notes outside the ChangePlan. |
| `WRITE-NOT-REVERSIBLE` | Applied change cannot be reverted cleanly. |

### 2.6 Audit and system errors (`AUDIT`, `SYS`)

| ID | Meaning |
| --- | --- |
| `AUDIT-GOLD-MISSING` | No reference data exists to score this case. |
| `AUDIT-QUALITY-AS-TRUTH` | Writing-quality judgment substituted for factual correctness. |
| `AUDIT-NONDETERMINISTIC` | Same inputs produced incomparable outputs. |
| `SYS-ENV-DRIFT` | Runtime/model/schema versions changed between compared runs. |
| `SYS-CONFIG-SECRET` | Configuration referenced a secret that leaked into an artifact. |
| `SYS-TOOL-FAILURE` | External tool, runtime or adapter failed. |

## 3. Severity

| Level | Meaning | Default action |
| --- | --- | --- |
| `blocker` | Silently corrupts knowledge or violates a safety boundary. | Stop; human review. |
| `major` | Wrong or missing knowledge that a reader would act on. | Must be fixed or explicitly accepted. |
| `minor` | Local inaccuracy, ambiguity or missing detail. | Track; fix when convenient. |
| `cosmetic` | Style, formatting, naming. | No correctness impact. |

## 4. Disposition

| Value | Meaning |
| --- | --- |
| `AUTO_FIX` | Deterministic repair is possible and safe. |
| `RETRY` | Re-run with adjusted inputs; may resolve without human input. |
| `NEEDS_REVIEW` | Requires human semantic judgment. |
| `ACCEPTED` | Known limitation, consciously accepted for this experiment. |
| `TODO` | Not yet classifiable — the taxonomy needs extending. |

## 5. Open issues

- `TODO` — whether errors are recorded per claim, per note or per run.
- `TODO` — how severity is aggregated into a single run score (or whether it
  should be at all).
- `TODO` — mapping between this taxonomy and benchmark case categories
  (`AGENTS.md` §10: noisy ASR, missing source, conflicting sources, analogies,
  opinions, tips, formula-heavy material, repeats, genuine corrections).
- `UNKNOWN` — which of these errors actually occur in practice. The taxonomy is
  a hypothesis until real lessons are run through the pipeline.
