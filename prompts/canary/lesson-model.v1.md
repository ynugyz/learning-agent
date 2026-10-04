# LessonModel candidate prompt

Version: 1.1
Output schema: `schemas/lesson-model.v0.1.schema.json`

Using only the supplied SourceMap, produce exactly one LessonModel candidate.
Return only one JSON object: no Markdown, code fences, preamble, or trailing
commentary. Follow the supplied JSON Schema exactly, including its existing
enums and required fields. Do not add properties or relation types outside the
schema. Keep `status: "draft"`.

## Role

The LessonModel is a **classroom knowledge-structure recovery artifact**. It
recovers what the lesson introduced, how the teacher developed it, why one
idea led to another when the source says so, and which examples, limits,
opinions, methods, questions, and uncertainties must remain available to
later Alignment and Human Layer generation.

It is not a Human Note, chapter summary, textbook rewrite, transcript copy, or
polished prose essay. Do not optimize for attractive headings or a smooth
reading narrative. A compact but structurally faithful model is preferable to
a beautiful summary that loses relationships.

## Items and SourceMap coverage

- Every item must reference one or more real SourceMap `unitId` values in
  `sourceUnitRefs`. Never invent a source unit reference.
- Group adjacent units only when they form one coherent classroom role. Split
  a group when it contains different roles or epistemic statuses, such as a
  concept followed by a teacher opinion or an example with a separate
  limitation.
- Every SourceMap unit with learning value must be represented by at least one
  item or by an explicit entry in `uncertainties` / `visualGaps`. Do not drop
  material merely because it is not a definition. Preserve, when present:
  teacher examples and analogies, method-selection reasons, learning advice,
  mathematics-foundation reminders, limitations and boundaries, disputed
  claims, and teacher emphasis.
- Choose the existing `kind` that best describes the recovered role:
  `concept`, `claim`, `mechanism`, `example`, `comparison`, `method`,
  `boundary`, `formula`, `teacher-explanation`, `question`, or `other`.
  Do not turn an example, advice, or opinion into a generic concept just to
  make the model look orderly.
- `statement` should state the classroom meaning and its scope, not restate a
  SourceMap summary as a paragraph. `title` is a concise retrieval label.
  Keep the item useful for machine routing and later composition.
- Preserve SourceMap gaps. If a formula, diagram, speaker identity, or
  terminology is missing or unstable, record the usable classroom meaning and
  carry the limitation in `uncertainty`, `visualGaps`, or top-level
  `uncertainties`. Do not repair it with external knowledge.

## Teaching flow

`teachingFlow` is a view of how the lesson was taught, not a chapter index.
Use it to recover meaningful transitions. Each entry must use real item and
SourceMap references and should make its `teachingPurpose` explain as much of
the following chain as the source supports:

`problem or question → introduced concept/method → what it addresses →
limitation or boundary → next concept or application`

- Record why a concept was introduced when the source explicitly gives the
  problem, motivation, failed approach, limitation, or question.
- Record examples, comparisons, demonstrations, and teacher emphasis as part
  of the flow when they perform a teaching function.
- Keep chronological teaching order in `order`, but do not treat mere order as
  a semantic dependency. A later item is not automatically a prerequisite or
  consequence of an earlier item.
- If the source only says that the lesson moves to the next topic and does not
  state the reason, write that the reason is unclear. Do not invent a causal
  bridge or a motivation to make the flow sound complete.
- A flow may contain several related items, but do not put the whole lesson in
  a few broad blocks whose purpose is only “continue the chapter”. Prefer
  transitions that expose the problem, explanation, boundary, and turn.

## Relations

Create a relation only when the SourceMap-backed lesson structure supports a
specific semantic edge. Do not create a relation merely because two items are
adjacent, appear in the same chapter, share a term, or are both mentioned.
Ordinary relatedness is not a relation in this schema.

Use the existing relation enum with these meanings and directions:

- `part-of`: an explicit hierarchy or component relationship.
- `requires`: understanding the `fromItemId` is a real prerequisite for
  understanding the `toItemId`; earlier classroom order alone is insufficient.
- `enables`: the source shows that the first item makes the next reasoning,
  method, or application possible. It is not a synonym for “was mentioned
  before”.
- `causes`: use only when the source explicitly presents a causal relation;
  never use it for teaching sequence.
- `contrasts-with`: an explicit comparison or opposition.
- `example-of`: an example, analogy, demonstration, or concrete application
  that illustrates the target item.
- `qualifies`: a limitation, boundary, condition, or teacher qualification
  that narrows the target item.
- `supports`: actual evidence, argument, explanation, or derivation that
  supports the target claim. Never use `supports` for time adjacency, “the
  teacher continued with…”, or same-chapter membership.
- `uncertain`: the relation is suggested but its type or direction cannot be
  recovered reliably.

The schema has no `leads-to`, `motivated-by`, `constrained-by`, `applies-to`,
or `exemplifies` values. Do not invent them. Put teaching progression and
motivation in `teachingFlow`; use `enables` only for a supported conceptual
bridge, `qualifies` for a supported limitation, and `example-of` for a real
example relation. Every relation needs a concise `rationale` and, when useful,
its supporting `sourceUnitRefs`.

## Epistemic control

Carry the SourceMap's epistemic boundaries into the LessonModel rather than
flattening them:

- SourceMap teacher viewpoints become items with `context: "teacher-opinion"`
  or an explicitly attributed teacher-explanation. Never rewrite them as
  objective facts.
- SourceMap analogies become `context: "analogy"` and remain examples or
  explanations, not definitions or mechanisms unless the source separately
  states one.
- SourceMap uncertain or conflict material becomes `context: "uncertain"`
  when represented as an item, with the unresolved wording and scope preserved
  in `uncertainty`. Because the LessonModel schema has no `conflict` context,
  describe both sides and the unresolved status instead of silently choosing a
  side.
- A source-explicit statement is still only a classroom/source statement; it
  is not independently verified. Keep attribution and classroom scope where
  relevant.
- Do not use `canonical-supplement` unless such supplementation is explicitly
  present in the supplied input. Do not correct ASR, supply missing formulas,
  or import textbook facts.
- If one proposed item would combine a teacher opinion, an analogy, and a
  factual-looking claim, split it or state the different roles explicitly.

Top-level `uncertainties` should preserve unresolved source or structural
issues that affect several items. `visualGaps` should name missing diagrams,
slides, audio, formulas, or other material needed to recover the lesson.

Finally, derive a stable concise `lessonModelId` and `contentIdentity` from the
supplied SourceMap package, keep all references package-local, and return the
schema-valid JSON object only.
