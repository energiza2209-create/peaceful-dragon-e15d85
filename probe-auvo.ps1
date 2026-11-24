#ält;#
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$appKey = "wQ3FBfPB3EgMgUJbK0EXR4rcACt2JWtz"
$token = "wQ3FBfPB3Ega672gD3bMSKbcQ4f8714a"

$bodies = @(
  (@{ apiKey = $appKey; tokenAPI = $token } | ConvertTo-Json -Compress),
  (@{ appKey = $appKey; tokenAPI = $token } | ConvertTo-Json -Compress),
  (@{ appKey = $appKey; token = $token } | ConvertTo-Json -Compress),
  (@{ apiKey = $appKey; token = $token } | ConvertTo-Json -Compress)
)

$base = @(
  "https://api.auvo.com.br",
  "https://api.auvo.com.br/rest",
  "https://api.auvo.com.br/v1",
  "https://api.auvo.com.br/v2",
  "https://api.auvo.com.br/api"
)

$paths = @("autenticacao","login","auth","signIn","authentication","obterToken","getToken","logon","token")

foreach ($b in $base) {
  foreach ($p in $paths) {
    $url = "$b/$p"
    foreach ($body in $bodies) {
      try {
        $r = Invoke-WebRequest -Uri $url -Method POST -Body $body -ContentType "application/json" -UserAgent "SIGEQ/1.0" -UseBasicParsing -TimeoutSec 8
        $c = ($r.Content -replace '\s+',' ')
        if ($c -notmatch '<!DOCTYPE') {
          $bshort = $body.Substring(0,[Math]::Min(45,$body.Length))
          Write-Host ("OK  {0,-58} {1,-48} -> {2} {3}" -f $url, $bshort, $r.StatusCode, $c.Substring(0,[Math]::Min(250,$c.Length)))
        }
      }
      catch {
        $msg = $_.Exception.Message
        $code = ''
        if ($msg -match '\((\d{3})\)') { $code = $matches[1] }
        if ($code -in @('400','401','403','500','502') -and $msg -notmatch 'DOCTYPE') {
          $respBody = ''
          if ($_.Exception.Response) {
            try {
              $stream = $_.Exception.Response.GetResponseStream()
              $reader = New-Object System.IO.StreamReader($stream)
              $respBody = ($reader.ReadToEnd() -replace '\s+',' ')
            } catch {}
          }
          if ($respBody -and $respBody -notmatch '<!DOCTYPE') {
            $bshort = $body.Substring(0,[Math]::Min(45,$body.Length))
            $line = "ERR $code $($url)  BODY:$bshort  -> $respBody"
            Write-Host $line.Substring(0,[Math]::Min(280,$line.Length))
          }
        }
      }
    }
  }
}
Write-Host "DONE"
