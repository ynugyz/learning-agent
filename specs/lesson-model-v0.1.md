# LessonModel v0.1

> **Status: DRAFT — NOT IMPLEMENTATION-STABLE.**

## Question

What did this lesson or source batch teach, how were the ideas explained, and
how do the concepts, claims, examples and boundaries connect?

## Input

- an accepted `SourceMap`;
- selected raw source spans when a summary is insufficient;
- optional course context and existing Human note context.

Existing notes are context and seed knowledge. They must not overwrite what the
incoming lesson actually says.

## Output

A LessonModel contains, at minimum:

- a content-derived lesson identity;
- semantic items such as concepts, claims, mechanisms, examples, comparisons,
  methods and teacher explanations;
- relations between items;
- source references for every item;
- a teaching-flow view showing how the lesson introduced and developed ideas;
- uncertainty, missing-visual and classroom-scope notes.

The model may use internal DLI or concept-packet structures, but neither is a
new top-level artifact or a mandatory Markdown block type.

## Epistemic context

An item may be marked as a classroom explanation, course simplification,
canonical supplement, teacher opinion, analogy, inference or unresolved item.
The model must not promote an inference to a verified fact merely by storing
it.

## Non-goals

LessonModel does not decide the final page, does not delete old Human content,
does not perform long-term alignment and is not a compressed transcript.
