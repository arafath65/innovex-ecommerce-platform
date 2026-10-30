#Requires -RunAsAdministrator
$ErrorActionPreference = 'Stop'

try {
    $hostsPath = Join-Path $env:WINDIR 'System32\drivers\etc\hosts'
    $beginMarker = '# BEGIN INNOVEX LOCAL DOMAINS'
    $endMarker = '# END INNOVEX LOCAL DOMAINS'

    $block = @(
        $beginMarker
        '127.0.0.1 innovexweb.test'
        '127.0.0.1 www.innovexweb.test'
        '127.0.0.1 admin.innovexweb.test'
        '127.0.0.1 oscar-trading.test'
        '127.0.0.1 second-store.test'
        $endMarker
    ) -join [Environment]::NewLine

    $current = Get-Content -Path $hostsPath -Raw -ErrorAction Stop
    $pattern = '(?ms)^' + [regex]::Escape($beginMarker) + '.*?^' + [regex]::Escape($endMarker) + '\s*'
    if ([regex]::IsMatch($current, $pattern)) {
        $current = [regex]::Replace($current, $pattern, '')
    }

    $newContent = $current.TrimEnd() + [Environment]::NewLine + [Environment]::NewLine + $block + [Environment]::NewLine
    Set-Content -Path $hostsPath -Value $newContent -Encoding ASCII -ErrorAction Stop

    ipconfig /flushdns | Out-Null
    Write-Host 'Innovex local domains configured successfully.' -ForegroundColor Green
}
catch {
    Write-Error "Failed to configure local domains: $($_.Exception.Message)"
    exit 1
}
