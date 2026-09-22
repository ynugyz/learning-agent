# Gold data

Human-authored reference answers used to score pipeline output.

## Hard rules

1. **The agent never fabricates Gold data** (`AGENTS.md` §10). If reference data
   does not exist, it must be recorded as a placeholder with `status:
   NEEDS_HUMAN_AUTHORING` — never invented to make a benchmark look complete.
2. Gold data is owned by the human: semantic judgment is a human responsibility
   (`AGENTS.md` §2).
3. Each Gold file must state the case it belongs to and the schema version it
   was authored against.
4. Ambiguity in the source material should be preserved in the Gold file as a
   recorded judgment call, not smoothed away.

## Placeholder format

Until real Gold data exists, per-case placeholders use this shape:

```json
{
  "caseId": "TODO",
  "status": "NEEDS_HUMAN_AUTHORING",
  "authoredBy": null,
  "authoredAt": null,
  "note": "No reference answer has been authored. The agent must not fill this in."
}
```

## Status

`TODO` — empty, and correctly so. No placeholder file is created yet because no
case exists to attach one to.
