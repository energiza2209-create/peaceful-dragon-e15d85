#ä Probe Auvo - tasks com data
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$loginBody = @{ apiKey = "wQ3FBfPB3EgMgUJbK0EXR4rcACt2JWtz"; apiToken = "wQ3FBfPB3Ega672gD3bMSKbcQ4f8714a" } | ConvertTo-Json -Compress
$loginResp = (Invoke-WebRequest -Uri "https://api.auvo.com.br/v2/login" -Method POST -Body $loginBody -ContentType "application/json" -UseBasicParsing -TimeoutSec 15).Content | ConvertFrom-Json
$at = $loginResp.result.accessToken
Write-Host "Token OK"
Write-Host ""

$hdr = @{ Authorization = "Bearer $at"; "Content-Type" = "application/json" }

# Datas em varios formatos
$tests = @(
  @{ name="tasks 2y AAAA-MM-DD";          url="https://api.auvo.com.br/v2/tasks?startDate=2024-08-07&endDate=2026-08-07&page=1&pageSize=2" },
  @{ name="tasks 2y AAAA-MM-ddTHH:mm:ss";  url="https://api.auvo.com.br/v2/tasks?startDate=2024-08-07T00:00:00&endDate=2026-08-07T23:59:59&page=1&pageSize=2" },
  @{ name="tasks 2y com espaco";           url='https://api.auvo.com.br/v2/tasks?startDate=2024-08-07 00:00:00&endDate=2026-08-07 23:59:59&page=1&pageSize=2' },
  @{ name="tasks 2y POST";                 url="https://api.auvo.com.br/v2/tasks"; method="POST"; body='{"startDate":"2024-08-07","endDate":"2026-08-07","page":1,"pageSize":2,"orientation":"asc"}' },
  @{ name="tasks 2y POST orient";          url="https://api.auvo.com.br/v2/tasks"; method="POST"; body='{"startDate":"2024-08-07 00:00:00","endDate":"2026-08-07 23:59:59","page":1,"pageSize":2,"orientation":"Asc"}' }
)

foreach ($t in $tests) {
  $url = $t.url
  $method = if ($t.method) { $t.method } else { "GET" }
  Write-Host "===== $($t.name): $method"
  try {
    $params = @{ Uri = $url; Method = $method; Headers = $hdr; UseBasicParsing = $true; TimeoutSec = 15 }
    if ($t.body) { $params.Body = $t.body }
    $r = Invoke-WebRequest @params
    $c = ($r.Content -replace '\s+',' ')
    Write-Host ("  OK {0} -> {1}" -f $r.StatusCode, $c.Substring(0,[Math]::Min(1500,$c.Length)))
  } catch {
    $msg = $_.Exception.Message
    $code = if ($msg -match '\((\d{3})\)') { $matches[1] } else { "?" }
    $body = ''
    if ($_.Exception.Response) {
      try { $s = $_.Exception.Response.GetResponseStream(); $rd = New-Object System.IO.StreamReader($s); $body = ($rd.ReadToEnd() -replace '\s+',' ') } catch {}
    }
    Write-Host ("  ERR {0} -> {1} | {2}" -f $code, $body.Substring(0,[Math]::Min(500,$body.Length)), $msg.Substring(0,[Math]::Min(50,$msg.Length)))
  }
}
Write-Host "DONE"
