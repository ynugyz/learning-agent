# Environment Record

Facts captured during M0 bootstrap so later experiments can detect drift
(`AGENTS.md` §9 requires every run to be able to record this).

**Captured:** 2026-09-22 (local time +08:00)
**Captured by:** autonomous M0 bootstrap, read-only inspection
**Workspace:** `D:\ProgramData\Learning-agent`

## Host

| Item | Value |
| --- | --- |
| OS | Windows 11 (Microsoft Windows NT 10.0.26200.0) |
| Platform string | `Windows-11-10.0.26200-SP0` |
| Architecture | x86_64 |

## Toolchain

| Tool | Version | Path |
| --- | --- | --- |
| Git | 2.55.0.windows.2 | `D:\Enviroment\Git\cmd\git.exe` |
| Node.js | v22.23.2 | `D:\Enviroment\nodejs\node.exe` |
| npm | 10.9.8 | `D:\Enviroment\nodejs\npm.ps1` |
| pnpm | 11.7.0 | `D:\Enviroment\pnpm\pnpm.ps1` |
| Python | 3.14.7 (MSC v.1944, 64-bit) | `%LOCALAPPDATA%\Programs\Python\Python314\python.exe` |
| uv | 0.12.10 (3c979abda, 2026-09-04) | `...\WinGet\Packages\astral-sh.uv_...\uv.exe` |
| PowerShell | `pwsh` is **not** on `PATH`; Windows PowerShell 5.1 is the available shell | — |

`py` launcher and VS Code CLI (`code`) are also present.

## Agent runtime

| Item | Value |
| --- | --- |
| Package | `@deepseek-ai/dsh` |
| Version | **0.1.6-alpha.2** |
| Install mode | Global npm install |
| Location | `D:\Enviroment\nodejs\node_modules\@deepseek-ai\dsh\` |
| Entry point | `lib/bin.js` (bin name `dsh`) |
| Verified by | `dsh --version`, `npm ls -g --depth=0`, `package.json` |
| `DSH_HOME` | `%USERPROFILE%\.dsh` (from the active runtime environment; exact user path omitted deliberately) |

DSH is an external, user-installed runtime. M0 does not vendor, modify,
install, upgrade or project-pin it, and the pinning strategy for later
milestones is deliberately undecided (see `DECISIONS.md` D-0003). Record the
actual resolved version in every experiment manifest.

The version above is an **environment fact for this machine**, not a project
architecture decision. It is an `alpha` pre-release, so expect behavioural
change between versions; do not compare experiments across DSH versions
without recording the change (`AGENTS.md` §9).

## Obsidian

| Item | Value |
| --- | --- |
| Desktop version | 1.12.7 (`Obsidian.exe`, `ProductVersion` 1.12.7.0) |
| Obsidian CLI | not on `PATH` |
| Production Vault | **not located, not read, not referenced by this repository** |

The plugin is a future milestone. No Vault path is recorded here on purpose.

## Git identity

| Item | Value |
| --- | --- |
| `user.name` | `gyz` |
| `user.email` | configured locally; value deliberately not recorded here (see `git config user.email`) |
| Repository | initialized at M0 (`git init -b main`), no commits yet |

## Environment variables

Presence checked, values intentionally omitted (`.env` is git-ignored):

| Variable | Status at capture |
| --- | --- |
| `DSH_HOME` | set |
| `DSH_SESSION_ID` | set (session-scoped) |
| `DSH_SHELL` | set |
| `DSH_WEB_URL` | `http://127.0.0.1:3080` |
| `LEARNING_AGENT_API_KEY` | not set — no model access configured |
| `LEARNING_AGENT_BASE_URL` | not set |
| `LEARNING_AGENT_MODEL` | not set |
| `LEARNING_AGENT_RUNTIME` | not set (defaults documented as `dsh` in `.env.example`) |

## Project dependencies

Two **dev-only** tools are exactly pinned in `package.json` since M1A-V
(`DECISIONS.md` D-0013): `typescript@5.9.3` and `ajv@8.20.0`. There are **no
runtime dependencies**; `dependencies` is empty on purpose. `package-lock.json`
is committed.

Install and verify:

```powershell
npm install
npx --no-install tsc --noEmit        # contract declarations must compile
node tools/contract-tests.mjs        # JSON Schema fixture verification
powershell -NoProfile -ExecutionPolicy Bypass -File tools\check.ps1   # everything
```

### Host-specific npm cache workaround (NOT a project convention)

On **this** machine the default npm cache lives at
`%LOCALAPPDATA%\npm-cache`, which is outside the writable workspace, so
`npm install` fails with:

```
npm error code EPERM
npm error path ...\npm-cache\_cacache\tmp\...
```

This is an environment/sandbox restriction, **not a network or registry
problem** — the registry itself is reachable. The workaround is to point the
cache inside the workspace **for the command being run**:

```powershell
npm install --cache .\.npm-cache
```

`.npm-cache/` is git-ignored, so nothing from it is ever committed. **No
`.npmrc` is committed**, deliberately: forcing a repo-local cache on every other
machine would impose this host's quirk on machines that do not have it. Resolved
package URLs in `package-lock.json` still point at the default public registry.

## Reproducing this record

```powershell
git --version; node --version; npm --version; pnpm --version
python --version; uv --version; dsh --version
npx --no-install tsc --version; node -e "console.log(require('ajv/package.json').version)"
```

## Known drift risks

- DSH is an `alpha` release and is not pinned at M0; it can change without any
  commit here, and the pinning strategy is still undecided
  (`DECISIONS.md` D-0003).
- The implementation language is **decided**: TypeScript for `src/**` and the
  future Obsidian plugin; Python is not a core runtime language
  (`DECISIONS.md` D-0005). The risk is not the choice but that **no TypeScript
  toolchain is installed**, so contract drafts cannot be type-checked.
- `pwsh` is not on this shell's `PATH`; `tools/check.ps1` therefore targets
  Windows PowerShell 5.1 so it stays runnable from a plain `powershell`
  invocation.
- `platform` data is deliberately **not** duplicated into run manifests
  (`RM-21`): a manifest points here via `environmentRef`. If this document
  changes, old manifests point at a different environment. That is a recorded
  trade-off, not an oversight.
