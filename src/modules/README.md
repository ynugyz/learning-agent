# `src/modules/` — deterministic units

Small, single-purpose, independently testable units with structured input and
structured output. This directory is where a processing step goes **before**
anyone considers making it an agent.

## Expected character of a module

- one clear responsibility, stated in the file header;
- explicit input and output types;
- no hidden I/O — a module that reads a file takes a path, it does not discover
  one;
- no model calls unless the module is explicitly a model-calling step;
- no DSH references (`AGENTS.md` §3.3);
- testable without a running runtime.

## Likely future modules (not yet designed)

- source ingestion and normalisation;
- transcript noise handling;
- text segmentation;
- formula detection;
- ID assignment and stability checking;
- schema validation;
- run-manifest assembly;
- diff generation for candidate writes.

## Why not agents

`AGENTS.md` §18: prefer a deterministic module with structured input/output.
Turning every processing step into an autonomous agent makes failures
unattributable and comparisons non-reproducible.

## Status

`TODO` — empty. No module may be written before the artifact schemas they
consume are reviewed (`docs/DECISIONS.md` D-0007, D-0005).
