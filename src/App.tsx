import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, NavLink, Route, Routes } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { Logo } from './componentes/icones'
import { modoDemonstracao } from './data/repo'
import { supabase } from './data/supabaseRepo'
import { ProvedorDeDados, useEstado } from './estado'
import Ajustes from './pages/Ajustes'
import Certos from './pages/Certos'
import Importar from './pages/Importar'
import Login from './pages/Login'
import PaginaAba from './pages/PaginaAba'
import ParaOnde from './pages/ParaOnde'

export default function App() {
  const [sessao, setSessao] = useState<Session | null | undefined>(modoDemonstracao ? null : undefined)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSessao(data.session))
    const { data } = supabase.auth.onAuthStateChange((_evento, nova) => setSessao(nova))
    return () => data.subscription.unsubscribe()
  }, [])

  if (sessao === undefined) return <div className="carregando">Carregando…</div>
  if (!modoDemonstracao && !sessao) return <Login />

  return (
    <ProvedorDeDados key={sessao?.user.id ?? 'demo'}>
      <BrowserRouter>
        {modoDemonstracao && <div className="aviso-demo">Modo demonstração: dados de exemplo, só neste aparelho.</div>}
        <main className="conteudo">
          <Routes>
            <Route path="/" element={<Navigate to="/nubank" replace />} />
            <Route path="/nubank" element={<PaginaAba aba="nubank" />} />
            <Route path="/caju" element={<PaginaAba aba="caju" />} />
            <Route path="/nubank/certos" element={<Certos aba="nubank" />} />
            <Route path="/caju/certos" element={<Certos aba="caju" />} />
            <Route path="/nubank/para-onde" element={<ParaOnde aba="nubank" />} />
            <Route path="/caju/para-onde" element={<ParaOnde aba="caju" />} />
            <Route path="/ajustes" element={<Ajustes email={sessao?.user.email ?? null} />} />
            <Route path="/ajustes/importar" element={<Importar />} />
            <Route path="*" element={<Navigate to="/nubank" replace />} />
          </Routes>
        </main>
        <ErroEAviso />
        <nav className="barra-abas" aria-label="Cartões">
          <NavLink to="/nubank" className="aba-nubank">
            <Logo aba="nubank" tamanho={28} />
            <span>Nubank</span>
          </NavLink>
          <NavLink to="/caju" className="aba-caju">
            <Logo aba="caju" tamanho={28} />
            <span>Caju</span>
          </NavLink>
        </nav>
      </BrowserRouter>
    </ProvedorDeDados>
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
