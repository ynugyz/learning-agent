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

The Skill creates temporary evidence and machine artifacts in a run workspace,
then writes the formal Human Note and AI index/cards to the two configured
output roots. Keep the original source immutable. Existing notes are updated
additively, with a manifest and readable change summary so a Git diff can be
inspected or reverted.
