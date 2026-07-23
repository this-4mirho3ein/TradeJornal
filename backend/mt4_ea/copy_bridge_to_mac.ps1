# Copy MT4 bridge JSON files from Windows Common\Files into the Mac project
# via Parallels Shared Folders (\\Mac\Home\...).
#
# Run in PowerShell on Windows while MT4 + the EA are running.

$ErrorActionPreference = "Continue"

$source = Join-Path $env:APPDATA "MetaQuotes\Terminal\Common\Files\TradeJournal"
$destination = "\\Mac\Home\Desktop\jornal-main\backend\data\mt4_bridge"

Write-Host "Source:      $source"
Write-Host "Destination: $destination"
Write-Host "Copying every 5 seconds. Press Ctrl+C to stop."
Write-Host ""

if (-not (Test-Path $source)) {
  Write-Host "ERROR: Source folder not found. Is TradeJournalBridge.mq4 exporting?"
  exit 1
}

New-Item -ItemType Directory -Force -Path $destination | Out-Null

while ($true) {
  try {
    Copy-Item -Path (Join-Path $source "*.json") -Destination $destination -Force -ErrorAction Stop
    $stamp = Get-Date -Format "HH:mm:ss"
    $files = @(Get-ChildItem -Path $destination -Filter "*.json" -ErrorAction SilentlyContinue)
    Write-Host "[$stamp] synced $($files.Count) file(s)"
  }
  catch {
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] copy failed: $($_.Exception.Message)"
  }
  Start-Sleep -Seconds 5
}
