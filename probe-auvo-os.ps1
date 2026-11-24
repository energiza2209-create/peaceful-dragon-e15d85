#ä Probe Auvo - GET /serviceorders
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$loginBody = @{ apiKey = "wQ3FBfPB3EgMgUJbK0EXR4rcACt2JWtz"; apiToken = "wQ3FBfPB3Ega672gD3bMSKbcQ4f8714a" } | ConvertTo-Json -Compress
$loginResp = (Invoke-WebRequest -Uri "https://api.auvo.com.br/v2/login" -Method POST -Body $loginBody -ContentType "application/json" -UseBasicParsing -TimeoutSec 15).Content | ConvertFrom-Json
$at = $loginResp.result.accessToken
Write-Host "Token OK"
Write-Host ""

$hdr = @{ Authorization = "Bearer $at"; "Content-Type" = "application/json" }

# Testar GET /serviceorders com poucos itens
$inicio = (Get-Date).AddDays(-730).ToString("yyyy-MM-dd")
$fim = (Get-Date).ToString("yyyy-MM-dd")
$url = "https://api.auvo.com.br/v2/serviceorders?page=1&pageSize=3"
Write-Host "URL: $url"
Write-Host ""

try {
  $r = Invoke-WebRequest -Uri $url -Method GET -Headers $hdr -UseBasicParsing -TimeoutSec 20
  Write-Host "STATUS: $($r.StatusCode)"
  Write-Host "RESP (primeiros 3000 chars):"
  Write-Host $r.Content.Substring(0, [Math]::Min(3000, $r.Content.Length))
} catch {
  Write-Host "ERR: $($_.Exception.Message)"
  if ($_.Exception.Response) {
    try { $s = $_.Exception.Response.GetResponseStream(); $rd = New-Object System.IO.StreamReader($s); Write-Host "BODY: $($rd.ReadToEnd())" } catch {}
  }
}
