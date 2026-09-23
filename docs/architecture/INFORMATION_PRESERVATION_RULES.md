# Distinct Learning Information and Coverage

**Status:** internal representation rule for LessonModel and Human Note Generator; not a fifth form, Agent, stage, schema or separate LLM call.

## Definition

**Distinct Learning Information (DLI)** is information that still has independent learning value after semantic deduplication. One DLI may be supported by several Source Units; one Lesson Module may contain several DLI. Lesson Modules organize meaning and lecture flow; they are not compression endpoints. A module being represented in Markdown does not prove that every useful information item inside it survived.

Example: “rules must be written,” “a changed question needs another rule,” “the rule set grows,” and “maintenance becomes hard” can become one DLI: fixed rules require individual maintenance and scale poorly as situations vary. Conversely, a module containing a definition, limit, example and problem-solving tip may contain four DLI.

## Small role vocabulary

| Role | Human-note use |
| --- | --- |
| `CORE` | Core concept or conclusion |
| `DETAIL` | Necessary distinct detail, mechanism or boundary |
| `EXAMPLE` | Classroom example that helps recall or distinction |
| `METHOD` | Procedure, problem-solving step or study method |
| `TEACHER_NOTE` | Teacher view or learning advice, presented with its status |
| `UNCERTAIN_ESSENTIAL` | Important meaning that cannot yet be recovered reliably |

SourceMap may keep its finer source content types. These six roles are only the Human Note path's information roles; they do not replace SourceMap or LessonModel.

## Decision for each item

1. Does it add a meaning that remains distinct after semantic deduplication? If no, merge it with its equivalent.
2. Does it help understanding, review, problem solving, distinction, memory or recovering classroom emphasis? If no, keep it machine-only when provenance still matters.
3. Would removing it remove a real meaning from the block? If yes, retain it, subject to evidence and risk handling. If uncertain but essential, use the warning process in [source authority](ENRICHMENT_AND_SOURCE_AUTHORITY.md).

**Compress repetition aggressively. Preserve distinct information aggressively.** Source Unit textual coverage is not the product target; DLI coverage is. Do not use fixed 1–3 sentence limits, word limits or bullet counts to discard independent information. Do not dump every Source Unit into Markdown.

## Composer order and coverage ledger

For each frozen recall block: collect its Source Units, use LessonModel to understand their grouping, deduplicate semantically, identify DLI, retain each learning-useful DLI, and write the core statement with necessary detail, example or method. Then test independent understandability, apply minimal canonical enrichment only if needed, and resolve uncertainty before showing a warning. Do not start with a module summary and then fill the hollow result with free AI knowledge.

The machine coverage ledger should identify a DLI, its role, contributing source/module references, destination block, disposition (`HUMAN_NOTE`, `MACHINE_ONLY`, `MERGED`, or `UNRESOLVED`) and reason where omitted or merged. These are conceptual fields, not a formal schema. The ledger must expose loss of a distinct learning item even when every module appears in the note. A deterministic quality check can flag unaccounted DLI; human judgment remains necessary for whether information is truly distinct or useful.
