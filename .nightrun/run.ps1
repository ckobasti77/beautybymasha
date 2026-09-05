<#
  Beauty by Masha - nocni run
  Pokrece korake 2-8 redom, sa proverama izmedju, commit-om posle svakog uspeha
  i punim logom. Ujutru se gleda .nightrun\STATUS-RUN.md

    powershell -NoProfile -ExecutionPolicy Bypass -File ".\.nightrun\run.ps1"

  Nastavak od odredjenog koraka:  -StartAt 5
  Prekid: Ctrl+C
#>
param(
  [int]$StartAt = 2,
  [int]$StopAt = 8,
  [string]$Model = "opus",
  [string]$ProdUrl = "https://beautybymasha-mu.vercel.app",
  [int]$StepTimeoutMin = 75,
  [switch]$SkipProbe,
  [string]$Branch = "main",
  [switch]$NoPush
)

# NE koristiti "Stop": PowerShell tretira SVAKI ispis na stderr iz native komandi
# (git, npm, npx) kao gresku koja obara skriptu - a git na stderr pise i obicna
# upozorenja tipa "LF will be replaced by CRLF". Skripta svuda sama proverava
# $LASTEXITCODE, pa je "Continue" i tacnije i bezbednije za run bez nadzora.
$ErrorActionPreference = "Continue"
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}
$OutputEncoding = [System.Text.Encoding]::UTF8

$root      = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$logDir    = Join-Path $root ".nightrun\logs"
$promptDir = Join-Path $root ".nightrun\prompts"
$tmpDir    = Join-Path $root ".nightrun\tmp"
$status    = Join-Path $root ".nightrun\STATUS-RUN.md"
Set-Location $root
New-Item -ItemType Directory -Force -Path $logDir, $tmpDir | Out-Null
$startedAt = Get-Date


# Sve git komande idu kroz ovo: stderr se guta, vraca se samo izlazni kod.
function Git-Quiet {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$GitArgs)
  $prev = $ErrorActionPreference
  $ErrorActionPreference = "SilentlyContinue"
  & git @GitArgs 2>&1 | Out-Null
  $code = $LASTEXITCODE
  $ErrorActionPreference = $prev
  return $code
}

function Say([string]$msg, [string]$color = "Gray") {
  Write-Host ("[{0}] {1}" -f (Get-Date).ToString("HH:mm:ss"), $msg) -ForegroundColor $color
}
function Note([string]$line) { Add-Content -Path $status -Value $line -Encoding UTF8 }

Set-Content -Path $status -Encoding UTF8 -Value @"
# Nocni run - Beauty by Masha

Pokrenuto: $($startedAt.ToString('yyyy-MM-dd HH:mm:ss'))
Model: $Model | Koraci: $StartAt-$StopAt | Timeout po koraku: $StepTimeoutMin min

| Korak | Naziv | Ishod | Trajanje | Popravki |
| --- | --- | --- | --- | --- |
"@

# ------------------------------------------------------------------ preflight
Say "Preflight..." "Cyan"
if ($PSVersionTable.PSVersion.Major -lt 5) { Say "Treba PowerShell 5.1 ili noviji." "Red"; exit 1 }
foreach ($c in @("node","npm","git","npx","claude")) {
  if (-not (Get-Command $c -ErrorAction SilentlyContinue)) { Say "NEDOSTAJE: $c" "Red"; exit 1 }
}
foreach ($f in @("package.json",".env.local")) {
  if (-not (Test-Path (Join-Path $root $f))) { Say "NEDOSTAJE $f u $root" "Red"; exit 1 }
}
if (-not (Test-Path $promptDir)) { Say "NEDOSTAJE $promptDir" "Red"; exit 1 }
if (-not $env:CONVEX_DEPLOY_KEY) {
  Say "Nema CONVEX_DEPLOY_KEY - oslanjam se na tvoju lokalnu Convex prijavu." "DarkYellow"
  Say "Ako convex deploy zatrazi prijavu, deploy ce pasti (run se NE prekida)." "DarkYellow"
}

Git-Quiet add -A | Out-Null
Git-Quiet commit -m "nightrun: snapshot pre pokretanja" | Out-Null
Say ("Bazni commit: " + (& git rev-parse --short HEAD 2>$null)) "DarkGray"

# Radimo direktno na main: Vercel odatle gradi PRODUKCIJU. Deploy ide posle svakog
# koraka, ali SAMO ako su sve provere prosle - polomljen kod nikad ne stize na prod.
if ((Git-Quiet rev-parse --verify $Branch) -eq 0) { Git-Quiet checkout $Branch | Out-Null }
else { Git-Quiet checkout -b $Branch | Out-Null }
Say "Grana: $Branch" "DarkGray"

$hasRemote = $false
$remotes = & git remote 2>$null
if ($LASTEXITCODE -eq 0 -and $remotes) { $hasRemote = $true }
if ($NoPush) { $hasRemote = $false; Say "Push iskljucen (-NoPush)" "DarkGray" }
elseif ($hasRemote) { Say "Remote nadjen - guram posle svakog uspesnog koraka" "DarkGray" }
else { Say "Nema remote-a - radim samo lokalno" "DarkGray" }

# Redosled je bitan: prvo backend na prod, pa tek onda front. Obrnuto bi znacilo
# da Vercel pusti stranicu koja zove Convex funkcije koje jos ne postoje.
# Nijedan neuspeh ovde NE prekida lanac - kod je vec iskomitovan lokalno.
function Publish-Step([string]$Label, [string]$LogPath) {
  Add-Content -Path $LogPath -Value "`n===== DEPLOY: $Label =====" -Encoding UTF8

  $cx = cmd /c "npx convex deploy -y 2>&1"
  Add-Content -Path $LogPath -Value ($cx -join "`n") -Encoding UTF8
  if ($LASTEXITCODE -ne 0) {
    # starije verzije CLI-ja ne znaju za -y
    Say "  convex deploy -y nije prosao, probam bez zastavice..." "DarkYellow"
    $cx = cmd /c "npx convex deploy 2>&1"
    Add-Content -Path $LogPath -Value ($cx -join "`n") -Encoding UTF8
  }
  if ($LASTEXITCODE -eq 0) { Say "  convex prod OK" "DarkGreen" }
  else { Say "  convex deploy PAO - front NE deployujem (backend bi bio stariji)" "DarkYellow"; return }

  if (-not $hasRemote) { Say "  nema remote-a, front nije deployovan" "DarkYellow"; return }
  if ((Git-Quiet push origin $Branch) -ne 0) { Say "  git push PAO - front nije deployovan" "DarkYellow"; return }
  Say "  push OK, Vercel gradi..." "DarkGreen"

  # sacekaj da Vercel zavrsi build pa proveri da je prod ziv
  Start-Sleep -Seconds 100
  for ($i = 1; $i -le 6; $i++) {
    try {
      $r = Invoke-WebRequest -Uri $ProdUrl -UseBasicParsing -TimeoutSec 25 -MaximumRedirection 3
      if ($r.StatusCode -eq 200) {
        Say "  PROD ziv ($($r.StatusCode)) - $ProdUrl" "Green"
        Add-Content -Path $LogPath -Value "PROD OK $($r.StatusCode) posle $($i * 30)s cekanja" -Encoding UTF8
        return
      }
    } catch { }
    Start-Sleep -Seconds 30
  }
  Say "  PROD nije odgovorio 200 u roku - proveri Vercel ujutru" "DarkYellow"
  Add-Content -Path $LogPath -Value "PROD nije vratio 200 u predvidjenom roku." -Encoding UTF8
}

# Convex dev se NE drzi u pozadini: provera `npx convex dev --once` bi se tukla sa njim
# oko istog deployment-a. Codegen radi sama provera, posle svakog koraka.
# Next dev server se takodje ne pokrece tokom runa - tukao bi se sa `npm run build`.
# Oba se dizu tek na kraju, da ujutru sve radi.

# --------------------------------------------------- pokretanje claude procesa
# Prompt se salje preko preusmeravanja fajla ( < file ), NE preko argumenta i NE preko
# StandardInput.Write. Razlog: argument bi probio ogranicenje duzine komandne linije
# u cmd.exe (~8191 znakova), a Write bi pokvario srpske dijakritike jer PowerShell 5.1
# ne ume da postavi StandardInputEncoding. Ovako cmd cita bajtove fajla direktno.
function Invoke-Claude {
  param([string]$PromptPath, [string]$LogPath, [string]$PermFlag, [int]$TimeoutMin)

  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName  = "cmd.exe"
  $cmdArgs = "/c chcp 65001 >nul && claude -p --model $Model"
  if ($PermFlag) { $cmdArgs += " $PermFlag" }
  $cmdArgs += " < `"$PromptPath`""
  $psi.Arguments              = $cmdArgs
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError  = $true
  $psi.UseShellExecute        = $false
  $psi.CreateNoWindow         = $true
  $psi.WorkingDirectory       = $root

  $p = [System.Diagnostics.Process]::Start($psi)
  # citanje pokrenuto pre cekanja - inace se puni bafer i proces se zaglavi
  $outTask = $p.StandardOutput.ReadToEndAsync()
  $errTask = $p.StandardError.ReadToEndAsync()

  if (-not $p.WaitForExit($TimeoutMin * 60 * 1000)) {
    try { $p.Kill() } catch {}
    try { Start-Process -FilePath "taskkill" -ArgumentList "/PID",$p.Id,"/T","/F" -NoNewWindow -Wait } catch {}
    Add-Content -Path $LogPath -Value "`n=== PREKINUTO: timeout posle $TimeoutMin min ===" -Encoding UTF8
    return 124
  }
  Add-Content -Path $LogPath -Value $outTask.Result -Encoding UTF8
  if ($errTask.Result) { Add-Content -Path $LogPath -Value ("`n=== STDERR ===`n" + $errTask.Result) -Encoding UTF8 }
  return $p.ExitCode
}

function New-TempPrompt([string]$Text, [string]$Name) {
  $path = Join-Path $tmpDir "$Name.md"
  [System.IO.File]::WriteAllText($path, $Text, (New-Object System.Text.UTF8Encoding($false)))
  return $path
}

# ---------------------------------------------------------------------- probe
$permFlag = "--permission-mode bypassPermissions"
if (-not $SkipProbe) {
  Say "Probe: proveravam CLI, prijavu i zastavice..." "Cyan"
  $probeLog  = Join-Path $logDir "00-probe.log"
  Remove-Item $probeLog -ErrorAction SilentlyContinue
  $probeFile = New-TempPrompt "Odgovori tacno jednom recju: PROBA" "probe"
  $ok = $false
  foreach ($flag in @("--permission-mode bypassPermissions", "--dangerously-skip-permissions", "")) {
    $code = Invoke-Claude -PromptPath $probeFile -LogPath $probeLog -PermFlag $flag -TimeoutMin 4
    if ($code -eq 0) { $permFlag = $flag; $ok = $true; Say "Radi sa zastavicom: '$flag'" "Green"; break }
    Say "Ne prolazi: '$flag' (izlaz $code)" "DarkYellow"
  }
  if (-not $ok) {
    Say "claude CLI ne odgovara. Pogledaj .nightrun\logs\00-probe.log" "Red"
    Note ""; Note "**PAO PREFLIGHT** - claude CLI nije odgovorio ni sa jednom zastavicom."
    Note "Najcesce: nisi prijavljen (pokreni ``claude`` jednom rucno) ili je ime modela pogresno."
    exit 1
  }
}

# ---------------------------------------------------------------------- gates
function Test-Gates {
  param([string]$LogPath)
  $failures = @()
  $checks = @(
    @{ name = "convex";    cmd = "npx convex dev --once" },
    @{ name = "typecheck"; cmd = "npm run typecheck" },
    @{ name = "lint";      cmd = "npm run lint" },
    @{ name = "test";      cmd = "npm test" },
    @{ name = "build";     cmd = "npm run build" }
  )
  foreach ($c in $checks) {
    Add-Content -Path $LogPath -Value "`n===== PROVERA: $($c.name) =====" -Encoding UTF8
    $out = cmd /c "$($c.cmd) 2>&1"
    Add-Content -Path $LogPath -Value ($out -join "`n") -Encoding UTF8
    if ($LASTEXITCODE -ne 0) { $failures += $c.name; Say "  x $($c.name)" "DarkYellow" }
    else { Say "  + $($c.name)" "DarkGreen" }
  }
  return ,$failures
}

# ------------------------------------------------------------------ glavni tok
$steps   = Get-ChildItem $promptDir -Filter "*.md" | Sort-Object Name
$results = @()

foreach ($step in $steps) {
  $num = 0
  if (-not [int]::TryParse($step.BaseName.Substring(0,2), [ref]$num)) { continue }
  if ($num -lt $StartAt -or $num -gt $StopAt) { continue }

  $name = $step.BaseName
  $log  = Join-Path $logDir "$name.log"
  Remove-Item $log -ErrorAction SilentlyContinue
  $t0 = Get-Date
  Say "=== KORAK $num : $name ===" "Cyan"

  $code    = Invoke-Claude -PromptPath $step.FullName -LogPath $log -PermFlag $permFlag -TimeoutMin $StepTimeoutMin
  $repairs = 0

  if ($code -ne 0) {
    Say "claude izasao sa kodom $code" "Yellow"
    $fails = @("claude exit $code")
  } else {
    Say "Provere..." "DarkGray"
    $fails = Test-Gates -LogPath $log
  }

  while ($fails.Count -gt 0 -and $repairs -lt 2) {
    $repairs++
    Say "Pada: $($fails -join ', '). Popravka $repairs/2..." "Yellow"
    $fixText = @"
Prethodni korak nije prosao provere. Padaju: $($fails -join ', ').

Pokreni ih sam, procitaj greske i POPRAVI ih. Ne dodaj nove funkcionalnosti i ne
prepravljaj ono sto vec radi - samo dovedi ovo do zelenog:

  npx convex dev --once
  npm run typecheck
  npm run lint      (nula upozorenja)
  npm test
  npm run build

Ako test pada zato sto je test pogresan a kod tacan, popravi test i objasni zasto u
docs/STATUS.md. Ako ne mozes da popravis, upisi u docs/STATUS.md tacno sta si probao
i sta je ostalo slomljeno, pa stani.
"@
    $fixPath = New-TempPrompt $fixText "fix-$num-$repairs"
    $code  = Invoke-Claude -PromptPath $fixPath -LogPath $log -PermFlag $permFlag -TimeoutMin 30
    $fails = Test-Gates -LogPath $log
  }

  $dur = [math]::Round(((Get-Date) - $t0).TotalMinutes, 1)

  if ($fails.Count -eq 0) {
    Git-Quiet add -A | Out-Null
    Git-Quiet commit -m "nightrun korak ${num}: $name" | Out-Null
    Publish-Step "korak $num" $log
    Say "KORAK $num PROSAO ($dur min, popravki: $repairs)" "Green"
    Note "| $num | $name | OK | $dur min | $repairs |"
    $results += @{ n = $num; ok = $true }
  } else {
    Say "KORAK $num PAO: $($fails -join ', ')" "Red"
    Note "| $num | $name | PAO: $($fails -join ', ') | $dur min | $repairs |"
    $results += @{ n = $num; ok = $false }
    Git-Quiet add -A | Out-Null
    Git-Quiet commit -m "nightrun korak ${num}: $name (PAO - vidi logs/$name.log)" | Out-Null
    if ($hasRemote) { Git-Quiet push origin $Branch | Out-Null; Say "  push (bez deploya - korak je pao)" "DarkYellow" }

    # Koraci 2 i 3 su backend - temelj. Sve dalje bi bila gradnja na pesku.
    if ($num -le 3) {
      Say "Backend korak pao - prekidam lanac." "Red"
      Note ""; Note "**LANAC PREKINUT na koraku $num** - backend je temelj, dalji koraci nemaju smisla."
      Note "Rad je iskomitovan; pogledaj ``.nightrun\logs\$name.log`` i ``docs/STATUS.md``."
      break
    }
    Say "Frontend korak - nastavljam dalje." "Yellow"
  }
}

# --------------------------------------------------------------------- sumarno
$total   = [math]::Round(((Get-Date) - $startedAt).TotalMinutes, 1)
$okCount = @($results | Where-Object { $_.ok }).Count
Note ""
Note "Zavrseno: $((Get-Date).ToString('yyyy-MM-dd HH:mm:ss')) | Ukupno $total min | Proslo $okCount/$($results.Count)"
Note ""
Note "## Ujutru"
Note "1. ``docs/STATUS.md`` - sta radi, sta ne, i svaki [POTVRDITI] koji je ostao"
Note "2. Sajt vec radi na http://localhost:3001 - samo osvezi"
Note "3. ``npm run seed`` - demo podaci"
Note "4. Logovi po koraku: ``.nightrun\logs\``"
Note "5. ``git log --oneline`` - svaki korak je zaseban commit, na grani ``$Branch``"
Note "6. Produkcija: $ProdUrl - deployovana posle svakog USPESNOG koraka"

# Dizemo Convex dev i Next dev (port 3001) da ujutru sajt vec radi.
Start-Process -FilePath "cmd.exe" -ArgumentList "/k npx convex dev" -WorkingDirectory $root -WindowStyle Minimized | Out-Null
Start-Process -FilePath "cmd.exe" -ArgumentList "/k npm run dev -- -p 3001" -WorkingDirectory $root -WindowStyle Minimized | Out-Null
Note ""
Note "Sajt je pokrenut: http://localhost:3001  (Convex dev radi u drugom prozoru)"

Say ""
Say "GOTOVO. $okCount/$($results.Count) koraka proslo, ukupno $total min." "Cyan"
Say "Izvestaj: .nightrun\STATUS-RUN.md" "Cyan"
