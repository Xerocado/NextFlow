import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export async function validarFluxos({ browser, expect: original, baseURL, pasta, mailURL }) {
  const expect = original.configure({ timeout: 10000 })
  const contexto = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' })
  // O roteiro não faz chamadas externas, incluindo fontes ou ViaCEP.
  await contexto.route('**/*', rota => ['localhost', '127.0.0.1'].includes(new URL(rota.request().url()).hostname) ? rota.continue() : rota.abort())
  const pagina = await contexto.newPage()
  const resultados = [], errosJS = []
  pagina.on('pageerror', erro => errosJS.push(erro.message))
  let enviosPagamento = 0
  pagina.on('request', pedido => { if (pedido.method() === 'POST' && pedido.url().endsWith('/pagamentos')) enviosPagamento++ })
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
  const deslocar = dias => { const d = new Date(`${hoje}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + dias); return d.toISOString().slice(0, 10) }
  const ontem = deslocar(-1), anterior = deslocar(-2)
  const email = `navegacao-${Date.now()}@example.test`, senha = 'Senha ficticia de teste 123!'
  let a, b, cliente, entrega

  async function etapa(nome, executar, essencial = false) {
    console.log(`Verificando: ${nome}`)
    try { await executar(); resultados.push({ nome, aprovado: true }) }
    catch (erro) {
      resultados.push({ nome, aprovado: false, erro: erro.message })
      await pagina.screenshot({ path: join(pasta, `falha-${resultados.length}.png`), fullPage: true }).catch(() => {})
      if (essencial) throw erro
    }
  }
  async function navegar(nome) {
    const abrir = pagina.getByRole('button', { name: 'Abrir menu', exact: true })
    if (await abrir.isVisible()) await abrir.click()
    await pagina.getByRole('navigation', { name: 'Menu principal' }).getByRole('link', { name: nome, exact: true }).click()
    await expect(pagina.getByRole('heading', { name: nome, level: 1, exact: true })).toBeVisible()
  }
  async function trocar(empresa) {
    await navegar('Minha empresa')
    const seletor = pagina.getByLabel('Empresa', { exact: true })
    await expect(seletor).toBeEnabled()
    await expect(seletor.locator(`option[value="${empresa.id}"]`)).toHaveCount(1)
    await seletor.selectOption(empresa.id)
  }
  async function enviar(caminho, dados, metodo = 'POST', ctx = contexto) {
    const csrf = await (await ctx.request.get(`${baseURL}/api/auth/csrf`)).json()
    return ctx.request.fetch(`${baseURL}${caminho}`, { method: metodo, headers: { [csrf.headerName]: csrf.token }, data: dados })
  }
  async function criarEmpresa(nome) {
    await pagina.getByLabel('Empresa', { exact: true }).selectOption('')
    await pagina.getByLabel('Nome da empresa', { exact: true }).fill(nome)
    const resposta = pagina.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith('/api/estabelecimentos'))
    await pagina.getByRole('button', { name: 'Cadastrar empresa', exact: true }).click()
    const r = await resposta; assert.equal(r.status(), 201)
    const empresa = await r.json()
    await expect(pagina.getByLabel('Empresa', { exact: true })).toHaveValue(empresa.id)
    return empresa
  }
  async function criarCliente(nome) {
    await navegar('Clientes')
    await pagina.getByLabel('Nome', { exact: true }).fill(nome)
    const resposta = pagina.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname.endsWith('/clientes'))
    await pagina.getByRole('button', { name: 'Cadastrar cliente', exact: true }).click()
    const r = await resposta; assert.equal(r.status(), 201)
    await expect(pagina.getByRole('cell', { name: nome, exact: true })).toBeVisible()
    return r.json()
  }
  async function pagar(data, valor) {
    await pagina.getByLabel('Data efetiva', { exact: true }).fill(data)
    await pagina.getByLabel('Valor recebido (R$)', { exact: true }).fill(valor)
    const resposta = pagina.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith('/pagamentos'))
    await pagina.getByRole('button', { name: 'Registrar recebimento', exact: true }).click()
    assert.equal((await resposta).status(), 201)
    await expect(pagina.getByText('Recebimento registrado.', { exact: true })).toBeVisible()
  }

  try {
    await etapa('Cadastro, login, cookie de sessão e rejeição de POST sem CSRF', async () => {
      await pagina.goto('/')
      await pagina.getByRole('button', { name: 'Criar minha conta', exact: true }).click()
      await pagina.getByLabel('Seu nome', { exact: true }).fill('Pessoa fictícia')
      await pagina.getByLabel('E-mail', { exact: true }).fill(email)
      await pagina.getByLabel('Senha', { exact: true }).fill(senha)
      await pagina.getByLabel('Confirme a senha', { exact: true }).fill(senha)
      await pagina.getByRole('button', { name: 'Criar minha conta', exact: true }).click()
      await expect(pagina.getByText('Conta criada. Entre para continuar.', { exact: true })).toBeVisible()
      await pagina.getByLabel('E-mail', { exact: true }).fill(email)
      await pagina.getByLabel('Senha', { exact: true }).fill(senha)
      await pagina.getByRole('button', { name: 'Entrar na minha conta', exact: true }).click()
      await expect(pagina.getByRole('heading', { name: 'Minha empresa', level: 1 })).toBeVisible()
      const cookie = (await contexto.cookies()).find(c => c.name === 'JSESSIONID')
      assert.ok(cookie?.httpOnly); assert.equal(cookie.sameSite, 'Lax')
      assert.equal((await contexto.request.post(`${baseURL}/api/estabelecimentos`, { data: { nome: 'Negada' } })).status(), 403)
    }, true)
    await etapa('Cadastro e seleção de duas empresas e clientes separados', async () => {
      a = await criarEmpresa('Água fictícia A')
      cliente = await criarCliente('Cliente exclusivo A')
      await navegar('Minha empresa'); b = await criarEmpresa('Água fictícia B')
      await criarCliente('Cliente exclusivo B')
      await expect(pagina.getByRole('cell', { name: 'Cliente exclusivo A', exact: true })).toHaveCount(0)
      await trocar(a); await navegar('Clientes')
      await expect(pagina.getByRole('cell', { name: 'Cliente exclusivo A', exact: true })).toBeVisible()
      await expect(pagina.getByRole('cell', { name: 'Cliente exclusivo B', exact: true })).toHaveCount(0)
    }, true)
    await etapa('Entrega cadastrada, rejeições, pagamento parcial e quitação posterior', async () => {
      await navegar('Histórico de pedidos')
      await pagina.getByLabel('De', { exact: true }).fill(anterior)
      await pagina.getByLabel('Data da entrega', { exact: true }).fill(anterior)
      await pagina.getByLabel('Cliente', { exact: true }).selectOption(cliente.id)
      await pagina.getByLabel('Litros', { exact: true }).fill('1000')
      await pagina.getByLabel('Valor total (R$)', { exact: true }).fill('150,30')
      const resposta = pagina.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname.endsWith('/entregas'))
      await pagina.getByRole('button', { name: 'Registrar entrega', exact: true }).click()
      const r = await resposta; assert.equal(r.status(), 201); entrega = await r.json()
      await expect(pagina.getByRole('heading', { name: 'Registrar recebimento', exact: true })).toBeVisible()
      const antes = enviosPagamento
      await pagina.getByLabel('Valor recebido (R$)', { exact: true }).fill('150,31')
      await pagina.getByRole('button', { name: 'Registrar recebimento', exact: true }).click()
      await expect(pagina.getByRole('alert')).toContainText('não ultrapasse o saldo')
      assert.equal(enviosPagamento, antes)
      await pagina.getByLabel('Data efetiva', { exact: true }).fill(deslocar(1))
      await pagina.getByLabel('Valor recebido (R$)', { exact: true }).fill('1,00')
      await pagina.getByRole('button', { name: 'Registrar recebimento', exact: true }).click()
      assert.equal(await pagina.getByLabel('Data efetiva', { exact: true }).evaluate(e => e.validity.rangeOverflow), true)
      assert.equal(enviosPagamento, antes)
      for (const dados of [{ data: hoje, valor: '150.31' }, { data: deslocar(1), valor: '1.00' }]) {
        assert.equal((await enviar(`/api/estabelecimentos/${a.id}/entregas/${entrega.id}/pagamentos`, dados)).status(), 400)
      }
      await pagar(ontem, '50,10')
      await expect(pagina.getByRole('cell', { name: 'Parcial', exact: true })).toBeVisible()
      await pagar(hoje, '100,20')
      await expect(pagina.getByRole('cell', { name: 'Pago', exact: true })).toBeVisible()
      await expect(pagina.getByRole('button', { name: 'Registrar recebimento', exact: true })).toHaveCount(0)
    }, true)
    await etapa('Entrega sem cobrança e avulso não identificado pendente', async () => {
      for (const gratis of [true, false]) {
        await pagina.getByLabel('Data da entrega', { exact: true }).fill(hoje)
        await pagina.getByLabel('Cliente', { exact: true }).selectOption('')
        if (gratis) await pagina.getByLabel('Identificação (opcional)', { exact: true }).fill('Doação fictícia')
        await pagina.getByLabel('Litros', { exact: true }).fill(gratis ? '200' : '500')
        await pagina.getByLabel('Cobrança', { exact: true }).selectOption(gratis ? 'sem' : 'normal')
        await pagina.getByLabel('Valor total (R$)', { exact: true }).fill(gratis ? '0,00' : '10,00')
        const resposta = pagina.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname.endsWith('/entregas'))
        await pagina.getByRole('button', { name: 'Registrar entrega', exact: true }).click()
        assert.equal((await resposta).status(), 201)
        await expect(pagina.getByRole('button', { name: 'Registrar entrega', exact: true })).toBeEnabled()
      }
      await navegar('Pagamentos pendentes')
      await expect(pagina.getByRole('row').filter({ hasText: 'não identificado' })).toContainText('10,00')
      await expect(pagina.getByRole('cell', { name: 'Doação fictícia', exact: true })).toHaveCount(0)
    }, true)
    await etapa('Resposta perdida usa a mesma chave e não duplica a entrega após recarregar a tela', async () => {
      await trocar(a)
      await navegar('Histórico de pedidos')
      await pagina.getByLabel('De', { exact: true }).fill(hoje)
      await pagina.getByLabel('Até', { exact: true }).fill(hoje)
      await pagina.getByLabel('Data da entrega', { exact: true }).fill(hoje)
      await pagina.getByLabel('Cliente', { exact: true }).selectOption('')
      await pagina.getByLabel('Identificação (opcional)', { exact: true }).fill('Resposta perdida fictícia')
      await pagina.getByLabel('Litros', { exact: true }).fill('321')
      await pagina.getByLabel('Valor total (R$)', { exact: true }).fill('31,25')
      const chaves = []
      await pagina.route('**/api/estabelecimentos/*/entregas', async rota => {
        if (rota.request().method() !== 'POST') return rota.continue()
        chaves.push((await rota.request().allHeaders())['idempotency-key'])
        const resposta = await rota.fetch()
        assert.equal(resposta.status(), 201)
        await rota.abort('connectionfailed')
      })
      await pagina.getByRole('button', { name: 'Registrar entrega', exact: true }).click()
      await expect(pagina.getByRole('alert')).toContainText('Atualize e confira')
      await pagina.unroute('**/api/estabelecimentos/*/entregas')
      await pagina.reload()
      await expect(pagina.getByRole('button', { name: 'Sair da conta', exact: true })).toBeVisible()
      await trocar(a)
      await navegar('Histórico de pedidos')
      await pagina.getByLabel('De', { exact: true }).fill(hoje)
      await pagina.getByLabel('Até', { exact: true }).fill(hoje)
      await pagina.getByLabel('Data da entrega', { exact: true }).fill(hoje)
      await pagina.getByLabel('Cliente', { exact: true }).selectOption('')
      await pagina.getByLabel('Identificação (opcional)', { exact: true }).fill('Resposta perdida fictícia')
      await pagina.getByLabel('Litros', { exact: true }).fill('321')
      await pagina.getByLabel('Valor total (R$)', { exact: true }).fill('31,25')
      const resposta = pagina.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname.endsWith('/entregas'))
      await pagina.getByRole('button', { name: 'Registrar entrega', exact: true }).click()
      const repeticao = await resposta
      assert.equal(repeticao.status(), 201)
      chaves.push((await repeticao.request().allHeaders())['idempotency-key'])
      assert.ok(chaves[0])
      assert.equal(chaves[1], chaves[0])
      const registro = await repeticao.json()
      const lista = await (await contexto.request.get(`${baseURL}/api/estabelecimentos/${a.id}/entregas?inicio=${hoje}&fim=${hoje}&pagina=0&tamanho=100`)).json()
      assert.equal(lista.itens.filter(item => item.id === registro.id).length, 1)
      await expect(pagina.getByRole('cell', { name: 'Resposta perdida fictícia', exact: true })).toHaveCount(1)
    }, true)
    await etapa('Gastos, paginação e totais completos no movimento por data efetiva', async () => {
      await navegar('Gastos do dia')
      for (const [nome, valor] of [['Diesel fictício', '25,10'], ['Água fictícia', '0,20']]) {
        await pagina.getByLabel('Descrição', { exact: true }).fill(nome)
        await pagina.getByLabel('Valor (R$)', { exact: true }).fill(valor)
        await pagina.getByRole('button', { name: 'Registrar gasto', exact: true }).click()
        await expect(pagina.getByRole('cell', { name: nome, exact: true })).toBeVisible()
      }
      for (let i = 0; i < 20; i++) assert.equal((await enviar(`/api/estabelecimentos/${a.id}/gastos`, { descricao: `Centavo fictício ${i}`, valor: '0.01', data: hoje })).status(), 201)
      await pagina.getByRole('button', { name: 'Atualizar lista', exact: true }).click()
      await expect(pagina.getByText(/22 registros · Total:/)).toContainText('25,50')
      await pagina.getByRole('button', { name: 'Próxima', exact: true }).click()
      await expect(pagina.locator('tbody tr')).toHaveCount(2)
      await expect(pagina.getByText(/22 registros · Total:/)).toContainText('25,50')
      await navegar('Movimento do dia')
      await expect(pagina.locator('.metrica').filter({ hasText: 'Recebido no dia' })).toContainText('100,20')
      await expect(pagina.locator('.metrica').filter({ hasText: 'Gastos do dia' })).toContainText('25,50')
      await expect(pagina.locator('.metrica').filter({ hasText: 'Saldo do dia' })).toContainText('74,70')
      const entregasDia = pagina.getByRole('region', { name: 'Entregas do dia', exact: true })
      const gastosDia = pagina.locator('.painel').filter({ has: pagina.getByRole('heading', { name: 'Gastos do dia', exact: true }) })
      await expect(entregasDia.locator('tbody tr')).toHaveCount(3)
      await expect(gastosDia.locator('tbody tr')).toHaveCount(20)
      const consultas = []
      const observarConsulta = pedido => {
        const url = new URL(pedido.url())
        if (pedido.method() === 'GET' && url.pathname.includes(`/api/estabelecimentos/${a.id}/`)) consultas.push(`${url.pathname}${url.search}`)
      }
      pagina.on('request', observarConsulta)
      const paginaDeGastos = pagina.waitForResponse(resposta => {
        const url = new URL(resposta.url())
        return resposta.request().method() === 'GET' && url.pathname.endsWith('/gastos') && url.searchParams.get('pagina') === '1'
      })
      // Se o clique falhar antes da resposta, marque a rejeição como tratada até o await abaixo.
      void paginaDeGastos.catch(() => {})
      await gastosDia.getByRole('button', { name: 'Próxima', exact: true }).click()
      assert.equal((await paginaDeGastos).status(), 200)
      await expect(gastosDia.locator('tbody tr')).toHaveCount(2)
      await expect(gastosDia.locator('tbody')).toContainText('Água fictícia')
      assert.equal(consultas.length, 1)
      assert.match(consultas[0], /\/gastos\?data=.*&pagina=1&/)
      pagina.off('request', observarConsulta)
      await pagina.screenshot({ path: join(pasta, 'desktop-movimento.png'), fullPage: true })
      await pagina.getByLabel('Dia do movimento', { exact: true }).fill(ontem)
      await expect(pagina.locator('.metrica').filter({ hasText: 'Recebido no dia' })).toContainText('50,10')
      await expect(pagina.locator('.metrica').filter({ hasText: 'Entregas com cobrança' })).toContainText('0,00')
    }, true)
    await etapa('Isolamento HTTP entre usuários e entre empresas do mesmo proprietário', async () => {
      assert.equal((await contexto.request.get(`${baseURL}/api/estabelecimentos/${b.id}/entregas/${entrega.id}`)).status(), 404)
      assert.equal((await enviar(`/api/estabelecimentos/${b.id}/entregas/${entrega.id}/pagamentos`, { data: hoje, valor: '0.01' })).status(), 404)
      const outro = await browser.newContext({ baseURL })
      try {
        const csrf = await (await outro.request.get(`${baseURL}/api/auth/csrf`)).json()
        // A identidade usada em requests de outro contexto é criada separadamente.
        const novoEmail = `outro-login-${Date.now()}@example.test`
        assert.equal((await enviar('/api/auth/cadastro', { nome: 'Outro login', email: novoEmail, senha }, 'POST', outro)).status(), 201)
        assert.equal((await outro.request.post(`${baseURL}/api/auth/login`, { headers: { [csrf.headerName]: csrf.token }, form: { email: novoEmail, password: senha } })).status(), 204)
        for (const sufixo of ['/clientes', `/entregas/${entrega.id}`, `/movimento?data=${hoje}`]) {
          assert.equal((await outro.request.get(`${baseURL}/api/estabelecimentos/${a.id}${sufixo}`)).status(), 404)
        }
      } finally { await outro.close() }
    })
    await etapa('Link de salto por teclado preserva rota e move foco real', async () => {
      await navegar('Histórico de pedidos')
      const url = pagina.url()
      await pagina.getByRole('link', { name: 'Ir para o conteúdo', exact: true }).focus()
      await pagina.keyboard.press('Enter')
      assert.equal(pagina.url(), url)
      await expect(pagina.locator('main#conteudo')).toBeFocused()
    })
    await etapa('Relatórios identifica desenvolvimento e tema escuro preserva o movimento', async () => {
      await navegar('Relatórios')
      await expect(pagina.getByRole('heading', { name: 'Em desenvolvimento', exact: true })).toBeVisible()
      await pagina.getByRole('button', { name: 'Modo escuro', exact: true }).click()
      await expect(pagina.locator('html')).toHaveAttribute('data-tema', 'escuro')
      await navegar('Movimento do dia')
      await expect(pagina.locator('.metrica').filter({ hasText: 'Saldo do dia' })).toContainText('74,70')
      await pagina.screenshot({ path: join(pasta, 'desktop-escuro.png'), fullPage: true })
      await pagina.getByRole('button', { name: 'Modo claro', exact: true }).click()
      await expect(pagina.locator('html')).toHaveAttribute('data-tema', 'claro')
    })
    for (const [secao, recurso, textoAntigo, textoNovo] of [
      ['Clientes', 'clientes', 'Cliente exclusivo A', 'Cliente exclusivo B'],
      ['Histórico de pedidos', 'entregas', 'Doação fictícia', 'Nenhuma entrega'],
      ['Gastos do dia', 'gastos', 'Centavo fictício', 'Nenhum gasto'],
      ['Movimento do dia', 'movimento', '74,70', '0,00'],
    ]) await etapa(`Resposta atrasada ao trocar empresa: ${secao}`, async () => {
      await trocar(a)
      let capturada = false, liberar, concluir
      const espera = new Promise(ok => { liberar = ok })
      const terminou = new Promise(ok => { concluir = ok })
      const padrao = `**/api/estabelecimentos/${a.id}/${recurso}?*`
      const handler = async rota => {
        try {
          const resposta = await rota.fetch()
          assert.equal(resposta.status(), 200)
          capturada = true
          await espera
          await rota.fulfill({ response: resposta })
        } catch { /* A consulta cancelada ao desmontar não deve repovoar a nova empresa. */ }
        finally { concluir() }
      }
      await pagina.route(padrao, handler)
      try {
        await navegar(secao)
        await expect.poll(() => capturada).toBe(true)
        await trocar(b); await navegar(secao)
        await expect(pagina.locator('main')).toContainText(textoNovo)
        liberar()
        await terminou
        await pagina.evaluate(() => new Promise(requestAnimationFrame))
        await pagina.unroute(padrao, handler)
        await expect(pagina.locator('main')).not.toContainText(textoAntigo)
      } finally { liberar(); await pagina.unroute(padrao, handler) }
    })
    await trocar(a); await navegar('Movimento do dia')
    for (const largura of [390, 360]) await etapa(`Mobile ${largura}px: menu, empresa ativa e ausência de overflow da página`, async () => {
      await pagina.setViewportSize({ width: largura, height: 844 })
      for (const secao of ['Minha empresa', 'Clientes', 'Histórico de pedidos', 'Pagamentos pendentes', 'Gastos do dia', 'Relatórios', 'Movimento do dia']) await navegar(secao)
      await expect(pagina.locator('.metrica').filter({ hasText: 'Recebido no dia' })).toContainText('100,20')
      await expect(pagina.getByRole('button', { name: 'Abrir menu', exact: true })).toBeVisible()
      assert.ok(await pagina.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Página ultrapassou a largura da tela')
      await pagina.screenshot({ path: join(pasta, `mobile-${largura}.png`), fullPage: true })
      await expect(pagina.locator('.topo-mobile')).toContainText(a.nome)
      const tabela = pagina.getByRole('region', { name: 'Recebimentos do dia', exact: true })
      await tabela.focus(); await pagina.keyboard.press('ArrowRight')
      await expect.poll(() => tabela.evaluate(e => e.scrollLeft)).toBeGreaterThan(0)
    })
    await etapa('SMTP capturado somente no Mailpit local', async () => {
      assert.equal((await enviar('/api/auth/recuperar-senha', { email })).status(), 202)
      await expect.poll(async () => (await (await fetch(`${mailURL}/api/v1/messages`)).json()).total).toBe(1)
    })
    await etapa('Sessão invalidada conduz ao login sem repetir escrita após reautenticar', async () => {
      await navegar('Clientes')
      await pagina.getByLabel('Nome', { exact: true }).fill('Não repetir automaticamente')
      assert.equal((await enviar('/api/auth/logout', {})).status(), 204)
      let envios = 0
      const contar = r => { if (r.method() === 'POST' && new URL(r.url()).pathname.endsWith('/clientes')) envios++ }
      pagina.on('request', contar)
      try {
        await pagina.getByRole('button', { name: 'Cadastrar cliente', exact: true }).click()
        await expect(pagina.getByRole('button', { name: 'Entrar na minha conta', exact: true })).toBeVisible()
        await expect(pagina.getByRole('status')).toContainText('sessão expirou')
        assert.equal(envios, 1)
        await pagina.getByLabel('E-mail', { exact: true }).fill(email)
        await pagina.getByLabel('Senha', { exact: true }).fill(senha)
        await pagina.getByRole('button', { name: 'Entrar na minha conta', exact: true }).click()
        await expect(pagina.getByRole('heading', { level: 1, name: 'Clientes', exact: true })).toBeVisible()
        assert.equal(envios, 1)
      } finally { pagina.off('request', contar) }
    })
    await etapa('Sair da conta pela interface invalida acesso ao perfil', async () => {
      await pagina.getByRole('button', { name: 'Sair da conta', exact: true }).click()
      await expect(pagina.getByRole('button', { name: 'Entrar na minha conta', exact: true })).toBeVisible()
      await expect(pagina.getByRole('status')).toContainText('Você saiu da sua conta')
      assert.equal((await contexto.request.get(`${baseURL}/api/auth/me`)).status(), 401)
    })
    await etapa('Sem exceções JavaScript no navegador', async () => { assert.deepEqual(errosJS, []) })
  } finally {
    await writeFile(join(pasta, 'cenarios.json'), JSON.stringify(resultados, null, 2))
    await contexto.close()
  }
  return { navegador: browser.version(), resultados, aprovados: resultados.filter(r => r.aprovado).length, falhas: resultados.filter(r => !r.aprovado).length }
}
