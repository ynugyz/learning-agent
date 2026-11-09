# Alignment v0.2

> **Status: DRAFT — NOT IMPLEMENTATION-STABLE.**

## Contract boundary

Alignment compares LessonModel items with the existing machine and Human
knowledge state. It does not write notes and it does not choose concrete file
mutations.

`relation` answers:

> What is the semantic relationship between this LessonModel item and the
> current Knowledge State?

`resolutionState` answers:

> Is that relationship settled enough to pass to ChangePlan?

The relation vocabulary is unchanged:

`NEW`, `EXPAND`, `REFINE`, `CORRECT`, `EXAMPLE`, `RELATION`, `CONFLICT`,
`NO_CHANGE`.

The resolution vocabulary is intentionally small:

`resolved` or `deferred`.

## Meaning of the two NO_CHANGE cases

```text
NO_CHANGE + resolved
    Existing Knowledge State already covers the classroom meaning.

NO_CHANGE + deferred
    The current evidence is insufficient or the judgement is unfinished.
    This item is not considered covered and must not drive mutation.
```

The second form is a process-resolution state, not a claim that the Knowledge
State is complete.

## Generation rule for low-cost models

When the model cannot reliably determine a relation, it should use:

```text
relation = NO_CHANGE
resolutionState = deferred
```

This is a safe hold position. It must not be used to imply coverage.

`CONFLICT + deferred` and `EXPAND + deferred` are allowed when there is a
clear provisional basis for that relation but the evidence is not sufficient to
drive a mutation. A model should not invent a relation merely to attach
`deferred`.

## Downstream rule

Only `resolutionState = resolved` may drive a ChangePlan mutation. A deferred
candidate may be omitted from the mutation operations or represented by the
existing no-op operation, but the audit must retain its alignment ID and
rationale.

Every relation other than `NEW` still identifies at least one existing
semantic or Human-note target.

## Compatibility

`alignment/0.1` remains available as a historical compatibility schema. A
reader must not silently treat an old `NO_CHANGE` as resolved when migrating
an artifact that has no `resolutionState`; such records require explicit
migration or remain read-only historical data.
