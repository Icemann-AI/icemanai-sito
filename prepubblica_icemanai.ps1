# Gate obbligatorio prima di pubblica_sito (compito #251)
# Uso: .\prepubblica_icemanai.ps1
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
python (Join-Path $here 'verifica_encoding_pre_publish.py') $here
if ($LASTEXITCODE -ne 0) {
    Write-Error "Pre-publish encoding fallito: correggere i file prima di pubblica_sito."
    exit $LASTEXITCODE
}
Write-Host "Pre-publish OK: encoding e testi critici conformi."
exit 0
