import { useEffect, useState } from 'react'
import { Cabecalho } from './componentes/Cabecalho'
import { BrowserRouter, Link, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { IconeFaculdade, IconeHoje, Logo } from './componentes/icones'
import { modoDemonstracao } from './data/repo'
import { supabase } from './data/supabaseRepo'
import { ProvedorDeDados, useEstado } from './estado'
import { ProvedorFaculdade } from './faculdade/estado'
import PaginaFaculdade from './faculdade/PaginaFaculdade'
import PaginaHoje from './hoje/PaginaHoje'
import Ajustes from './pages/Ajustes'
import Assinaturas from './pages/Assinaturas'
import Busca from './pages/Busca'
import Cofrinho from './pages/Cofrinho'
import Desejos from './pages/Desejos'
import ResumoMes from './pages/ResumoMes'
import PaginaProjetos from './projetos/PaginaProjetos'
import PaginaReadme from './projetos/PaginaReadme'
import Certos from './pages/Certos'
import EmBreve from './pages/EmBreve'
import Importar from './pages/Importar'
import Login from './pages/Login'
import PaginaAba from './pages/PaginaAba'
import ParaOnde from './pages/ParaOnde'

export default function App() {
  const [sessao, setSessao] = useState<Session | null | undefined>(modoDemonstracao ? null : undefined)
  const [semResposta, setSemResposta] = useState(false)

  useEffect(() => {
    if (!supabase) return
    // Se o Supabase não responder (ex.: projeto pausado), avisa em vez de ficar carregando para sempre.
    const espera = window.setTimeout(() => setSemResposta(true), 12000)
    supabase.auth
      .getSession()
      .then(({ data }) => setSessao(data.session))
      .catch(() => setSemResposta(true))
      .finally(() => window.clearTimeout(espera))
    const { data } = supabase.auth.onAuthStateChange((_evento, nova) => setSessao(nova))
    return () => {
      window.clearTimeout(espera)
      data.subscription.unsubscribe()
    }
  }, [])

  if (sessao === undefined) {
    if (!semResposta) return <div className="carregando">Carregando…</div>
    return (
      <div className="carregando sem-resposta">
        <p>O servidor não respondeu.</p>
        <small>Confira a internet. Se estiver tudo certo, o projeto no Supabase pode estar pausado: abra supabase.com e clique em Restore project.</small>
        <button type="button" className="botao-texto" onClick={() => window.location.reload()}>
          Tentar de novo
        </button>
      </div>
    )
  }
  if (!modoDemonstracao && !sessao) return <Login />

  return (
    <ProvedorDeDados key={sessao?.user.id ?? 'demo'}>
      <ProvedorFaculdade>
      <BrowserRouter>
        {modoDemonstracao && <div className="aviso-demo">Modo demonstração: dados de exemplo, só neste aparelho.</div>}
        <main className="conteudo">
          <Cabecalho />
          <Transicao>
          <Routes>
            <Route path="/" element={<PaginaHoje />} />
            <Route path="/nubank" element={<PaginaAba aba="nubank" />} />
            <Route path="/caju" element={<PaginaAba aba="caju" />} />
            <Route path="/nubank/certos" element={<Certos aba="nubank" />} />
            <Route path="/caju/certos" element={<Certos aba="caju" />} />
            <Route path="/nubank/para-onde" element={<ParaOnde aba="nubank" />} />
            <Route path="/caju/para-onde" element={<ParaOnde aba="caju" />} />
            <Route path="/nubank/extrato" element={<PaginaAba aba="nubank" extrato />} />
            <Route path="/caju/extrato" element={<PaginaAba aba="caju" extrato />} />
            <Route path="/nubank/detalhes" element={<PaginaAba aba="nubank" detalhado />} />
            <Route path="/caju/detalhes" element={<PaginaAba aba="caju" detalhado />} />
            <Route path="/nubank/resumo" element={<ResumoMes aba="nubank" />} />
            <Route path="/caju/resumo" element={<ResumoMes aba="caju" />} />
            <Route path="/busca" element={<Busca />} />
            <Route path="/cofrinho" element={<Cofrinho />} />
            <Route path="/compras-futuras" element={<Desejos />} />
            <Route path="/assinaturas" element={<Assinaturas />} />
            <Route path="/ajustes" element={<Ajustes email={sessao?.user.email ?? null} />} />
            <Route path="/ajustes/importar" element={<Importar />} />
            <Route
              path="/faculdade"
              element={<Outlet />}
            >
              <Route index element={<Navigate to="materias" replace />} />
              <Route path="materias" element={<PaginaFaculdade secao="materias" />} />
              <Route path="materia/:id" element={<PaginaFaculdade secao="materia" />} />
              <Route path="notas" element={<PaginaFaculdade secao="notas" />} />
              <Route path="faltas" element={<PaginaFaculdade secao="faltas" />} />
              <Route path="calendario" element={<PaginaFaculdade secao="calendario" />} />
              <Route path="atividades" element={<Navigate to="/faculdade/calendario" replace />} />
            </Route>
            <Route path="/trabalho" element={<EmBreve titulo="Trabalho" />} />
            <Route path="/projetos" element={<PaginaProjetos />} />
            <Route path="/projetos/:repo" element={<PaginaReadme />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Transicao>
        </main>
        <ErroEAviso />
        <BarraPrincipal />
      </BrowserRouter>
      </ProvedorFaculdade>
    </ProvedorDeDados>
  )
}

/** Cada tela entra com um deslize curto (a chave muda com a rota e a animação roda de novo). */
function Transicao({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  return (
    <div key={pathname} className="transicao">
      {children}
    </div>
  )
}

/** Barra de baixo de todas as telas, como nos apps de banco: a área aberta fica numa pílula grafite. */
function BarraPrincipal() {
  const { pathname } = useLocation()
  // Telas do Nubank que ficam fora de /nubank (cofrinho, compras futuras, busca, assinaturas).
  const doNubank = /^\/(nubank|cofrinho|compras-futuras|busca|assinaturas)(\/|$)/.test(pathname)
  const itens = [
    { rota: '/', nome: 'Hoje', ativo: pathname === '/', icone: <IconeHoje tamanho={22} /> },
    { rota: '/nubank', nome: 'Nubank', ativo: doNubank, icone: <Logo aba="nubank" tamanho={24} /> },
    { rota: '/caju', nome: 'Caju', ativo: pathname.startsWith('/caju'), icone: <Logo aba="caju" tamanho={24} /> },
    { rota: '/faculdade', nome: 'Faculdade', ativo: pathname.startsWith('/faculdade'), icone: <IconeFaculdade tamanho={22} /> },
  ]
  if (pathname.startsWith('/ajustes') || pathname.startsWith('/projetos') || pathname.startsWith('/trabalho')) return null
  return (
    <nav className="barra-principal" aria-label="Áreas">
      {itens.map((i) => (
        <Link key={i.rota} to={i.rota} className={i.ativo ? 'ativo' : undefined} aria-current={i.ativo ? 'page' : undefined}>
          <span className="barra-principal-icone">{i.icone}</span>
          {i.nome}
        </Link>
      ))}
    </nav>
  )
}

function ErroEAviso() {
  const { erro, aviso, recarregar } = useEstado()
  return (
    <>
      {erro && (
        <div className="faixa-erro" role="alert">
          Não foi possível carregar os dados: {erro}{' '}
          <button type="button" className="botao-texto" onClick={recarregar}>
            Tentar de novo
          </button>
        </div>
      )}
      {aviso && (
        <div className="aviso-flutuante" role="status">
          {aviso}
        </div>
      )}
    </>
  )
}
