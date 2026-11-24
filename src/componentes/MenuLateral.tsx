import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useEstado } from '../estado'
import { ehAreaBanco } from '../lib/areas'
import { resumoNubank, saldoCajuDoMes } from '../lib/calculos'
import { mesDe } from '../lib/datas'
import { formatarReais } from '../lib/dinheiro'
import { escolherTela, useTela } from '../lib/tela'
import {
  Logo,
  IconeAjustes,
  IconeBanco,
  IconeFaculdade,
  IconeHoje,
  IconeMenu,
  IconeProjetos,
  IconeSeta,
  IconeTrabalho,
} from './icones'

// As áreas da rotina. "Banco" é a parte de gastos (Nubank e Caju); as outras ainda vão ganhar conteúdo.
const AREAS = [
  { rota: '/', nome: 'Hoje', Icone: IconeHoje },
  { rota: '/faculdade', nome: 'Faculdade', Icone: IconeFaculdade },
  { rota: '/univap', nome: 'Projetos UNIVAP', Icone: IconeProjetos },
  { rota: '/trabalho', nome: 'Trabalho', Icone: IconeTrabalho },
  { rota: '/nubank', nome: 'Banco', Icone: IconeBanco },
  { rota: '/projetos', nome: 'Projetos', Icone: IconeProjetos },
]

// No computador não tem a barra de baixo: o Banco vira Nubank e Caju, para trocar com um clique.
const AREAS_PC = AREAS.flatMap((a) =>
  a.rota === '/nubank'
    ? [
        { rota: '/nubank', nome: 'Nubank', Icone: ({ tamanho }: { tamanho?: number }) => <Logo aba="nubank" tamanho={tamanho} /> },
        { rota: '/caju', nome: 'Caju', Icone: ({ tamanho }: { tamanho?: number }) => <Logo aba="caju" tamanho={tamanho} /> },
      ]
    : [a],
)

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

/** O mesmo painel do menu: flutuante no celular, fixo ao lado no computador. */
export function PainelMenu({ aoFechar }: { aoFechar: () => void }) {
  const { pathname } = useLocation()
  const tela = useTela()
  const { dados, hoje } = useEstado()
  const livre = resumoNubank(dados, mesDe(hoje), hoje).livre
  const saldoCaju = saldoCajuDoMes(dados, mesDe(hoje), hoje)

  const ativa = (rota: string) =>
    rota === '/'
      ? pathname === '/'
      : rota === '/nubank'
        ? ehAreaBanco(pathname) && (tela !== 'pc' || !pathname.startsWith('/caju'))
        : pathname.startsWith(rota)

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

      <h2>Áreas</h2>
      <ul>
        {(tela === 'pc' ? AREAS_PC : AREAS).map(({ rota, nome, Icone }) => (
          <li key={rota}>
            <NavLink to={rota} className={() => (ativa(rota) ? 'ativo' : '')} onClick={aoFechar}>
              <span className="menu-icone">
                <Icone tamanho={18} />
              </span>
              <span>{nome}</span>
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="menu-tela">
        <small>Mostrar como</small>
        <div className="segmentado pequeno" role="radiogroup" aria-label="Mostrar como">
          {(
            [
              ['celular', 'Celular'],
              ['pc', 'Computador'],
            ] as const
          ).map(([id, nome]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={tela === id}
              className={tela === id ? 'ativo' : ''}
              onClick={() => {
                escolherTela(id)
                aoFechar()
              }}
            >
              {nome}
            </button>
          ))}
        </div>
      </div>

      <Link to="/nubank" className="menu-resumo" onClick={aoFechar}>
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
