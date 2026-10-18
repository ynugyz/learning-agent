# Learning Agent integration reference

The repository containing this reference is the Skill's companion library. It
may be cloned to any local path; do not assume a fixed drive letter. Resolve
the repository root from the installed bundle or from the user's configured
workflow path.

The Skill uses Codex as its only reasoning and generation model. It does not
invoke DSH, Luna, DeepSeek or Jev. The legacy PowerShell session runner is
kept for historical regression experiments and must not be called by the
Codex-only Skill.

Use the repository's versioned prompts, schemas and course profile examples as
references. For a new subject, use a bounded user-selected folder or explicit
note list; never scan an entire Vault to infer a profile.

The Skill creates temporary evidence and machine artifacts in a disposable run
workspace, then writes formal Human Notes, selected source-image attachments and AI index/cards to the two
configured output roots. Keep the original source immutable. Existing notes are
updated by integrating new meaning while preserving valid content, not by
appending a paraphrase for every new source. The Skill's selected explanation
depth takes precedence over a legacy prompt that asks for exhaustive detail.
Provenance, hashes, maintenance state and open items live
in the AI index/cards; a per-run manifest or change-log file is not required.
Source-image attachments stay with the Human Notes using relative links; the
AI layer records their source locators without storing another image copy.
After a successful run, verify image links point to final attachments, then
delete the temporary workspace and unused page renders. A compact error note is
kept only when a run fails and diagnosis needs it.
