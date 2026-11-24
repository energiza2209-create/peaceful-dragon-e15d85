#ä Probe Auvo - explorar shape de O.S. e validar token
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$loginBody = @{ apiKey = "wQ3FBfPB3EgMgUJbK0EXR4rcACt2JWtz"; apiToken = "wQ3FBfPB3Ega672gD3bMSKbcQ4f8714a" } | ConvertTo-Json -Compress
$loginResp = (Invoke-WebRequest -Uri "https://api.auvo.com.br/v2/login" -Method POST -Body $loginBody -ContentType "application/json" -UseBasicParsing -TimeoutSec 15).Content | ConvertFrom-Json
$at = $loginResp.result.accessToken
Write-Host "Token OK"
Write-Host ""

$hdr = @{ Authorization = "Bearer $at"; "Content-Type" = "application/json" }

# Testar varios endpoints pra ver qual retorna dados
$tests = @(
  @{ name="OS sem filtro";       url="https://api.auvo.com.br/v2/serviceorders?page=1&pageSize=2" },
  @{ name="OS paramFilter vazio"; url="https://api.auvo.com.br/v2/serviceorders?page=1&pageSize=2&paramFilter={}" },
  @{ name="OS paramFilter JSON";  url='https://api.auvo.com.br/v2/serviceorders?page=1&pageSize=2&paramFilter={"paramFilter":{}}' },
  @{ name="Tarefas GET";          url="https://api.auvo.com.br/v2/tasks?page=1&pageSize=2" },
  @{ name="Tarefas POST";         url="https://api.auvo.com.br/v2/tasks"; method="POST"; body='{"page":1,"pageSize":2}' },
  @{ name="Clientes";             url="https://api.auvo.com.br/v2/clients?page=1&pageSize=2" },
  @{ name="Equipamentos";         url="https://api.auvo.com.br/v2/equipments?page=1&pageSize=2" },
  @{ name="Usuarios";             url="https://api.auvo.com.br/v2/users?page=1&pageSize=2" },
  @{ name="Projetos";             url="https://api.auvo.com.br/v2/projects?page=1&pageSize=2" }
)

foreach ($t in $tests) {
  $url = $t.url
  $method = if ($t.method) { $t.method } else { "GET" }
  Write-Host "===== $($t.name): $method $url"
  try {
    $params = @{ Uri = $url; Method = $method; Headers = $hdr; UseBasicParsing = $true; TimeoutSec = 10 }
    if ($t.body) { $params.Body = $t.body }
    $r = Invoke-WebRequest @params
    $c = ($r.Content -replace '\s+',' ')
    Write-Host ("  OK {0} -> {1}" -f $r.StatusCode, $c.Substring(0,[Math]::Min(800,$c.Length)))
  } catch {
    $msg = $_.Exception.Message
    $code = if ($msg -match '\((\d{3})\)') { $matches[1] } else { "?" }
    $body = ''
    if ($_.Exception.Response) {
      try { $s = $_.Exception.Response.GetResponseStream(); $rd = New-Object System.IO.StreamReader($s); $body = ($rd.ReadToEnd() -replace '\s+',' ') } catch {}
    }
    Write-Host ("  ERR {0} -> {1}" -f $code, ($body + " " + $msg.Substring(0,[Math]::Min(60,$msg.Length))))
  }
}
Write-Host ""
Write-Host "DONE"
