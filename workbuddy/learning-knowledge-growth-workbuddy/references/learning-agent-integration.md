# Learning Agent integration reference

The repository containing this reference is the Skill's companion library. It
may be cloned to any local path; do not assume a fixed drive letter. Resolve
the repository root from the installed bundle or from the user's configured
workflow path.

The Skill uses the model configured by the WorkBuddy harness for reasoning and generation. It does not launch DSH, Jev, or a second model provider. DeepSeek is valid when selected in WorkBuddy. The legacy PowerShell session runner is
kept for historical regression experiments and must not be called by the
WorkBuddy Skill.

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
discard the temporary workspace and unused page renders. A compact error note is
kept only when a run fails and diagnosis needs it.

For future workflow experiments, compare the current path with a simplified
path and, where context size changes, a token-matched irrelevant-context control.
Keep the same source scope, model and requested depth across the comparison. A
retrieval score, a shorter prompt, or a more elaborate memory structure is not
evidence of a learning-quality improvement by itself. Promote a shortcut only
when it does not skip a necessary update or a source-supported condition.
