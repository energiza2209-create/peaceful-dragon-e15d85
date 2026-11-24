# Probe Auvo - tasks com paramFilter JSON encoded
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$loginBody = @{ apiKey = "wQ3FBfPB3EgMgUJbK0EXR4rcACt2JWtz"; apiToken = "wQ3FBfPB3Ega672gD3bMSKbcQ4f8714a" } | ConvertTo-Json -Compress
$loginResp = (Invoke-WebRequest -Uri "https://api.auvo.com.br/v2/login" -Method POST -Body $loginBody -ContentType "application/json" -UseBasicParsing -TimeoutSec 15).Content | ConvertFrom-Json
$at = $loginResp.result.accessToken
Write-Host "Token OK"
Write-Host ""

$hdr = @{ Authorization = "Bearer $at" }

# paramFilter como JSON string encoded
$filter = @{ startDate = "2024-08-07"; endDate = "2026-08-07" } | ConvertTo-Json -Compress
$encoded = [System.Uri]::EscapeDataString($filter)
$url = "https://api.auvo.com.br/v2/tasks?paramFilter=$encoded&page=1&pageSize=3"
Write-Host "URL: $url"
Write-Host "Filter JSON: $filter"
Write-Host ""

try {
  $r = Invoke-WebRequest -Uri $url -Method GET -Headers $hdr -UseBasicParsing -TimeoutSec 20
  Write-Host "STATUS: $($r.StatusCode)"
  $c = ($r.Content -replace '\s+',' ')
  Write-Host "RESP (3000 chars):"
  Write-Host $c.Substring(0, [Math]::Min(3000, $c.Length))
} catch {
  Write-Host "ERR: $($_.Exception.Message)"
  if ($_.Exception.Response) {
    try { $s = $_.Exception.Response.GetResponseStream(); $rd = New-Object System.IO.StreamReader($s); Write-Host "BODY: $($rd.ReadToEnd())" } catch {}
  }
}
