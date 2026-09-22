<#
.SYNOPSIS
    Non-destructive sanity checks for the Learning Agent repository.

.DESCRIPTION
    Validates the repository skeleton, secret hygiene, schema well-formedness
    and Git ignore behaviour. Performs NO writes, NO network access and NO Git
    mutations. Targets Windows PowerShell 5.1 (pwsh is not on PATH on the M0
    host).

.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File tools\check.ps1
#>
[CmdletBinding()]
param(
    # Default to the repository root, i.e. the parent of this script's directory.
    # $PSScriptRoot is not reliable while parameters are being bound under
    # `powershell -File`, so derive it from the invocation path instead.
    [string] $RepoRoot
)

if (-not $RepoRoot) {
    $scriptPath = $MyInvocation.MyCommand.Path
    if (-not $scriptPath) { $scriptPath = $PSCommandPath }
    if (-not $scriptPath) {
        Write-Error 'Cannot determine the repository root; pass -RepoRoot explicitly.'
        exit 2
    }
    $RepoRoot = Split-Path -Parent (Split-Path -Parent $scriptPath)
}
$RepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path

$ErrorActionPreference = 'Stop'
$script:Failures = 0
$script:Warnings = 0

function Write-Section {
    param([string] $Title)
    Write-Host ''
    Write-Host "== $Title ==" -ForegroundColor Cyan
}

function Test-Pass {
    param([string] $Message)
    Write-Host "  PASS  $Message" -ForegroundColor Green
}

function Test-Fail {
    param([string] $Message)
    $script:Failures++
    Write-Host "  FAIL  $Message" -ForegroundColor Red
}

function Test-Warn {
    param([string] $Message)
    $script:Warnings++
    Write-Host "  WARN  $Message" -ForegroundColor Yellow
}

function Test-Info {
    param([string] $Message)
    Write-Host "  INFO  $Message" -ForegroundColor Gray
}

function Test-GitIgnored {
    <# Returns $true when Git's ignore RULES cover the given repo-relative path.
       Uses `--no-index` deliberately: without it, `git check-ignore` reports
       "not ignored" for any path already in the index, so the answer would
       depend on staging state instead of the rules. #>
    param([string] $RelativePath)
    & git check-ignore -q --no-index -- $RelativePath 2>$null | Out-Null
    return ($LASTEXITCODE -eq 0)
}

function Invoke-Git {
    <# Runs git in the current directory, returning trimmed stdout and setting
       $script:LastGitExitCode. Stderr is discarded on purpose: this script must
       never echo a git message that could contain local paths or values. #>
    param([string[]] $Arguments)
    $out = & git @Arguments 2>$null
    $script:LastGitExitCode = $LASTEXITCODE
    if ($null -eq $out) { return @() }
    return @($out | ForEach-Object { "$_" })
}

# Secret-like content patterns. Deliberately conservative: this is a heuristic,
# not proof of cleanliness. Only matched file paths are ever printed — never a
# matched value.
$script:SecretPatterns = @(
    @{ Name = 'private key block'; Pattern = '-----BEGIN [A-Z ]*PRIVATE KEY-----' },
    @{ Name = 'OpenAI-style key'; Pattern = 'sk-[A-Za-z0-9_\-]{20,}' },
    @{ Name = 'Anthropic-style key'; Pattern = 'sk-ant-[A-Za-z0-9_\-]{20,}' },
    @{ Name = 'GitHub token'; Pattern = 'gh[pousr]_[A-Za-z0-9]{30,}' },
    @{ Name = 'AWS access key id'; Pattern = 'AKIA[0-9A-Z]{16}' },
    @{ Name = 'Google API key'; Pattern = 'AIza[0-9A-Za-z_\-]{30,}' },
    @{ Name = 'Slack token'; Pattern = 'xox[baprs]-[A-Za-z0-9\-]{10,}' },
    @{ Name = 'non-empty assignment to *_KEY/*_TOKEN/*_SECRET'; Pattern = '(?i)(API_KEY|ACCESS_TOKEN|AUTH_TOKEN|CLIENT_SECRET|PASSWORD)\s*[=:]\s*["'']?[A-Za-z0-9_\-]{16,}' }
)

# Files that carry real credentials and must therefore never be committed.
# Their presence in the working tree is normal and expected.
$script:LocalSecretFileNames = @('.env', '.env.local', '.env.production', 'credentials.json')

function Get-ScannableExtensions { return @(
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.pdf', '.zip', '.gz',
    '.7z', '.woff', '.woff2', '.ttf', '.otf', '.mp3', '.mp4', '.wav', '.db',
    '.sqlite', '.exe', '.dll', '.asar'
) }

function Get-CommitCandidateFiles {
    <# Returns the repository-relative paths that Git would actually commit or
       already tracks: tracked/staged files plus untracked files that are NOT
       ignored. Ignored local files (a real .env) are deliberately excluded —
       they are supposed to exist on this machine and are not part of the
       change set. Must be called with the working directory inside the repo. #>
    $tracked = Invoke-Git @('ls-files', '--cached')
    $untracked = Invoke-Git @('ls-files', '--others', '--exclude-standard', '--', '.')
    # NOTE: `@($tracked) + @($untracked)` is required. PowerShell's `+` on two
    # single-element results is string concatenation, which silently produced
    # '.env.gitignore' instead of two paths.
    $all = @(@($tracked) + @($untracked)) |
        Where-Object { $_ -and $_.Trim().Length -gt 0 } |
        ForEach-Object { $_.Trim() } |
        Sort-Object -Unique
    return @($all)
}

function Test-SecretContent {
    <# Scans the given repo-relative paths for secret-like content. Returns a
       list of "path (pattern name)" strings. Never returns or prints a
       matched value. #>
    param([string[]] $RelativePaths)

    $binaryExtensions = Get-ScannableExtensions
    $findings = New-Object System.Collections.ArrayList
    $scanned = 0

    foreach ($rel in $RelativePaths) {
        $full = Join-Path (Get-Location).Path $rel
        if (-not (Test-Path -LiteralPath $full -PathType Leaf)) { continue }
        $item = Get-Item -LiteralPath $full -ErrorAction SilentlyContinue
        if ($null -eq $item) { continue }
        if ($binaryExtensions -contains $item.Extension.ToLowerInvariant()) { continue }
        if ($item.Length -ge 2MB) { continue }

        $content = $null
        try { $content = Get-Content -LiteralPath $full -Raw -ErrorAction Stop } catch { continue }
        if ([string]::IsNullOrEmpty($content)) { continue }
        $scanned++

        foreach ($sp in $script:SecretPatterns) {
            if ($content -match $sp.Pattern) {
                # Report the location only. Values must never reach the output.
                $null = $findings.Add(("{0} ({1})" -f $rel, $sp.Name))
            }
        }
    }

    return @{
        Findings = @($findings)
        Scanned  = $scanned
    }
}

function Test-SecretHygieneSelfTest {
    <# Self-test for the secret hygiene logic, run in an isolated throwaway Git
       repository. Proves the three behaviours this check exists for:
         (1) a local ignored .env must NOT fail the scan;
         (2) a .env that is staged/tracked MUST fail;
         (3) secret-like content in a tracked file MUST fail.
       Touches only $env:TEMP; the real repository is never modified.
       Returns $true when every assertion behaves as expected. #>
    $ok = $true
    $probe = Join-Path $env:TEMP ("la-secret-probe-" + [Guid]::NewGuid().ToString('N'))
    # Shaped like a real key so only the pattern scan can find it, never a
    # human reader of this script.
    $sampleSecret = 'API_KEY=' + ('A' * 32)

    try {
        $null = New-Item -ItemType Directory -Path $probe -Force
        Set-Content -LiteralPath (Join-Path $probe '.gitignore') -Value ".env`ncredentials.json" -Encoding ASCII
        Set-Content -LiteralPath (Join-Path $probe '.env') -Value $sampleSecret -Encoding ASCII

        Push-Location $probe
        try {
            $null = Invoke-Git @('init', '-b', 'main')
            if ($script:LastGitExitCode -ne 0) {
                Test-Warn 'self-test: could not create a probe Git repository'
                return $false
            }

            # (1) a local, correctly ignored .env must be ignored AND excluded
            #     from the commit-candidate set, and must not fail anything.
            $ignoredEnv = Test-GitIgnored '.env'
            if ($ignoredEnv) { Test-Pass 'self-test: local .env is reported as ignored' }
            else { Test-Fail 'self-test: local .env was not reported as ignored'; $ok = $false }

            $candidates = Get-CommitCandidateFiles
            if ($candidates -notcontains '.env') { Test-Pass 'self-test: ignored .env is excluded from commit candidates' }
            else { Test-Fail 'self-test: ignored .env appeared in commit candidates'; $ok = $false }

            # (2) once staged, the same file must be caught.
            $null = Invoke-Git @('add', '--force', '--', '.env')
            $candidates = Get-CommitCandidateFiles
            if ($candidates -contains '.env') { Test-Pass 'self-test: staged .env is caught as a commit candidate' }
            else { Test-Fail 'self-test: staged .env was NOT caught'; $ok = $false }

            $stagedSecretFiles = Get-TrackedSecretFiles
            if ($stagedSecretFiles -contains '.env') { Test-Pass 'self-test: staged .env fails the tracked-file check' }
            else { Test-Fail 'self-test: staged .env did NOT fail the tracked-file check'; $ok = $false }

            # (3) secret-like content in a tracked file must be detected.
            $scan = Test-SecretContent @('.env')
            if ($scan.Findings.Count -gt 0) { Test-Pass 'self-test: secret-like content is detected by the scanner' }
            else { Test-Fail 'self-test: secret-like content was NOT detected'; $ok = $false }
            if ($scan.Findings.Count -gt 0 -and $scan.Findings[0] -notmatch [regex]::Escape('A' * 32)) {
                Test-Pass 'self-test: findings report locations, not secret values'
            }
            else {
                Test-Fail 'self-test: a finding leaked part of the secret value'
                $ok = $false
            }
        }
        finally {
            Pop-Location
        }
    }
    catch {
        Test-Warn "self-test skipped: $($_.Exception.Message)"
        return $false
    }
    finally {
        if (Test-Path -LiteralPath $probe) {
            Remove-Item -LiteralPath $probe -Recurse -Force -ErrorAction SilentlyContinue
        }
    }

    return $ok
}

function Get-TrackedSecretFiles {
    <# Returns the repo-relative paths of tracked/staged files that carry real
       credentials. These must never be committed; their existence in the local
       working tree is fine as long as Git ignores them. #>
    $hits = @()
    foreach ($rel in (Get-CommitCandidateFiles)) {
        $leaf = Split-Path -Leaf $rel
        if ($script:LocalSecretFileNames -contains $leaf) { $hits += $rel }
        # Also catch credential JSON nested anywhere in the tree.
        elseif ($rel -match '(^|/)(credentials|service-account)[^/]*\.json$') { $hits += $rel }
    }
    return @($hits | Sort-Object -Unique)
}

# ---------------------------------------------------------------- 1. skeleton
Write-Section 'Repository skeleton'

$requiredFiles = @(
    'AGENTS.md',
    'README.md',
    '.gitignore',
    '.gitattributes',
    '.editorconfig',
    '.env.example',
    'docs/ARCHITECTURE.md',
    'docs/DECISIONS.md',
    'docs/ERROR_TAXONOMY.md',
    'docs/ENVIRONMENT.md',
    'docs/reviews/M1A_CONTRACT_CHALLENGE.md',
    'specs/README.md',
    'specs/semantic-card-v0.1.md',
    'specs/source-map-v0.1.md',
    'specs/agent-runtime-v0.1.md',
    'specs/run-manifest-v0.1.md',
    'schemas/README.md',
    'schemas/semantic-card.v0.1.schema.json',
    'schemas/source-map.v0.1.schema.json',
    'schemas/agent-runtime.v0.1.schema.json',
    'schemas/run-manifest.v0.1.schema.json',
    'schemas/archive/m0-draft/source-map.schema.json',
    'schemas/archive/m0-draft/lesson-model.schema.json',
    'schemas/archive/m0-draft/semantic-card.schema.json',
    'prompts/README.md',
    'package.json',
    'tsconfig.json',
    'src/README.md',
    'src/contracts/README.md',
    'src/contracts/index.ts',
    'src/contracts/semantic-card.ts',
    'src/contracts/source-map.ts',
    'src/contracts/agent-runtime.ts',
    'src/contracts/run-manifest.ts',
    'src/core/README.md',
    'src/pipeline/README.md',
    'src/modules/README.md',
    'src/runtime/README.md',
    'src/runtime/dsh/README.md',
    'benchmark/README.md',
    'benchmark/cases/README.md',
    'benchmark/gold/README.md',
    'benchmark/results/README.md',
    'test-vault/README.md',
    'test-vault/.learning-agent/README.md',
    'runs/README.md',
    'obsidian-plugin/README.md',
    'tools/README.md',
    'tools/check.ps1'
)

foreach ($rel in $requiredFiles) {
    $full = Join-Path $RepoRoot $rel
    if (Test-Path -LiteralPath $full -PathType Leaf) {
        Test-Pass $rel
    }
    else {
        Test-Fail "missing file: $rel"
    }
}

# ----------------------------------------------------------- 2. secret hygiene
Write-Section 'Secret hygiene'

# Local secret files are expected to EXIST on a developer machine. What matters
# is that Git ignores them and that they are not part of the change set. No
# secret value is ever printed by any check below.

$gitDir = Join-Path $RepoRoot '.git'

if (Test-Path -LiteralPath $gitDir) {
    Push-Location $RepoRoot
    try {
        # (a) the .gitignore RULES must cover credential files. Verified against
        #     probe paths, not against the real files: `git check-ignore` always
        #     reports "not ignored" for a path that is already in the index,
        #     because Git skips ignore rules for tracked files. Using the real
        #     file here would produce a misleading failure for the very
        #     situation this check exists to catch.
        if (Test-GitIgnored '.env') { Test-Pass 'ignore rule covers .env' }
        else { Test-Fail 'ignore rule does NOT cover .env' }

        $dotEnvProbePath = '$env:TEMP\.env.probe'
        if (Test-GitIgnored "$dotEnvProbePath") { Test-Pass "ignore rule covers $dotEnvProbePath" }
        else { Test-Fail "ignore rule does NOT cover $dotEnvProbePath" }

        # (b) if a real credential file exists locally, report whether the rules
        #     cover it. Its presence is normal and expected here — the hard
        #     requirement is (c) below, that it is never tracked.
        foreach ($name in $script:LocalSecretFileNames) {
            $full = Join-Path $RepoRoot $name
            if (-not (Test-Path -LiteralPath $full -PathType Leaf)) { continue }
            if ((Get-CommitCandidateFiles) -contains $name) {
                Test-Info "local $name is tracked or staged; see the check below"
            }
            elseif (Test-GitIgnored $name) { Test-Pass "local $name exists and is git-ignored (expected)" }
            else { Test-Warn "local $name exists and no ignore rule covers it" }
        }

        # (c) they must never be tracked or staged.
        $trackedSecretFiles = Get-TrackedSecretFiles
        if ($trackedSecretFiles.Count -eq 0) { Test-Pass 'no credential file is tracked or staged' }
        else {
            foreach ($rel in $trackedSecretFiles) { Test-Fail "credential file is tracked/staged: $rel" }
        }

        # (c) scan what Git would actually commit — tracked/staged plus
        #     untracked-but-not-ignored files. Ignored local secrets are out of
        #     scope here by design.
        $candidates = Get-CommitCandidateFiles
        $scan = Test-SecretContent $candidates
        Test-Info "$($scan.Scanned) commit-candidate text file(s) scanned (of $($candidates.Count) candidates)"
        if ($scan.Findings.Count -eq 0) { Test-Pass 'no secret-like content in commit candidates' }
        else {
            foreach ($finding in $scan.Findings) { Test-Fail "possible secret: $finding" }
        }
    }
    finally {
        Pop-Location
    }
}
else {
    $untrackedScan = Test-SecretContent @(Get-ChildItem -LiteralPath $RepoRoot -Recurse -File -Force |
        Where-Object { $_.FullName -notlike '*\.git\*' } |
        ForEach-Object { $_.FullName.Substring($RepoRoot.Length).TrimStart('\', '/') })
    Test-Warn 'not a Git repository; only a working-tree scan was possible'
    if ($untrackedScan.Findings.Count -eq 0) { Test-Pass 'no secret-like content found in the working tree' }
    else {
        foreach ($finding in $untrackedScan.Findings) { Test-Fail "possible secret: $finding" }
    }
}

# (d) self-test: prove the logic above distinguishes "ignored" from "staged".
Write-Section 'Secret hygiene self-test (isolated temp repository)'
$selfTestPassed = Test-SecretHygieneSelfTest
if (-not $selfTestPassed) {
    Test-Fail 'secret hygiene self-test did not pass'
}
else {
    Test-Pass 'secret hygiene self-test passed'
}

# ------------------------------------------------- 3b. TypeScript contract drafts
Write-Section 'TypeScript contract drafts'

$contractDir = Join-Path $RepoRoot 'src\contracts'
if (-not (Test-Path -LiteralPath $contractDir)) {
    Test-Warn 'src/contracts does not exist (M1A contracts absent)'
}
else {
    $contractFiles = @(Get-ChildItem -LiteralPath $contractDir -Filter '*.ts' -File -ErrorAction SilentlyContinue)
    Test-Info "$($contractFiles.Count) contract type file(s)"

    foreach ($cf in $contractFiles) {
        $text = Get-Content -LiteralPath $cf.FullName -Raw
        if ($text -match 'NOT IMPLEMENTATION-STABLE') { Test-Pass "$($cf.Name) carries the NOT IMPLEMENTATION-STABLE marker" }
        else { Test-Fail "$($cf.Name) is missing the NOT IMPLEMENTATION-STABLE marker" }
    }
}

# Dependency boundary: core, pipeline, modules and contracts must never IMPORT
# the DSH adapter. This is the machine-checkable half of ARCHITECTURE.md §4.
#
# The pattern deliberately matches real module references only
# (`from '...'` / `import('...')` / `require('...')`). A prose mention such as
# "must not import src/runtime/dsh" inside a doc comment is documentation of the
# rule, not a violation of it.
$boundaryDirs = @('src\contracts', 'src\core', 'src\pipeline', 'src\modules')
$boundaryViolations = @()
$boundaryPattern = "(from|import|require)\s*\(?\s*['""][^'""]*(runtime/dsh|@deepseek-ai)"
foreach ($rel in $boundaryDirs) {
    $dir = Join-Path $RepoRoot $rel
    if (-not (Test-Path -LiteralPath $dir)) { continue }
    $tsFiles = @(Get-ChildItem -LiteralPath $dir -Filter '*.ts' -File -Recurse -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -notlike '*node_modules*' })
    if ($tsFiles.Count -eq 0) { continue }
    $hits = @(Select-String -Path $tsFiles.FullName -Pattern $boundaryPattern -ErrorAction SilentlyContinue)
    foreach ($h in $hits) { $boundaryViolations += $h }
}
if ($boundaryViolations.Count -eq 0) {
    Test-Pass 'no core/pipeline/modules/contracts file imports the DSH adapter'
}
else {
    foreach ($v in $boundaryViolations) { Test-Fail "DSH import outside the adapter: $($v.Filename):$($v.LineNumber)" }
}

# ------------------------------------------------------------ 3. JSON schemas
Write-Section 'Schema well-formedness'

# Live schemas only. Everything under schemas/archive/ is a superseded draft kept
# for historical comparison and must never be validated as a current contract.
$schemaDir = Join-Path $RepoRoot 'schemas'
$schemaFiles = @(Get-ChildItem -LiteralPath $schemaDir -Filter '*.schema.json' -File -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notlike '*\archive\*' })

if ($schemaFiles.Count -eq 0) {
    Test-Warn 'no live schema files found'
}
else {
    foreach ($sf in $schemaFiles) {
        try {
            $parsed = Get-Content -LiteralPath $sf.FullName -Raw | ConvertFrom-Json
            if ($null -eq $parsed.'$schema') { Test-Warn "$($sf.Name): no `$schema key" }
            elseif ($null -eq $parsed.'$id') { Test-Warn "$($sf.Name): no `$id key" }
            elseif ($parsed.'$comment' -notmatch 'DRAFT') {
                # A schema without a DRAFT marker has been (or will be) mistaken
                # for a stable contract. This is a review-gated change.
                Test-Fail "$($sf.Name): not marked DRAFT, but no schema is stable yet"
            }
            else {
                Test-Pass "$($sf.Name) parses and is marked DRAFT"
            }
        }
        catch {
            Test-Fail "$($sf.Name) is not valid JSON: $($_.Exception.Message)"
        }
    }
}

$archiveDir = Join-Path $schemaDir 'archive\m0-draft'
if (Test-Path -LiteralPath $archiveDir) {
    $archived = @(Get-ChildItem -LiteralPath $archiveDir -Filter '*.schema.json' -File -ErrorAction SilentlyContinue)
    Test-Info "$($archived.Count) superseded M0 draft schema(s) archived (not validated as live)"
}

# --------------------------------------------------- 4. line-ending policy
Write-Section 'Line-ending policy'

$gitattributesPath = Join-Path $RepoRoot '.gitattributes'
if (Test-Path -LiteralPath $gitattributesPath) {
    $attrs = Get-Content -LiteralPath $gitattributesPath -Raw
    if ($attrs -match '(?m)^\*\s+text=auto') { Test-Pass 'text files normalized to LF by default' }
    else { Test-Warn '.gitattributes does not normalize text files by default' }
    if ($attrs -match '(?m)^\*\.ps1\s+text\s+eol=crlf') { Test-Pass 'PowerShell scripts pinned to CRLF' }
    else { Test-Warn 'PowerShell scripts are not pinned to CRLF; PS 5.1 expects CRLF' }
}
else {
    Test-Fail '.gitattributes missing'
}

# ---------------------------------------------------- 5. ignore policy behaves
Write-Section 'Ignore policy behaviour'

# `.env` and credential-file ignoring is verified in the Secret hygiene section
# above, because "a local secret file exists and is ignored" is the expected
# state rather than a failure. This section covers the remaining repo-specific
# ignore rules.
if (Test-Path -LiteralPath $gitDir) {
    Push-Location $RepoRoot
    try {
        if (Test-GitIgnored '.env.example') { Test-Fail '.env.example is ignored but must be committed' } else { Test-Pass '.env.example is tracked (not ignored)' }

        if (Test-GitIgnored 'runs/example-case/2026-01-01T00-00-00/run.json') { Test-Pass 'generated run output is git-ignored' } else { Test-Fail 'generated run output would be committed' }

        if (Test-GitIgnored 'test-vault/notes/example.md') { Test-Pass 'test-vault note content is git-ignored' } else { Test-Fail 'test-vault note content would be committed' }

        if (Test-GitIgnored 'test-vault/.learning-agent/semantic-cards.json') { Test-Fail 'test-vault machine layer is ignored but must be tracked' } else { Test-Pass 'test-vault machine layer is tracked' }
    }
    finally {
        Pop-Location
    }
}
else {
    Test-Warn 'not a Git repository; ignore policy not verified'
}

# ----------------------------------------------------- 6. scope / dependency
Write-Section 'Milestone scope and dependencies'

# M1A added a package.json scaffold under DECISIONS.md D-0005 (TypeScript).
# The decision explicitly installs nothing, so the scaffold must stay
# dependency-free and must not ship a lockfile it cannot reproduce.
$pkgPath = Join-Path $RepoRoot 'package.json'
if (Test-Path -LiteralPath $pkgPath) {
    try {
        $pkg = Get-Content -LiteralPath $pkgPath -Raw | ConvertFrom-Json
        $depCount = 0
        foreach ($bucket in @('dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies')) {
            $value = $pkg.$bucket
            if ($null -ne $value) { $depCount += @($value.PSObject.Properties).Count }
        }
        if ($depCount -eq 0) { Test-Pass 'package.json exists with zero dependencies (design-only scaffold)' }
        else { Test-Warn "package.json declares $depCount dependency slot(s); verify DECISIONS.md D-0005 and commit a lockfile" }
    }
    catch { Test-Warn "package.json is not valid JSON: $($_.Exception.Message)" }

    foreach ($lock in @('package-lock.json', 'pnpm-lock.yaml', 'yarn.lock')) {
        if (Test-Path -LiteralPath (Join-Path $RepoRoot $lock)) {
            Test-Info "$lock present (required once real dependencies are installed)"
        }
    }
}

foreach ($manifest in @('pyproject.toml', 'requirements.txt')) {
    if (Test-Path -LiteralPath (Join-Path $RepoRoot $manifest)) {
        Test-Warn "$manifest present, but D-0005 rules Python out of the core runtime"
    }
}

foreach ($outOfScope in @('main.js', 'manifest.json')) {
    $hit = Get-ChildItem -LiteralPath $RepoRoot -Recurse -Force -File -Filter $outOfScope -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -like '*obsidian-plugin*' }
    if ($hit) { Test-Warn "obsidian-plugin build artifact present: $($hit[0].Name) (out of scope for this milestone)" }
}
Test-Pass 'milestone scope check complete'

# ----------------------------------------------------------- 7. Git status
Write-Section 'Git status'

if (Test-Path -LiteralPath $gitDir) {
    Push-Location $RepoRoot
    try {
        # A repository with no commits yet makes `rev-parse HEAD` fail loudly,
        # so probe for HEAD deliberately instead of trusting stderr.
        $null = & git rev-parse --verify --quiet HEAD 2>&1
        $hasCommits = ($LASTEXITCODE -eq 0)

        if ($hasCommits) {
            $branch = (& git rev-parse --abbrev-ref HEAD 2>$null | Out-String).Trim()
            $commitCount = (& git rev-list --count HEAD 2>$null | Out-String).Trim()
            Test-Info "branch: $branch"
            Test-Info "commits: $commitCount"
        }
        else {
            $branch = (& git branch --show-current 2>$null | Out-String).Trim()
            Test-Info "branch: $branch (unborn)"
            Test-Info "$branch has no commits yet (expected while M0 awaits approval)"
        }

        $status = @(& git status --short 2>$null)
        if ($status.Count -eq 0) { Test-Info 'working tree clean' }
        else {
            Test-Info "$($status.Count) changed/untracked entries"
            $status | ForEach-Object { Write-Host "        $_" -ForegroundColor Gray }
        }
    }
    finally {
        Pop-Location
    }
}
else {
    Test-Warn 'not a Git repository'
}

# ------------------------------------------------------------- 8. summary
Write-Section 'Summary'
if ($script:Failures -gt 0) {
    Write-Host "  RESULT: FAILED ($script:Failures failure(s), $script:Warnings warning(s))" -ForegroundColor Red
    exit 1
}
Write-Host "  RESULT: PASSED ($script:Warnings warning(s))" -ForegroundColor Green
exit 0
