import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Perfil } from './api/auth'
import { sair } from './api/auth'
import Marca from './components/Marca'
import ThemeSwitch from './ThemeSwitch'

import Gastos from './Gastos'
import Clientes from './Clientes'
import Entregas from './Entregas'
import Movimento from './Movimento'
import MinhaEmpresa from './MinhaEmpresa'
import Empresas from './Empresas'
import type { EmpresaSalva } from './api/estabelecimentos'
import type { IdentidadeEmpresa } from './MinhaEmpresa'

const secoes = [
  { id: 'empresa', titulo: 'Minha empresa', icone: 'empresa' },
  { id: 'dashboard', titulo: 'Movimento do dia', icone: 'painel' },
  { id: 'clientes', titulo: 'Clientes', icone: 'pessoas' },
  { id: 'historico', titulo: 'Histórico de pedidos', icone: 'relatorio' },
  { id: 'pendentes', titulo: 'Pagamentos pendentes', icone: 'relogio' },
  { id: 'despesas', titulo: 'Gastos do dia', icone: 'carteira' },
  { id: 'relatorios', titulo: 'Relatórios', icone: 'relatorio' },
] as const
type Secao = typeof secoes[number]['id']

function Icone({ nome }: { nome: string }) {
  const caminhos: Record<string, ReactNode> = {
    empresa: <><path d="M4 21V3h12v18M16 9h4v12M2 21h20M8 7h4M8 11h4M8 15h4M8 21v-3h4v3" /></>,
    painel: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    pessoas: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 4v3" /></>,
    relogio: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    carteira: <><rect x="3" y="6" width="18" height="15" rx="2" /><path d="M3 6V4a1 1 0 0 1 1-1h14v3m-2 6h5v5h-5Z" /></>,
    relatorio: <><path d="M5 3h10l4 4v14H5ZM14 3v5h5M8 17v-4m4 4v-6m4 6v-3" /></>,
  }
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{caminhos[nome] ?? caminhos.painel}</svg>
}

function secaoAtual(): Secao {
  const id = window.location.hash.replace('#/', '')
  return secoes.some(s => s.id === id) ? id as Secao : 'empresa'
}

function Badge({ children, tom = 'neutro' }: { children: ReactNode; tom?: 'neutro' | 'azul' | 'alerta' | 'sucesso' }) {
  return <span className={`badge badge-${tom}`}>{children}</span>
}

const mensagensPendentes = {
  relatorios: 'Os relatórios financeiros estarão disponíveis após a integração dos atendimentos e recebimentos.',
} as const

function EmDesenvolvimento({ secao }: { secao: keyof typeof mensagensPendentes }) {
  return <section className="painel" aria-labelledby="desenvolvimento-titulo">
    <div className="painel-titulo"><div><h2 id="desenvolvimento-titulo">Em desenvolvimento</h2><p>{mensagensPendentes[secao]}</p></div></div>
    <p className="rodape-painel">Você já pode gerenciar clientes, entregas, recebimentos e gastos do dia.</p>
  </section>
}

export default function Workspace({ perfil, aoSair }: { perfil: Perfil; aoSair: () => void }) {
  const [secao, setSecao] = useState<Secao>(secaoAtual)
  const [menu, setMenu] = useState(false)
  const [empresa, setEmpresa] = useState<IdentidadeEmpresa>({ nome: '' })
  const [empresaSalva, setEmpresaSalva] = useState<EmpresaSalva | null>(null)
  const selecionarEmpresa = useCallback((salva: EmpresaSalva | null) => {
    setEmpresaSalva(salva)
    setEmpresa({ nome: salva?.nome ?? '' })
  }, [])
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const titulo = useRef<HTMLHeadingElement>(null)
  const atual = secoes.find(s => s.id === secao)!
  useEffect(() => {
    const mudar = () => { setSecao(secaoAtual()); setMenu(false); requestAnimationFrame(() => titulo.current?.focus()) }
    window.addEventListener('hashchange', mudar)
    return () => window.removeEventListener('hashchange', mudar)
  }, [])
  useEffect(() => { document.title = `${atual.titulo} | NextFlow` }, [atual.titulo])

  async function desconectar() {
    if (enviando) return
    setEnviando(true); setErro('')
    try { await sair(); aoSair() }
    catch (falha) { setErro(falha instanceof Error ? falha.message : 'Não foi possível sair. Tente novamente.') }
    finally { setEnviando(false) }
  }
  return <div className="workspace">
    <header className="topo-mobile"><div className="identidade-mobile"><Marca /><p className="empresa-mobile"><span>Empresa ativa</span><strong>{empresaSalva?.nome || 'Selecione uma empresa'}</strong></p></div><button className="botao-secundario" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-controls="navegacao">{menu ? 'Fechar menu' : 'Abrir menu'}</button></header>
    <aside className={`sidebar ${menu ? 'menu-aberto' : ''}`}><Marca /><div className="negocio-demo">{empresa.icone ? <img className="negocio-icone" src={empresa.icone} alt="" /> : null}<div><strong>{empresa.nome || 'Minha empresa'}</strong><small>{empresaSalva ? 'Empresa cadastrada' : 'Selecione ou cadastre sua empresa'}</small></div></div>
      <nav id="navegacao" aria-label="Menu principal">{secoes.map(s => <a key={s.id} href={`#/${s.id}`} aria-current={secao === s.id ? 'page' : undefined} onClick={() => setMenu(false)}><Icone nome={s.icone} />{s.titulo}</a>)}</nav>
      <div className="sidebar-rodape"><Badge tom="azul">NextFlow</Badge><p>Um jeito mais claro de acompanhar seu negócio.</p><div className="usuario-sidebar"><span className="avatar">{perfil.email[0].toUpperCase()}</span><div><small>Sua conta</small><span title={perfil.email}>{perfil.email}</span></div></div></div>
    </aside>
    <div className="workspace-corpo"><header className="workspace-topo"><span>Seu espaço de gestão</span><div className="acoes-cabecalho"><ThemeSwitch /><button className="botao-secundario" onClick={desconectar} disabled={enviando}>{enviando ? 'Saindo…' : 'Sair da conta'}</button></div></header>
      <main id="conteudo" className="workspace-conteudo" tabIndex={-1}><div className="cabecalho-pagina"><div><h1 ref={titulo} tabIndex={-1}>{atual.titulo}</h1><p>{secao === 'empresa' ? 'Apresente seu negócio e organize as informações da empresa.' : secao === 'dashboard' ? 'Confira entregas, recebimentos e gastos de cada dia.' : secao === 'clientes' ? 'Organize os contatos de cada empresa.' : secao === 'historico' ? 'Consulte os pedidos de cada cliente, com datas, valores e situações.' : secao === 'pendentes' ? 'Acompanhe os saldos pendentes e registre os recebimentos.' : secao === 'despesas' ? 'Tenha clareza sobre os custos do seu negócio.' : 'Transforme movimentações em uma visão mais clara do período.'}</p></div></div>
        {erro ? <div className="erro" role="alert">{erro}</div> : null}
        <div hidden={secao !== 'empresa'}><Empresas aoSelecionar={selecionarEmpresa} /></div>
        {secao === 'empresa' ? <MinhaEmpresa key={empresaSalva?.id ?? 'nova'} identidade={empresa} empresaSalva={empresaSalva} aoSalvar={setEmpresaSalva} aoConferir={identidade => setEmpresa({ ...identidade, nome: empresaSalva?.nome ?? identidade.nome })} />
          : secao === 'dashboard' || secao === 'despesas' || secao === 'clientes' || secao === 'historico' || secao === 'pendentes' ? empresaSalva
            ? secao === 'dashboard' ? <Movimento key={empresaSalva.id} empresaId={empresaSalva.id} /> : secao === 'historico' || secao === 'pendentes' ? <Entregas key={`${empresaSalva.id}-${secao}`} empresaId={empresaSalva.id} pendentes={secao === 'pendentes'} /> : secao === 'clientes' ? <Clientes key={empresaSalva.id} empresaId={empresaSalva.id} /> : <Gastos key={empresaSalva.id} empresaId={empresaSalva.id} />
            : <section className="painel"><p className="rodape-painel">Selecione ou cadastre uma empresa em <a href="#/empresa">Minha empresa</a> para {secao === 'clientes' ? 'gerenciar clientes' : secao === 'despesas' ? 'registrar gastos' : 'gerenciar entregas e recebimentos'}.</p></section>
          : <EmDesenvolvimento secao={secao} />}
        <footer className="workspace-rodape"><span>NextFlow © {new Date().getFullYear()}</span><span>Valores em reais (BRL)</span></footer>
      </main>
    </div>
  </div>
}


