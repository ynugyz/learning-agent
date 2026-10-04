# SourceMap candidate prompt

Version: 1.2
Output schema: `schemas/source-map.v0.1.schema.json`

Turn the supplied source package into exactly one SourceMap candidate. Return
only one JSON object: no Markdown, code fences, preamble, or trailing
commentary. Follow the supplied JSON Schema exactly, including every enum and
required field. Do not add properties outside the schema. This prompt changes
the mapping behavior only; the output remains compatible with
`source-map/0.1`.

## Role of the SourceMap

The SourceMap is an evidence-navigation layer. It records what the source
package contains, where it occurs, how the source presents it, and what is
missing or unstable. It is not a lesson summary, textbook rewrite, verified
knowledge base, or change proposal.

Do not correct the source. Do not consult external knowledge. Do not decide
whether a claim is factually true. Do not turn the source into a cleaner
canonical explanation. Later stages will interpret the lesson; this stage only
preserves and locates evidence for them.

## Source units

- Create units for independently classifiable, independently locatable
  semantic spans. Do not mechanically split every sentence, and do not merge
  separate non-contiguous spans merely because they concern the same topic.
- A coherent explanation, example, analogy, opinion, warning, formula mention,
  exam pointer, interruption, or administrative remark may each be its own
  unit when that keeps its source role and epistemic status clear.
- Do not discard noisy regions wholesale. If a noisy span contains a teacher's
  explanation, emphasis, viewpoint, example, caveat, or conclusion, preserve
  that material in one or more units. Keep an unintelligible fragment only
  when it is part of the evidence boundary; classify it as `unknown` or
  `narration` and mark the uncertainty.
- Do not increase unit count merely to appear thorough. Split only when the
  split preserves a real difference in source role, speaker/function, or
  uncertainty. Do not silently collapse repeated or interrupted content when
  doing so would lose where it appeared.
- Mint stable package-local `unitId` values from the source and locator alone.
  Never derive them from a lesson model, knowledge item, or final destination.

## Locators and summaries

- Every unit must point to the narrowest reliable source span available. Use
  line ranges, timestamps, pages, slides, sections, or character spans from
  the supplied source. If exact boundaries are unavailable, use the best
  package-local locator and record the limitation in an observation or source
  quality note.
- When the source is supplied inside a wrapper such as `CONTEXT [source.txt]`
  or a temporary `stage-input-source-map.txt`, treat only the embedded
  `source.txt` content as evidence. `line-range` numbers must count the lines
  of `source.txt` itself, with its first line as line 1. Do not count prompt,
  schema, wrapper, or bootstrap lines. `span` offsets, when used, must be
  zero-based character offsets within `source.txt` only, with an exclusive end.
- `sources[].location` must identify the supplied source (`source.txt` or the
  package-relative source location provided in the input). Never use
  `stage-input-source-map.txt`, a temporary stage-input filename, or the line
  numbers of the wrapper as the source location. If a package identifier is
  not supplied, do not invent one from a temporary filename or timestamp.
- If a `notes` entry explains locator semantics, say that locators use the
  logical `source.txt` numbering. Never describe wrapper-line numbering as the
  evidence location.
- A unit `summary` is a short, pointer-grade description of what appears in
  that span. Attribute statements when useful (for example, “讲者称……” or
  “转写记录……”); preserve the source's scope and modality.
- A summary may state that the source introduces, compares, illustrates,
  questions, emphasizes, or claims something. It must not supply a missing
  definition, repair a broken formula, infer a stronger causal relation, or
  rewrite several spans into a textbook conclusion.
- Do not use summary prose to hide uncertainty. If a term, formula, referent,
  or reasoning step is unstable, say what is unstable and keep the original
  wording as far as possible.
- `keyTerms` are retrieval labels drawn from the source. Do not replace an
  uncertain term with the likely canonical term from outside knowledge. Keep
  competing spellings or wording only when they actually occur in the source.

## Epistemic control

`epistemicStatus` describes how the source presents the unit; it never means
that the content has been independently verified.

- Use `source-explicit` when the source clearly states or shows the content,
  including a historical or technical assertion that may still be false.
- Use `opinion` for a speaker's evaluation, judgment, preference, or criticism;
  use `analogy` for an explicitly presented analogy; use `heuristic` for a
  rule of thumb or practical shortcut.
- Use `uncertain` when the wording, reference, formula, speaker, or intended
  meaning cannot be recovered reliably from the supplied source. Use
  `conflict` only for an actual disagreement between source statements, not
  merely for an ASR error or a missing context.
- Use `inferred` only for a minimal source-local interpretation that is needed
  to classify or group the span. A normal paraphrase of an explicit statement
  is still `source-explicit`.
- Do not use any status as a fact-check result. In particular,
  `source-explicit` does not mean “verified”.

Teacher viewpoints, disputed viewpoints, historical assertions, and unstable
terminology must remain distinguishable in both `contentType` and
`epistemicStatus`. Preserve the source's attribution and scope instead of
silently converting a teacher's explanation into an objective fact.

## High-risk factual and evaluative claims

Apply extra retrieval and provenance care to claims that are easy to repeat as
facts or that could materially mislead later stages:

- named historical people, dates, discoveries, institutions, awards, prizes,
  and disciplines (for example a Nobel award or a physics award);
- words such as “first”, “only”, “always”, “proved”, “caused”, “won”, or other
  strong historical, causal, or evaluative assertions.

For such a unit, put every named person, award or prize, field, date/year, and
distinctive claim phrase that actually appears in the source into `keyTerms`.
Keep the source's spelling and competing ASR variants; do not supply a
canonical name, award, year, or correction from external knowledge. A generic
topic term alone is not sufficient for retrieval.

Add at least one concrete advisory observation when the package provides no
corroborating source: use `needs-cross-source-check` and identify the claim and
its source span. If a person, award, date, or term is damaged or ambiguous,
also use `asr-suspect` or `terminology-unstable`; use `needs-human-review` when
the source wording cannot support a reliable interpretation. For a strong
evaluation, preserve the speaker attribution and use `opinion` when the source
presents it as an opinion; add `needs-human-review` if it could otherwise be
mistaken for a verified fact.

These observations flag later checking needs. They do not authorize the
SourceMap to fact-check, correct, or expand the claim.

## Concrete uncertainty and source quality

When uncertainty exists, make it auditable and local. Add an appropriate
package-local `observations` entry with `advisory: true`. Its `rationale` must
identify, as specifically as the source permits:

1. the suspect word, formula, speaker change, or phrase;
2. the relevant line, timestamp, page, or span;
3. why it is unreliable (for example ASR noise, missing notation, truncation,
   terminology instability, or insufficient context).

Use the observation vocabulary precisely: `asr-suspect` for likely
transcription damage, `terminology-unstable` for an unstable term,
`has-formula` or `has-notational-risk` when notation is missing or unsafe to
reconstruct, `compression-loses-meaning` when shortening would remove a
necessary distinction, `needs-cross-source-check` for a package-local source
comparison, and `needs-human-review` when the source cannot support a reliable
interpretation. Do not invent an observation just to lower confidence.

Record source-level noise, missing pages/audio/slides, out-of-order material,
and truncation in `sources[].quality` or `missingOrUnavailable` as appropriate.
Set `coverage.assessment` to `not_assessed` unless the supplied package itself
provides enough evidence for a bounded coverage assessment. Do not claim that
the package is complete merely because no gap was noticed.

`preservation.priority` is a fidelity reminder, not a judgment about the
importance or truth of the knowledge. Treat it as an inference and always set
`preservation.isInference` to `true`. Favor `high` or `must-preserve` for
teacher viewpoints, caveats, examples, formulas, boundary conditions,
exam-relevant remarks, and evidence that would lose meaning if compressed; do
not use that priority to promote the content into a later knowledge layer.

Use `conflicts` only for disagreements that are actually observable between
source units or source items. Do not resolve them, choose the “correct” side,
or use a conflict entry as a substitute for a concrete uncertainty observation.
Keep `notes` limited to mapping, coverage, and evidence-boundary notes; never
turn it into a lesson summary.

Finally, use `status: "draft"`, preserve all source-local uncertainty, and
return the JSON object only.
