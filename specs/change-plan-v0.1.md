# ChangePlan v0.1

> **Status: DRAFT — NOT IMPLEMENTATION-STABLE.**

## Question

What reversible changes should be proposed for the durable AI and Human
knowledge layers?

## Operations

The first operation vocabulary is:

- `create`
- `expand`
- `link`
- `add_relation`
- `add_source`
- `annotate_scope`
- `merge_candidate`
- `preserve_both`
- `no_change`

Every operation identifies its target, source references, preserved existing
content, rationale, and unresolved risks. `expand`, `merge_candidate` and
`preserve_both` operations must name the existing content they preserve. A
merge operation is only a proposal; it does not delete or overwrite a page.

## Human update rule

Human candidates are additive and reversible. They may contain an insertion,
an appended section, a new wikilink or a clearly marked boundary sentence.
They must not replace the old note with a shorter regenerated summary.

## Candidate boundary

ChangePlan output is written only to a candidate or test state. Applying a plan
to a production Vault is a separate operation and is outside this contract.
