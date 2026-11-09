[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$Candidate,
    [Parameter(Mandatory = $true)][string]$Destination,
    [string]$BackupRoot,
    [switch]$ConfirmWrite
)
$ErrorActionPreference = 'Stop'
if (-not $ConfirmWrite) { throw 'Write is disabled by default. Re-run with -ConfirmWrite after reviewing the candidate.' }
$candidatePath = (Resolve-Path -LiteralPath $Candidate).Path
if ((Get-Item -LiteralPath $candidatePath).PSIsContainer) { throw 'Candidate must be a file.' }
$destinationPath = [IO.Path]::GetFullPath($Destination)
$destinationParent = Split-Path -Parent $destinationPath
if (-not (Test-Path -LiteralPath $destinationParent -PathType Container)) { New-Item -ItemType Directory -Force -Path $destinationParent | Out-Null }
if (-not $BackupRoot) { $BackupRoot = Join-Path (Split-Path -Parent $candidatePath) 'backups' }
$backupDir = Join-Path $BackupRoot (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssfffZ')
if (Test-Path -LiteralPath $destinationPath) {
    New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
    Copy-Item -LiteralPath $destinationPath -Destination (Join-Path $backupDir (Split-Path -Leaf $destinationPath)) -Force
}
Copy-Item -LiteralPath $candidatePath -Destination $destinationPath -Force
[ordered]@{ written=$destinationPath; candidate=$candidatePath; backup=if(Test-Path -LiteralPath $backupDir){$backupDir}else{$null}; productionVaultModified=$true } | ConvertTo-Json -Depth 5
