# Learning Knowledge Compilation Workflow

**Status:** design draft, implementation-independent.

This document is the current design point for converting classroom evidence
into a growing Human note layer and an AI-facing semantic layer. It replaces
the stronger page, block, chapter, DLI and review assumptions in the earlier
Human Note v2 prototypes. Those prototypes remain historical experiments.

## Invariants

Only these boundaries are fixed:

1. `SourceMap` records what the source material contains.
2. `LessonModel` records what the lesson means and how it is taught.
3. `Alignment` relates the lesson to the existing knowledge network.
4. `ChangePlan` proposes how the long-term network should grow.
5. Outputs have an AI-facing layer and a Human-facing note layer.

Page roles, block names, DLI ledgers, image handling, and model call counts are
implementation choices. They must not become new architectural obligations.

## Source boundary

Source filenames are opaque labels. A filename produced by a recorder or an
ASR service is not evidence of the lesson topic. Topic, session continuity and
content identity come from the material itself.

Raw sources remain unchanged. Transcript, slide, board image and textbook
material may be combined into one source package, but every downstream claim
keeps a source reference.

The default path is transcript-first. A photograph or PPT page is inspected
only when a missing visual object prevents understanding. Image processing is
an optional evidence supplement, not a mandatory stage.

## Pipeline

```text
source package
      |
      v
SourceMap
      |
      v
LessonModel
      |\
      | \---- Human layer: preserve and grow existing notes
      |
      \------ Alignment -> ChangePlan: grow the AI knowledge network
```

The Human branch may use existing notes as seed knowledge and style evidence.
It does not wait for Alignment to decide whether a classroom point is allowed
to appear. Alignment and ChangePlan describe long-term network changes.

## Existing Human notes are preserved assets

An update starts from the existing note and produces an additive candidate:

- keep existing learning content;
- insert or append new explanations where they belong;
- add links for related but distinct concepts;
- propose a merge only when two pages clearly represent the same object and the
  merge can preserve all useful content and links;
- never shorten a note merely to satisfy a fixed length or template.

If the relationship is uncertain, retain both pages and connect them with an
Obsidian wikilink. Strong relationships may later justify a merge, but linking
is the default.

## Classroom wording and general boundaries

When a teacher uses a simplified explanation, Human notes lead with the
classroom explanation and add one concise boundary sentence:

> 课堂先把生成式 AI 解释为根据训练数据分布生成结果。这是建立直觉的
> 课程简化；更一般的讨论还需要区分模型结构、训练目标和不同系统。

This preserves the learning value of the lesson without silently turning a
classroom shortcut into a universal claim. Two contextualized statements can
coexist without stopping the compilation run or requiring a default manual
conflict gate.

## Growth and links

The durable structure is a graph with useful routes, not a single rigid tree.
MOCs and indexes provide readable main paths. Wikilinks provide cross-course
and cross-topic growth. New material first strengthens an existing node when it
has the same object, adds a link when it is merely related, and becomes a merge
candidate only when the identity and explanatory purpose are genuinely shared.

The AI layer records the reason for an update and the source references. The
Human layer remains readable prose, formulas, examples, comparisons and
practice guidance; it does not expose machine bookkeeping in its body.
For every alignment other than `NEW`, the machine record names the existing
semantic identity, Human note, or both, so the two layers retain a stable join.

## Alignment relation and resolution state

Alignment v0.2 keeps the semantic relation separate from the status of the
judgement. `relation` answers what relationship the LessonModel item has to the
current Knowledge State. `resolutionState` answers whether that judgement is
settled enough for ChangePlan.

```text
NO_CHANGE + resolved
    Existing Knowledge State covers the classroom meaning.

NO_CHANGE + deferred
    Evidence is insufficient or the judgement is unfinished. This is not a
    coverage claim and must not drive a Knowledge State mutation.
```

When a low-cost model cannot safely determine a relation, the default is
`NO_CHANGE + deferred`. `EXPAND + deferred` and `CONFLICT + deferred` remain
possible only when the provisional relation itself has a clear basis. A
deferred candidate remains visible in the audit and can be reconsidered when
new evidence arrives.

Only resolved candidates may drive ChangePlan mutation operations. ChangePlan
does not re-interpret evidence uncertainty; it enforces this Alignment
precondition before proposing a mutation.

## Existing-note reference validation

Note references are checked in three separate layers:

1. syntax validation checks the relative path and optional anchor shape;
2. resolution-context validation checks the declared canonical root/index;
3. targeted preflight checks only the referenced file and, when present, its
   heading or block anchor.

An invalid resolution context is reported as `context_invalid`, not as a
missing note. The preflight never scans the entire Vault.

## Auditable but non-prescriptive checks

Every run should be able to answer:

- which source units support each lesson item;
- which existing notes were read;
- which old note content was preserved;
- which links were added;
- which pages were proposed for expansion or merge;
- which claims are classroom-specific or uncertain;
- which visual gaps remain;
- which candidate changes are still unapplied.

These are audit questions, not a fixed Human Note template.

## Historical prototypes

`src/human-note-v2/`, `scratch/real-case-001/` and related configs are retained
as experiments. Their fixed chapter, recall-target, presentation-block and
human-gate assumptions are not the implementation contract for this workflow.

## Reference inspiration

The graph-growth direction follows the useful part of [Karpathy's LLM Wiki
sketch](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f):
keep raw sources intact, maintain a persistent interlinked Markdown knowledge
space, and update links and contradictions as new material arrives. This
workflow borrows that persistence and provenance idea, not its page layout or
tooling choices.
