#ä Probe Auvo - tasks GET com encoding correto
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$loginBody = @{ apiKey = "wQ3FBfPB3EgMgUJbK0EXR4rcACt2JWtz"; apiToken = "wQ3FBfPB3Ega672gD3bMSKbcQ4f8714a" } | ConvertTo-Json -Compress
$loginResp = (Invoke-WebRequest -Uri "https://api.auvo.com.br/v2/login" -Method POST -Body $loginBody -ContentType "application/json" -UseBasicParsing -TimeoutSec 15).Content | ConvertFrom-Json
$at = $loginResp.result.accessToken
Write-Host "Token OK"
Write-Host ""

$hdr = @{ Authorization = "Bearer $at" }

# Usar System.UriBuilder para construir a URL completa
$qs = [System.Web.HttpUtility]::ParseQueryString([string]::Empty)
$qs["startDate"] = "2024-08-07"
$qs["endDate"] = "2026-08-07"
$qs["page"] = "1"
$qs["pageSize"] = "2"
$uri = [System.Uri]"https://api.auvo.com.br/v2/tasks"
$uriBuilder = New-Object System.UriBuilder($uri)
$uriBuilder.Query = $qs.ToString()
$url = $uriBuilder.Uri.AbsoluteUri
Write-Host "URL: $url"

try {
  $r = Invoke-WebRequest -Uri $url -Method GET -Headers $hdr -UseBasicParsing -TimeoutSec 20
  Write-Host ("STATUS: {0}" -f $r.StatusCode)
  $c = ($r.Content -replace '\s+',' ')
  Write-Host "RESP:"
  Write-Host $c.Substring(0, [Math]::Min(2000, $c.Length))
} catch {
  Write-Host "ERR: $($_.Exception.Message)"
  if ($_.Exception.Response) {
    try { $s = $_.Exception.Response.GetResponseStream(); $rd = New-Object System.IO.StreamReader($s); Write-Host "BODY: $($rd.ReadToEnd())" } catch {}
  }
}
