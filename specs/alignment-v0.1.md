# Alignment v0.1

> **Status: DRAFT — NOT IMPLEMENTATION-STABLE.**

## Question

How do LessonModel items relate to the existing AI layer and Human seed notes?

## Input

- a LessonModel;
- existing semantic entries and relations;
- an index of Human notes and their links.

## Relations

The initial vocabulary is:

`NEW`, `EXPAND`, `REFINE`, `CORRECT`, `EXAMPLE`, `RELATION`, `CONFLICT`,
`NO_CHANGE`.

`CONFLICT` can mean different scope, teaching simplification or genuinely
incompatible claims. The alignment record must say which one it means.

## Default update policy

- same object and new useful material → expand the existing note;
- related object → retain separate notes and add a wikilink;
- clearly duplicated object → propose a merge without dropping content;
- uncertain match → keep both and record the uncertainty.

Every relation other than `NEW` identifies at least one existing semantic or
Human-note target. This is the join that lets the AI layer and Human layer grow
together without making the Markdown itself the machine index.

Alignment never suppresses a classroom learning point from the Human layer.
It also never rewrites a Human note directly.
