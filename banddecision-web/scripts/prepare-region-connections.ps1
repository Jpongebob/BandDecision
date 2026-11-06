# Stores passwords with Windows DPAPI for this Windows user; makes no DB requests.
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'

function Read-MigrationCredential([string]$Label) {
    Write-Host "$Label project: Connect > Session pooler > URI (port 5432)."
    Write-Host 'Keep [YOUR-PASSWORD] in the URI. Enter the password at the separate hidden prompt.'
    $template = (Read-Host "$Label connection URI").Trim()
    if (-not $template.Contains('[YOUR-PASSWORD]')) {
        throw 'Copy the URI with [YOUR-PASSWORD] still present. Do not paste an actual password in the URI prompt.'
    }
    $parsed = $null
    if (-not [Uri]::TryCreate($template.Replace('[YOUR-PASSWORD]', 'placeholder'), [UriKind]::Absolute, [ref]$parsed)) {
        throw 'Invalid connection URI.'
    }
    if ($parsed.Scheme -notin @('postgres', 'postgresql') -or
        $parsed.Host -notmatch '(^|\.)pooler\.supabase\.com$' -or
        $parsed.Port -ne 5432 -or $parsed.AbsolutePath -ne '/postgres') {
        throw 'Use the Supabase Session pooler URI on port 5432 for database postgres.'
    }
    $password = Read-Host "$Label database password" -AsSecureString
    if ($password.Length -eq 0) { throw 'The database password is empty.' }
    return [PSCredential]::new($template, $password)
}

$appRoot = Split-Path -Parent $PSScriptRoot
$folder = Join-Path $appRoot '.migration\seoul'
$destination = Join-Path $folder 'connections.clixml'
if (Test-Path -LiteralPath $destination) {
    throw 'connections.clixml already exists. Existing connection information was preserved.'
}
$source = Read-MigrationCredential 'OLD Mumbai'
$target = Read-MigrationCredential 'NEW Seoul'
if ($source.UserName -eq $target.UserName) {
    throw 'Source and target are identical. Copy the URI from each separate project.'
}
New-Item -ItemType Directory -Path $folder -Force | Out-Null
[PSCustomObject]@{ Source = $source; Target = $target } |
    Export-Clixml -LiteralPath $destination -NoClobber
Write-Host 'Connection information saved with Windows user encryption. No database was changed.'
Write-Host 'Return to the chat and say: connection information saved.'
