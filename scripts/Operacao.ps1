param([ValidateSet('Iniciar', 'Backup', 'RestaurarDemo')][string]$Acao = 'Iniciar')
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$codigo = 0
$hash = [Security.Cryptography.SHA256]::Create()
$identificador = [BitConverter]::ToString($hash.ComputeHash([Text.Encoding]::UTF8.GetBytes($PSScriptRoot.ToLowerInvariant()))).Replace('-', '')
$hash.Dispose()
$mutex = [Threading.Mutex]::new($false, ('Local\SoldadoDoCorte_' + $identificador))
$temBloqueio = $false

try {
    try { $temBloqueio = $mutex.WaitOne(0) }
    catch [Threading.AbandonedMutexException] { $temBloqueio = $true }
    if (!$temBloqueio) { throw 'Esta instalacao esta aberta. Use Ctrl+C na janela do sistema e aguarde antes de continuar.' }
    $raiz = $PSScriptRoot
    $jar = Join-Path $PSScriptRoot 'app.jar'
    if (!(Test-Path -LiteralPath $jar -PathType Leaf)) {
        $raizRepo = Split-Path -Parent $PSScriptRoot
        $jarRepo = Join-Path $raizRepo 'target\app.jar'
        if (Test-Path -LiteralPath $jarRepo -PathType Leaf) {
            $raiz = $raizRepo
            $jar = $jarRepo
        }
    }
    Set-Location -LiteralPath $raiz
    $caminhoDados = Join-Path $raiz 'dados'
    if ($Acao -eq 'Iniciar') {
        if (!(Test-Path -LiteralPath $jar -PathType Leaf)) { throw 'app.jar ausente. Execute BUILD.cmd ou extraia todo o ZIP antes de iniciar.' }
        $java = Join-Path $PSScriptRoot 'runtime\bin\java.exe'
        if (!(Test-Path -LiteralPath $java -PathType Leaf)) {
            $instalado = Get-Command java.exe -ErrorAction SilentlyContinue
            if (!$instalado) { throw 'Java nao encontrado. Extraia o ZIP completo ou instale Java 21 de 64 bits.' }
            $java = $instalado.Source
        }
        $porta = if ($env:SOLDADO_PORT) { $env:SOLDADO_PORT } else { '8080' }
        Write-Host "Studio Soldado do Corte V3"
        Write-Host "Aguarde a mensagem Started antes de abrir http://localhost:$porta"
        Write-Host "Para o celular, use o IPv4 do notebook na mesma rede. Consulte LEIA-ME.txt."
        Write-Host "Para desligar, pressione Ctrl+C nesta janela e aguarde o encerramento."
        & $java '-Djava.awt.headless=true' '-Dfile.encoding=UTF-8' '-jar' $jar
        $codigo = $LASTEXITCODE
        if ($codigo -eq 130 -or $codigo -eq -1073741510) { $codigo = 0 }
    } else {
        if ($env:SOLDADO_DB_URL) { throw 'O script atende ao banco local padrao. Use o procedimento do banco configurado em SOLDADO_DB_URL.' }
        if (!(Test-Path -LiteralPath (Join-Path $caminhoDados 'barbearia.mv.db') -PathType Leaf)) {
            throw 'Banco local ausente. Inicie o sistema uma vez antes de executar esta operacao.'
        }
        $pastaBackup = Join-Path $raiz 'backups'
        New-Item -ItemType Directory -Path $pastaBackup -Force | Out-Null
        $marca = Get-Date -Format 'yyyyMMdd-HHmmss-ffff'
        if ($Acao -eq 'Backup') {
            $destino = Join-Path $pastaBackup ('copia-' + $marca)
            Copy-Item -LiteralPath $caminhoDados -Destination $destino -Recurse
            Write-Host "Backup criado em $destino"
        } else {
            if ($env:SOLDADO_DEMO -eq 'false') { throw 'A demonstracao esta desativada nesta instalacao.' }
            Write-Host 'O banco atual sera movido para backups. A proxima inicializacao criara novos dados ficticios.'
            if ((Read-Host 'Digite RESTAURAR para confirmar') -cne 'RESTAURAR') { Write-Host 'Operacao cancelada.'; return }
            $destino = Join-Path $pastaBackup ('antes-da-demo-' + $marca)
            Move-Item -LiteralPath $caminhoDados -Destination $destino
            Write-Host "Banco anterior guardado em $destino"
        }
    }
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    $codigo = 1
} finally {
    if ($temBloqueio) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
}
exit $codigo
