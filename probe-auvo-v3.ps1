#ä Probe Auvo - buscar endpoint de listar atendimentos/tarefas
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$loginBody = @{ apiKey = "wQ3FBfPB3EgMgUJbK0EXR4rcACt2JWtz"; apiToken = "wQ3FBfPB3Ega672gD3bMSKbcQ4f8714a" } | ConvertTo-Json -Compress
$loginResp = (Invoke-WebRequest -Uri "https://api.auvo.com.br/v2/login" -Method POST -Body $loginBody -ContentType "application/json" -UseBasicParsing -TimeoutSec 15).Content | ConvertFrom-Json
$at = $loginResp.result.accessToken
Write-Host "Token OK"
Write-Host ""

$desde = (Get-Date).AddDays(-30).ToString("yyyy-MM-dd")
$ate = (Get-Date).ToString("yyyy-MM-dd")
$hdr = @{ Authorization = "Bearer $at"; "Content-Type" = "application/json" }

$candidatos = @(
  "atendimento",
  "atendimentos",
  "Atendimento",
  "Atendimentos",
  "atendimento/listar",
  "atendimentos/listar",
  "Atendimento/Listar",
  "atividade",
  "atividades",
  "Atividade",
  "Atividades",
  "atividades/listar",
  "agenda",
  "agendamentos",
  "visita",
  "visitas",
  "Visit",
  "Tarefa",
  "Tarefas",
  "OrdemServico",
  "OrdemServicos",
  "ordemServico",
  "ordemservico",
  "OS",
  "Os",
  "o",
  "protocolo",
  "protocolos"
)

foreach ($path in $candidatos) {
  $url = "https://api.auvo.com.br/v2/$path"
  foreach ($method in @("GET","POST")) {
    try {
      $params = @{ Uri = $url; Method = $method; Headers = $hdr; UseBasicParsing = $true; TimeoutSec = 6 }
      if ($method -eq "POST") {
        $params.Body = @{ appKey = "wQ3FBfPB3EgMgUJbK0EXR4rcACt2JWtz"; dataInicial = "$desde 00:00:00"; dataFinal = "$ate 23:59:59" } | ConvertTo-Json -Compress
      }
      $r = Invoke-WebRequest @params
      $c = ($r.Content -replace '\s+',' ')
      Write-Host ("OK {0} {1} -> {2} {3}" -f $method, $url, $r.StatusCode, $c.Substring(0,[Math]::Min(200,$c.Length)))
    } catch {
      $msg = $_.Exception.Message
      $code = if ($msg -match '\((\d{3})\)') { $matches[1] } else { "?" }
      $body = ''
      if ($_.Exception.Response) {
        try { $s = $_.Exception.Response.GetResponseStream(); $r = New-Object System.IO.StreamReader($s); $body = ($r.ReadToEnd() -replace '\s+',' ') } catch {}
      }
      if ($body -notmatch '<!DOCTYPE' -and $body.Length -gt 0) {
        $msg2 = if ($body) { $body.Substring(0,[Math]::Min(160,$body.Length)) } else { $msg.Substring(0,40) }
        Write-Host ("ERR{0} {1} {2} -> {3}" -f $code, $method, $url, $msg2)
      }
    }
  }
}
Write-Host "DONE"
