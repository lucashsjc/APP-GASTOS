import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useEstado } from '../estado'
import { ehAreaBanco } from '../lib/areas'
import { resumoNubank, saldoCajuEm } from '../lib/calculos'
import { mesDe } from '../lib/datas'
import { formatarReais } from '../lib/dinheiro'
import {
  IconeAjustes,
  IconeBanco,
  IconeFaculdade,
  IconeMais,
  IconeMenu,
  IconeProjetos,
  IconeSeta,
  IconeTrabalho,
  Logo,
} from './icones'

// As áreas da rotina. "Banco" é a parte de gastos (Nubank e Caju); as outras ainda vão ganhar conteúdo.
const AREAS = [
  { rota: '/faculdade', nome: 'Faculdade', Icone: IconeFaculdade },
  { rota: '/trabalho', nome: 'Trabalho', Icone: IconeTrabalho },
  { rota: '/nubank', nome: 'Banco', Icone: IconeBanco },
  { rota: '/projetos', nome: 'Projetos', Icone: IconeProjetos },
]

/** Botão de três traços que abre o menu lateral com as áreas. */
export function BotaoMenu() {
  const [aberto, setAberto] = useState(false)
  const { pathname } = useLocation()

  // Fecha ao trocar de página.
  useEffect(() => setAberto(false), [pathname])

  useEffect(() => {
    if (!aberto) return
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false)
    document.addEventListener('keydown', tecla)
    document.body.classList.add('com-folha')
    return () => {
      document.removeEventListener('keydown', tecla)
      document.body.classList.remove('com-folha')
    }
  }, [aberto])

  return (
    <>
      <button type="button" className="botao-icone botao-menu" aria-label="Abrir menu" onClick={() => setAberto(true)}>
        <IconeMenu tamanho={22} />
      </button>
      {aberto && (
        <div className="menu-fundo" onClick={() => setAberto(false)}>
          <PainelMenu aoFechar={() => setAberto(false)} />
        </div>
      )}
    </>
  )
}

function PainelMenu({ aoFechar }: { aoFechar: () => void }) {
  const { pathname } = useLocation()
  const navegar = useNavigate()
  const { dados, hoje } = useEstado()
  const livre = resumoNubank(dados, mesDe(hoje), hoje).livre
  const saldoCaju = saldoCajuEm(dados, hoje, hoje)

  const ativa = (rota: string) => (rota === '/nubank' ? ehAreaBanco(pathname) : pathname.startsWith(rota))

  const novoGasto = () => {
    // No Caju, o gasto novo é do Caju; no resto, do Nubank.
    const aba = pathname.startsWith('/caju') ? 'caju' : 'nubank'
    aoFechar()
    navegar(`/${aba}?novo=1`)
  }

  return (
    <nav className="menu-lateral" aria-label="Menu" onClick={(e) => e.stopPropagation()}>
      <div className="menu-topo">
        <span className="menu-marca" aria-hidden="true">
          <span />
          <span />
        </span>
        <strong>Minha rotina</strong>
        <Link to="/ajustes" className="menu-icone-ajustes" aria-label="Ajustes" onClick={aoFechar}>
          <IconeAjustes tamanho={18} />
        </Link>
      </div>

      <button type="button" className="menu-novo brilho" onClick={novoGasto}>
        <IconeMais tamanho={16} />
        Novo gasto
      </button>

      <h2>Áreas</h2>
      <ul>
        {AREAS.map(({ rota, nome, Icone }) => (
          <li key={rota}>
            <NavLink to={rota} className={() => (ativa(rota) ? 'ativo brilho' : '')} onClick={aoFechar}>
              <span className="menu-icone">
                <Icone tamanho={18} />
              </span>
              <span>{nome}</span>
            </NavLink>
          </li>
        ))}
      </ul>

      <h2>Cartões</h2>
      <ul>
        {(['nubank', 'caju'] as const).map((aba) => (
          <li key={aba}>
            <NavLink to={`/${aba}`} end className={({ isActive }) => (isActive ? 'ativo' : '')} onClick={aoFechar}>
              <span className="menu-icone">
                <Logo aba={aba} tamanho={22} />
              </span>
              <span>{aba === 'nubank' ? 'Nubank' : 'Caju'}</span>
            </NavLink>
          </li>
        ))}
      </ul>

      <Link to="/nubank" className="menu-resumo brilho" onClick={aoFechar}>
        <small>Hoje</small>
        <div>
          <span>Livre no Nubank</span>
          <strong className={livre < 0 ? 'negativo' : undefined}>{formatarReais(livre)}</strong>
        </div>
        <div>
          <span>Saldo no Caju</span>
          <strong className={saldoCaju < 0 ? 'negativo' : undefined}>{formatarReais(saldoCaju)}</strong>
        </div>
        <span className="menu-resumo-link">
          Abrir Banco <IconeSeta tamanho={14} />
        </span>
      </Link>
    </nav>
  )
}
