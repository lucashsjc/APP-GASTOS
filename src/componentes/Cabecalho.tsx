import { Link, NavLink, useLocation } from 'react-router-dom'
import { ehAreaBanco } from '../lib/areas'
import { LogoLK } from './Abertura'
import { BotaoMenu } from './MenuLateral'

const LINKS = [
  { rota: '/', nome: 'Hoje' },
  { rota: '/nubank', nome: 'Banco' },
  { rota: '/faculdade', nome: 'Faculdade' },
  { rota: '/projetos', nome: 'Projetos' },
]

/** Cabeçalho de todas as telas: o LK, o nome, o menu e as áreas em texto, com a linha verde-água embaixo. */
export function Cabecalho() {
  const { pathname } = useLocation()
  const ativa = (rota: string) =>
    rota === '/' ? pathname === '/' : rota === '/nubank' ? ehAreaBanco(pathname) : pathname.startsWith(rota)

  return (
    <header className="cabecalho">
      <div className="cabecalho-topo">
        <div className="cabecalho-marca">
          <LogoLK largura={62} />
          <span>
            <small>Minha rotina</small>
            <small>Lucas · {new Date().getFullYear()}</small>
          </span>
        </div>
        <div className="cabecalho-acoes">
          <Link to="/assistente" className={`botao-assistente ${pathname === '/assistente' ? 'ativo' : ''}`} aria-label="Assistente com IA">
            <span aria-hidden="true">✦</span> IA
          </Link>
          <BotaoMenu />
        </div>
      </div>
      <nav className="cabecalho-nav" aria-label="Áreas">
        {LINKS.map((l) => (
          <NavLink key={l.rota} to={l.rota} className={ativa(l.rota) ? 'ativo' : undefined} end={l.rota === '/'}>
            {l.nome}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}
