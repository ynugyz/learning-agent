# Runtime Minimal Flow

**Status:** target operating model, not a measured cost result or a new Agent implementation.

```text
Raw lesson package
  -> CALL 1 Analyzer: SourceMap + LessonModel + necessary source alignment
  -> CALL 2 Human Note Generator: chapter assignment, recall blocks,
       DLI extraction/deduplication, composition, bounded enrichment,
       Human Chapter Note + semantic sidecar
  -> CALL 3 Quality Gate only when needed (or a lower-cost deterministic audit)
```

The conceptual forms and checks do not imply one LLM call or Agent each. DLI, block planning, enrichment, warning selection and fragmentation checks are internal responsibilities or deterministic validators. Do not create a Chapter, Block, DLI, Enrichment, Warning or Fragmentation Agent. The target is about **2–3 main LLM calls** for a normal lesson, to be measured in later cases rather than assumed achieved.

At the LessonModel branch point, the Human Note Generator may use source evidence and optional existing chapter context. It does not depend on Alignment or ChangePlan. In parallel, the Knowledge Update branch may run Alignment, ChangePlan and a candidate Knowledge Updater, with its own safety and review gates. Runtime adapters (including DSH) remain replaceable behind the existing AgentRuntime boundary.

The quality gate checks DLI coverage, unsupported additions, major chapter/block structure errors, enrichment scope, unaccounted information and severe warning issues. Run a conditional model review only where deterministic checks and confidence are insufficient. Prototype evaluation performs one generation and one audit; do not loop automatic repairs until an experiment explicitly authorizes that behavior.

Normal production interaction should be generation followed by a 1–3 minute user scan. Ask for deeper human judgment only for uncertain chapter boundaries, major source conflict, important unresolved information or high-risk knowledge correction. None of this authorizes direct production Vault writing.
