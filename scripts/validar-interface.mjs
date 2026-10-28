import { spawn, execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { createServer } from 'node:net'
import { mkdir, writeFile } from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve, join } from 'node:path'
import { randomBytes } from 'node:crypto'
import assert from 'node:assert/strict'
import { validarFluxos } from '../frontend/e2e/fluxo.mjs'

const raiz = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(new URL('../frontend/package.json', import.meta.url))
// Aceita um pacote externo já instalado, sem adicionar dependência à aplicação.
const pacote = process.env.PLAYWRIGHT_PACKAGE || 'playwright'
const { chromium } = require(pacote)
const { expect } = require(pacote === 'playwright' ? 'playwright/test' : join(pacote, 'test'))
const pasta = join(raiz, '.cache', `navegacao-${Date.now()}`)
await mkdir(pasta, { recursive: true })
const containers = [], processos = [], logs = []
let browser, encerrando = false

function docker(...args) {
  try { return execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim() }
  catch { throw new Error('Falha no Docker durante a preparação/limpeza do ambiente isolado.') }
}
function iniciar(comando, argumentos, cwd, env, nome) {
  const log = createWriteStream(join(pasta, `${nome}.log`))
  logs.push(log)
  const filho = spawn(comando, argumentos, { cwd, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
  filho.stdout.pipe(log); filho.stderr.pipe(log)
  filho.on('error', () => { filho.falhou = true })
  processos.push(filho)
  return filho
}
async function portaLivre(porta) {
  for (const host of ['127.0.0.1', '::1']) {
    await new Promise((ok, falha) => {
      const servidor = createServer()
      servidor.once('error', () => falha(new Error(`Porta ${porta} ocupada; nenhum processo existente será encerrado.`)))
      servidor.listen(porta, host, () => servidor.close(ok))
    })
  }
}
async function aguardar(url, filho) {
  for (let tentativa = 0; tentativa < 120; tentativa++) {
    if (filho.falhou || filho.exitCode !== null) throw new Error(`Processo de teste encerrou antes de atender ${url}; consulte os logs locais.`)
    try { if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) return } catch {}
    await new Promise(ok => setTimeout(ok, 500))
  }
  throw new Error(`Tempo esgotado aguardando ${url}; consulte os logs locais.`)
}
async function limpar() {
  if (encerrando) return
  encerrando = true
  await browser?.close().catch(() => {})
  for (const filho of processos.reverse()) {
    if (filho.exitCode === null) {
      const terminou = new Promise(ok => filho.once('exit', ok))
      filho.kill()
      await Promise.race([terminou, new Promise(ok => setTimeout(ok, 5000))])
    }
  }
  for (const id of containers.reverse()) docker('stop', '--time', '5', id)
  for (const log of logs) log.end()
}
for (const sinal of ['SIGINT', 'SIGTERM']) process.once(sinal, () => {
  limpar().finally(() => process.exit(130))
})

try {
  await portaLivre(18080); await portaLivre(15173)
  // O navegador é conferido antes de criar qualquer container.
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true })
  console.log(`Navegador ${browser.version()}; artefatos em ${pasta}`)
  for (const imagem of ['postgres:16-alpine', 'axllent/mailpit:v1.27.4']) docker('image', 'inspect', '--format', '{{.Id}}', imagem)
  const marca = `nextflow-validacao-${Date.now()}`
  const senha = randomBytes(24).toString('hex')
  const banco = docker('run', '-d', '--rm', '--pull=never', '--name', `${marca}-db`, '--label', `nextflow.validacao=${marca}`,
    '--tmpfs', '/var/lib/postgresql/data:rw', '-p', '127.0.0.1::5432',
    '-e', 'POSTGRES_DB=nextflow_validacao', '-e', 'POSTGRES_USER=validacao', '-e', `POSTGRES_PASSWORD=${senha}`, 'postgres:16-alpine')
  containers.push(banco)
  const mail = docker('run', '-d', '--rm', '--pull=never', '--name', `${marca}-mail`, '--label', `nextflow.validacao=${marca}`,
    '-p', '127.0.0.1::1025', '-p', '127.0.0.1::8025', 'axllent/mailpit:v1.27.4', '--smtp-disable-rdns')
  containers.push(mail)
  const montagens = JSON.parse(docker('inspect', '--format', '{{json .Mounts}}', banco))
  const memoria = JSON.parse(docker('inspect', '--format', '{{json .HostConfig.Tmpfs}}', banco))
  // Docker pode listar tmpfs apenas em HostConfig.Tmpfs, sem entrada em Mounts.
  assert.ok(memoria['/var/lib/postgresql/data'] && montagens.every(m => m.Type === 'tmpfs'), 'Banco deve usar somente memória, sem volumes operacionais')
  const portasBanco = JSON.parse(docker('inspect', '--format', '{{json .NetworkSettings.Ports}}', banco))
  const portasMail = JSON.parse(docker('inspect', '--format', '{{json .NetworkSettings.Ports}}', mail))
  const portaBanco = portasBanco['5432/tcp'][0].HostPort
  const portaSmtp = portasMail['1025/tcp'][0].HostPort
  const portaMail = portasMail['8025/tcp'][0].HostPort
  await writeFile(join(pasta, 'ambiente.json'), JSON.stringify({ marca, containers, portaBanco, portaSmtp, portaMail, armazenamento: 'tmpfs' }, null, 2))
  for (let i = 0; ; i++) {
    try { docker('exec', banco, 'pg_isready', '-U', 'validacao', '-d', 'nextflow_validacao'); break }
    catch { if (i === 60) throw new Error('PostgreSQL descartável não ficou disponível'); await new Promise(ok => setTimeout(ok, 500)) }
  }
  // Lista permitida: não herda DB_*, SMTP_*, SPRING_* ou credenciais do processo.
  const permitidas = new Set(['PATH', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'PATHEXT', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'JAVA_HOME'])
  const ambiente = Object.fromEntries(Object.entries(process.env).filter(([chave]) => permitidas.has(chave.toUpperCase())))
  const api = iniciar('java', ['-jar', resolve(raiz, 'target/nextflow-api-0.0.1-SNAPSHOT.jar'), '--server.address=localhost', '--server.port=18080'], raiz,
    { ...ambiente, DB_HOST: '127.0.0.1', DB_PORT: portaBanco, DB_NAME: 'nextflow_validacao', DB_USERNAME: 'validacao', DB_PASSWORD: senha,
      SMTP_HOST: '127.0.0.1', SMTP_PORT: portaSmtp, SMTP_USERNAME: '', SMTP_PASSWORD: '', SMTP_AUTH: 'false', SMTP_STARTTLS: 'false', SMTP_FROM: 'teste@nextflow.test', SESSION_COOKIE_SECURE: 'false' }, 'api')
  await aguardar('http://localhost:18080/api/auth/csrf', api)
  const vite = iniciar(process.execPath, [resolve(raiz, 'frontend/node_modules/vite/bin/vite.js'), '--config', 'e2e/vite.config.ts', '--host', 'localhost'],
    resolve(raiz, 'frontend'), ambiente, 'vite')
  await aguardar('http://localhost:15173', vite)
  const resultado = await validarFluxos({ browser, expect, baseURL: 'http://localhost:15173', pasta, mailURL: `http://127.0.0.1:${portaMail}` })
  await writeFile(join(pasta, 'resultado.json'), JSON.stringify(resultado, null, 2))
  console.log(JSON.stringify(resultado, null, 2))
  if (resultado.falhas) process.exitCode = 1
} catch (erro) {
  console.error(erro.message)
  process.exitCode = 1
} finally {
  await limpar()
}
