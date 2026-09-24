# Temporary pilot-safe mode

`pilot:note` is a write boundary for a real classroom-note trial. It does not
change SourceMap, DLI, Composer or any Human Note semantics.

```powershell
npm run pilot:note -- --config <pilot-config.json>
```

The config has two execution modes:

```json
{
  "mode": "dry-run",
  "allowedPilotRoot": "D:/ProgramData/Learning-agent/pilot-vault",
  "sources": ["D:/path/to/lesson-transcript.txt"],
  "course": "人工智能导论",
  "runName": "PILOT_CANARY_001",
  "composerConfig": "real-case-001-human-note-consolidated.json"
}
```

The thin Pilot Adapter currently accepts exactly one `.txt` or `.md` source.
It invokes the existing `composeConsolidatedHumanNote` Composer in an
ephemeral temporary directory, then sends the generated candidate, semantic,
audit and manifest artifacts through `src/pilot-safe/`. The Composer does not
write directly to the pilot or production Vault. Relative config paths are
resolved from the config file directory.

The lower-level runtime also accepts explicit `candidateOutputs` plans for
tests and other callers. Those plans remain subject to the same safety checks.

## Hard safety rules

- The default root is the repository's `pilot-vault`. A non-default root needs
  `allowExternalPilotRoot: true` and must not overlap a configured production
  root (`productionVaultRoots` or `LEARNING_AGENT_PRODUCTION_VAULT_ROOT`).
- Production Vault paths and `.obsidian` paths are rejected.
- Existing final paths fail immediately. `maxModifiedFiles` is `0`; no user
  note is overwritten.
- Parent segments, sibling-prefix escapes, symlink/junction/reparse-point
  escapes, NTFS alternate data streams, and Windows reserved names are
  rejected. Containment uses canonical `path.relative` checks.
- Limits are checked before any candidate write. The current limits are
  `maxCreatedFiles=20`, `maxHumanNoteBytes=524288`,
  `maxSidecarBytes=2097152`, `maxTotalWriteBytes=10485760`, and
  `maxWritesPerPath=1`.
- Generated output directories are not accepted as source inputs.
- Automatic repair is disabled.
- Commit writes each file as temporary file → round-trip validation → atomic
  rename. A JSON run manifest is kept under
  `.learning-agent/pilot-runs/` in the pilot root. It records actual reads,
  candidate writes, byte counts and the abort reason when a run stops.

Dry-run performs all reads and safety checks, prints the plan and does not
create directories, candidate files or a manifest. Commit persists the
manifest after a successful plan; a pre-write safety abort persists an
`ABORTED` manifest when the pilot root itself is safe to use.
