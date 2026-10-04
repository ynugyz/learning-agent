[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$')]
    [string]$Name,

    [Parameter(Mandatory = $true)]
    [string]$Source,

    [ValidateSet('fixture', 'mock', 'real')]
    [string]$Mode = 'fixture',

    [string]$Model = 'gpt-6-luna',

    [ValidateSet('minimal', 'low', 'medium', 'high', 'unspecified')]
    [string]$Reasoning = 'low',

    [string[]]$KnowledgeSnapshot,

    [string]$KnowledgeSnapshotList,

    [string[]]$Stages
)

$ErrorActionPreference = 'Stop'
if ($KnowledgeSnapshotList) { $KnowledgeSnapshot = @($KnowledgeSnapshotList -split '\|') }
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$sourcePath = (Resolve-Path -LiteralPath $Source).Path
$sourceItem = Get-Item -LiteralPath $sourcePath
$runId = '{0}-{1}Z' -f $Name, (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssfff')
$scratchRoot = Join-Path $repoRoot 'scratch\canary'
$runDir = Join-Path $scratchRoot $runId
$copyDir = Join-Path $runDir 'source'
$contextDir = Join-Path $runDir 'context'
$allStages = @('SourceMap', 'LessonModel', 'Alignment')

if ($null -eq $Stages -or $Stages.Count -eq 0) {
    $requestedStages = @($allStages)
} else {
    $requestedStages = @($Stages | ForEach-Object { $_ -split ',' } | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' })
    if ($requestedStages.Count -eq 0) { throw 'Stages must contain at least one stage.' }
    if ($requestedStages.Count -gt $allStages.Count) { throw 'Stages may contain at most SourceMap, LessonModel, Alignment.' }
    for ($index = 0; $index -lt $requestedStages.Count; $index++) {
        if ($allStages -notcontains $requestedStages[$index]) {
            throw "Unknown stage '$($requestedStages[$index])'. Allowed stages: $($allStages -join ', ')."
        }
        if ($requestedStages[$index] -ne $allStages[$index]) {
            throw 'Stages must be a contiguous prefix: SourceMap[,LessonModel[,Alignment]].'
        }
    }
}
$skippedStages = @($allStages | Where-Object { $requestedStages -notcontains $_ })

if ($sourceItem.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Source must not be a reparse point.' }
$pilotVault = Join-Path $repoRoot 'pilot-vault'
if ($sourcePath.StartsWith($pilotVault, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Production/pilot vault sources are not permitted.'
}
if (Test-Path -LiteralPath $runDir) { throw "Run directory already exists: $runDir" }
if ($Model -notmatch '^[A-Za-z0-9._-]+$') { throw 'Model contains unsupported characters.' }

if ($Mode -eq 'real') {
    if ($sourceItem.PSIsContainer -or $sourceItem.Extension -ne '.txt') { throw 'Real mode requires one .txt source file.' }
} else {
    if (-not $sourceItem.PSIsContainer) { throw "$Mode mode requires a fixture directory." }
    $fixtureFiles = @{
        SourceMap = 'source-map.json'
        LessonModel = 'lesson-model.json'
        Alignment = 'alignment.json'
    }
    foreach ($stage in $requestedStages) {
        $required = $fixtureFiles[$stage]
        if (-not (Test-Path -LiteralPath (Join-Path $sourcePath $required) -PathType Leaf)) {
            throw "Source directory must contain $required"
        }
    }
}

New-Item -ItemType Directory -Path $copyDir -Force | Out-Null
if ($Mode -eq 'real') {
    Copy-Item -LiteralPath $sourcePath -Destination (Join-Path $copyDir 'source.txt')
} else {
    Get-ChildItem -LiteralPath $sourcePath -Force | Copy-Item -Destination $copyDir -Recurse -Force
}

$contextInputPath = $null
if ($KnowledgeSnapshot -and $KnowledgeSnapshot.Count -gt 0) {
    New-Item -ItemType Directory -Path $contextDir -Force | Out-Null
    $contextParts = @()
    foreach ($contextPathValue in $KnowledgeSnapshot) {
        $contextPath = (Resolve-Path -LiteralPath $contextPathValue).Path
        $contextItem = Get-Item -LiteralPath $contextPath
        if ($contextItem.PSIsContainer -or $contextItem.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Knowledge snapshot must be a regular file: $contextPath" }
        $safeName = $contextItem.Name -replace '[^A-Za-z0-9._\u4e00-\u9fff-]', '_'
        $contextDestination = Join-Path $contextDir $safeName
        Copy-Item -LiteralPath $contextPath -Destination $contextDestination -Force
        $relativeContext = $contextDestination.Substring($runDir.Length).TrimStart('\', '/').Replace('\', '/')
        $contextParts += "===== $relativeContext =====`r`n$([IO.File]::ReadAllText($contextPath))"
    }
    $contextInputPath = Join-Path $runDir 'alignment-knowledge-context.txt'
    [IO.File]::WriteAllText($contextInputPath, ($contextParts -join "`r`n`r`n"), [Text.UTF8Encoding]::new($false))
}

$gitCommit = (& git -C $repoRoot rev-parse HEAD 2>$null | Select-Object -First 1)
if ($LASTEXITCODE -eq 0 -and $gitCommit) {
    $dirtyPaths = @(& git -C $repoRoot status --porcelain --untracked-files=all | ForEach-Object { $_.Substring(3) })
    $git = @{ availability = 'present'; commit = $gitCommit.Trim(); branch = (& git -C $repoRoot branch --show-current).Trim(); dirty = ($dirtyPaths.Count -gt 0) }
    if ($dirtyPaths.Count -gt 0) { $git.dirtyPaths = $dirtyPaths }
} else {
    $git = @{ availability = 'unavailable'; reason = 'Git repository metadata unavailable.' }
}

$sourceFiles = @(Get-ChildItem -LiteralPath $copyDir -File -Recurse | ForEach-Object {
    $relative = $_.FullName.Substring($copyDir.Length).TrimStart('\', '/').Replace('\', '/')
    @{ kind = 'evidence'; ref = "source/$relative" }
})
if ($contextDir -and (Test-Path -LiteralPath $contextDir)) {
    $sourceFiles += @(Get-ChildItem -LiteralPath $contextDir -File -Recurse | ForEach-Object {
        $relative = $_.FullName.Substring($runDir.Length).TrimStart('\', '/').Replace('\', '/')
        @{ kind = 'evidence'; ref = $relative }
    })
}
$schemaVersions = @{ 'source-map' = '0.1'; 'lesson-model' = '0.1'; alignment = if ($Mode -eq 'real') { '0.2' } else { '0.1' } }
$promptVersions = if ($Mode -eq 'real') { @{ 'canary-source-map' = '1'; 'canary-lesson-model' = '1'; 'canary-alignment' = '1' } } else { @{ 'fixture-replay' = '1' } }
$manifestModel = if ($Mode -eq 'real') {
    @{ requested = $Model; resolved = @{ availability = 'unavailable'; reason = 'Runtime does not report resolved model identity.' } }
} else {
    @{ resolved = @{ availability = 'unavailable'; reason = 'Fixture replay does not invoke a model.' } }
}
$sourceBundle = @{ packageId = $runId; refs = $sourceFiles }
if ($Mode -eq 'real') {
    $sourceBundle.digest = @{ alg = 'sha256'; value = (Get-FileHash -LiteralPath (Join-Path $copyDir 'source.txt') -Algorithm SHA256).Hash.ToLowerInvariant() }
}
$manifest = [ordered]@{
    contractVersion = 'run-manifest/0.1'
    schemaVersion = '0.1'
    status = 'draft'
    runId = $runId
    caseId = @{ availability = 'not-applicable'; reason = 'Exploratory canary run.' }
    startedAt = (Get-Date).ToString('o')
    requestedStages = $requestedStages
    executedStages = @()
    skippedStages = $skippedStages
    git = $git
    runtime = @{ availability = 'present'; requested = @{ kind = if ($Mode -eq 'real') { 'dsh' } else { 'fixture-replay' } }; resolved = @{ kind = if ($Mode -eq 'real') { 'dsh' } else { 'fixture-replay' }; version = if ($Mode -eq 'real') { 'unknown' } else { '1' } }; resolution = if ($Mode -eq 'real') { 'unknown' } else { 'matched' } }
    model = $manifestModel
    versions = @{ prompts = $promptVersions; schemas = $schemaVersions }
    sourceBundle = $sourceBundle
}
if ($Mode -eq 'real') {
    $manifest.reasoning = @{ requested = $Reasoning }
    $manifest.notes = 'See run-report.json for per-stage timing and retry count; RunManifest v0.1 has no fields for these values.'
}
$manifestPath = Join-Path $runDir 'run-manifest.json'
$manifest | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $manifestPath -Encoding UTF8

$runner = Join-Path $PSScriptRoot 'knowledge-compilation-canary.mjs'
$oldDshCli = $env:CANARY_DSH_CLI
$oldDshPackage = $env:CANARY_DSH_PACKAGE
$oldRepoRoot = $env:CANARY_REPO_ROOT
$oldAlignmentContext = $env:CANARY_ALIGNMENT_CONTEXT_FILE
if ($Mode -eq 'real') {
    $env:CANARY_REPO_ROOT = $repoRoot
    $dshCmd = $env:DSH_PATH
    if (-not $dshCmd) {
        $dshCommand = Get-Command dsh.cmd -ErrorAction SilentlyContinue
        if ($dshCommand) { $dshCmd = $dshCommand.Source }
        else { $dshCmd = 'D:\Enviroment\nodejs\dsh.cmd' }
    }
    $nodeRoot = Split-Path -Parent $dshCmd
    $env:CANARY_DSH_CLI = Join-Path $nodeRoot 'node_modules\@deepseek-ai\dsh\lib\bin.js'
    $env:CANARY_DSH_PACKAGE = Join-Path $nodeRoot 'node_modules\@deepseek-ai\dsh\package.json'
    if ($contextInputPath) { $env:CANARY_ALIGNMENT_CONTEXT_FILE = $contextInputPath }
    if (-not (Test-Path -LiteralPath $env:CANARY_DSH_CLI -PathType Leaf)) { throw "DSH CLI entry was not found near $dshCmd" }
}
Push-Location $repoRoot
try {
    & node $runner $runDir $Mode $Model $Reasoning ($requestedStages -join ',')
    $exitCode = $LASTEXITCODE
} finally {
    Pop-Location
    if ($null -eq $oldDshCli) { Remove-Item Env:CANARY_DSH_CLI -ErrorAction SilentlyContinue } else { $env:CANARY_DSH_CLI = $oldDshCli }
    if ($null -eq $oldDshPackage) { Remove-Item Env:CANARY_DSH_PACKAGE -ErrorAction SilentlyContinue } else { $env:CANARY_DSH_PACKAGE = $oldDshPackage }
    if ($null -eq $oldRepoRoot) { Remove-Item Env:CANARY_REPO_ROOT -ErrorAction SilentlyContinue } else { $env:CANARY_REPO_ROOT = $oldRepoRoot }
    if ($null -eq $oldAlignmentContext) { Remove-Item Env:CANARY_ALIGNMENT_CONTEXT_FILE -ErrorAction SilentlyContinue } else { $env:CANARY_ALIGNMENT_CONTEXT_FILE = $oldAlignmentContext }
}
if ($exitCode -ne 0) { exit $exitCode }
exit 0
