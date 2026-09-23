# Learning Agent Architecture v2 — Human Learning Note branch

**Status:** prototype, READY_FOR_HUMAN_REVIEW. This document does not freeze
an M1B schema and does not authorize production Vault writes.

## Split responsibilities

The accepted SourceMap and LessonModel remain the shared source-understanding
layer. From that point the system has two independent branches:

```text
SourceMap -> LessonModel v2
                 |\
                 | \-> Human Note Composer v2 -> Human Learning Note candidate
                 |
                 \----> Knowledge Alignment -> ChangePlan -> Knowledge Updater
```

The existing Alignment, ChangePlan and Writer artifacts remain the long-term
knowledge update path. The Writer is not reused as a human learning note
composer.

## LessonModel v2 dual axis

`src/human-note-v2/types.ts` represents two views on each module:

- `conceptStructure` holds definitions, mechanisms, boundaries, examples,
  comparisons, prerequisites and semantic relations for machine use.
- `lectureFlow` holds `flowOrder`, source module references, teaching focus,
  teaching function, transition type, expansion evidence and expansion level.

Lecture flow controls ordering and grouping. It does not require relation prose
in the Markdown output.

## Relation Silence Rule

Machine relations are not automatically narrated. A relation is written into a
human note only when it is itself causal content, prevents a likely confusion,
was explicitly taught, or is central to understanding or assessment. Otherwise
lecture order and a short transition carry the structure.

## Human Note Plan and sidecar

`human-note-plan.json` is the declarative boundary between lesson understanding
and prose. It contains the note goal, thesis, prior recall, ordered sections,
knowledge anchors and a coverage ledger. Core statements are constraints, not
finished prose.

The Markdown candidate contains learning content only. The semantic sidecar
stores module and source references, uncertainty, prior-note references,
wikilinks and a content fingerprint without copying the note body.

## Audits

The prototype emits coverage, quality and v1/v2 comparison artifacts. The
quality audit checks source boundary, machine metadata leakage, question use,
low-information expansion, adjacent redundancy, lecture order and paragraph /
bullet balance. It reports a human gate separately from machine pass results.

## Safety boundary

The prototype reads accepted artifacts and selected prior-note metadata for
context. It writes only below `scratch/real-case-001/human-note-v2/`. It does
not modify the production Vault, existing notes, ChangePlan, SourceMap or the
accepted LessonModel v1.
