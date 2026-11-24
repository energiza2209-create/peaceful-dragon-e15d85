#プローブ Auvo v2 - tarefas endpoints (saída bruta)
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$loginBody = @{ apiKey = "wQ3FBfPB3EgMgUJbK0EXR4rcACt2JWtz"; apiToken = "wQ3FBfPB3Ega672gD3bMSKbcQ4f8714a" } | ConvertTo-Json -Compress
$loginResp = (Invoke-WebRequest -Uri "https://api.auvo.com.br/v2/login" -Method POST -Body $loginBody -ContentType "application/json" -UseBasicParsing -TimeoutSec 15).Content | ConvertFrom-Json
$at = $loginResp.result.accessToken
Write-Host "Token OK"
Write-Host ""

$desde = (Get-Date).AddDays(-7).ToString("yyyy-MM-dd")
$ate = (Get-Date).ToString("yyyy-MM-dd")
$hdr = @{ Authorization = "Bearer $at"; "Content-Type" = "application/json" }

$endpoints = @(
  "https://api.auvo.com.br/v2/tarefas",
  "https://api.auvo.com.br/v2/tarefas/listar",
  "https://api.auvo.com.br/v2/os",
  "https://api.auvo.com.br/v2/ordensservico",
  "https://api.auvo.com.br/v2/servicos",
  "https://api.auvo.com.br/v2/servico",
  "https://api.auvo.com.br/v2/atendimentos"
)

$postBody = @{ appKey = "wQ3FBfPB3EgMgUJbK0EXR4rcACt2JWtz"; dataInicial = "$desde 00:00:00"; dataFinal = "$ate 23:59:59" } | ConvertTo-Json -Compress

foreach ($url in $endpoints) {
  Write-Host "--- $url"
  foreach ($method in @("GET","POST")) {
    try {
      $params = @{ Uri = $url; Method = $method; Headers = $hdr; UseBasicParsing = $true; TimeoutSec = 8 }
      if ($method -eq "POST") { $params.Body = $postBody }
      $r = Invoke-WebRequest @params
      $c = ($r.Content -replace '\s+',' ')
      Write-Host ("  {0} {1} -> {2}" -f $method, $url, $c.Substring(0,[Math]::Min(300,$c.Length)))
    } catch {
      $msg = $_.Exception.Message
      $code = if ($msg -match '\((\d{3})\)') { $matches[1] } else { "?" }
      $bodyResp = ''
      if ($_.Exception.Response) {
        try { $stream = $_.Exception.Response.GetResponseStream(); $reader = New-Object System.IO.StreamReader($stream); $bodyResp = ($reader.ReadToEnd() -replace '\s+',' ') } catch {}
      }
      Write-Host ("  {0} {1} -> ERR {2} [{3}] {4}" -f $method, $url, $code, $msg.Substring(0,[Math]::Min(40,$msg.Length)), $bodyResp.Substring(0,[Math]::Min(300,$bodyResp.Length)))
    }
  }
}
Write-Host "DONE"
