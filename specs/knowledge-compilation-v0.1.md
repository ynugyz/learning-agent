# Knowledge Compilation v0.1

> **Status: DRAFT — NOT IMPLEMENTATION-STABLE.**
>
> This is a design umbrella for four machine artifacts and two output layers.
> It does not freeze Markdown page roles or a Human Note renderer.

## 1. Four responsibilities

| Artifact | Question answered | Downstream handoff |
| --- | --- | --- |
| SourceMap | What actually appeared, where, and with what source quality? | `sourceUnitId` references |
| LessonModel | What does this lesson teach and how do its ideas connect? | lesson item and relation references |
| Alignment | How does this lesson relate to existing knowledge? | candidate matches and update reasons |
| ChangePlan | How should the durable network grow? | reversible candidate operations |

The four artifacts are not required to be four agents or four model calls.

## 2. Two layers

The AI layer stores stable identities, compact semantic items, relations,
provenance, context, uncertainty and links to Human notes. It is not a second
copy of the Markdown.

The Human layer stores readable explanations and preserves existing notes. It
may grow by expansion, insertion and linking. A related concept normally gets
a wikilink; a merge is a later candidate operation.

## 3. Shared principles

- Source filenames are not semantic evidence.
- Raw source files are immutable inputs.
- Every derived item has source references or an explicit bounded-enrichment
  reason.
- Existing Human learning content cannot be silently dropped.
- Classroom simplifications may coexist with one concise general boundary.
- Transcript-first processing is the default; visual evidence is on demand.
- Unknown, uncertain and conflicting material remains explicit.
- Every non-`NEW` alignment retains an existing semantic or Human-note target.
- Candidate changes are separate from production writes.
