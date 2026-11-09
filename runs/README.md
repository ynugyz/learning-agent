# Generated runs

One subdirectory per experiment run, e.g. `runs/<case-id>/<timestamp>-<short-sha>/`.

Everything here is **generated output** and git-ignored — only this README and
the local `.gitignore` are tracked. Runs are reproducible artifacts, not
source (`AGENTS.md` §4).

## Expected run manifest fields

A run should eventually record (`AGENTS.md` §9):

- case ID;
- Git commit;
- runtime version;
- DSH version (detected, see `docs/ENVIRONMENT.md`);
- model;
- model configuration;
- prompt versions;
- schema versions;
- source bundle;
- timestamp.

## Promotion

Important, reviewed results may later be promoted into `benchmark/results/`.
Promotion is a deliberate, reviewed copy — never an automatic sync.

## Status

`TODO` — no run format or manifest schema exists yet.
