import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ehAreaBanco } from '../lib/areas'
import {
  IconeAjustes,
  IconeBanco,
  IconeFaculdade,
  IconeMenu,
  IconeProjetos,
  IconeTrabalho,
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
          <nav className="menu-lateral" aria-label="Áreas" onClick={(e) => e.stopPropagation()}>
            <h2>Minha rotina</h2>
            <ul>
              {AREAS.map(({ rota, nome, Icone }) => (
                <li key={rota}>
                  <NavLink
                    to={rota}
                    className={() =>
                      (rota === '/nubank' ? ehAreaBanco(pathname) : pathname.startsWith(rota)) ? 'ativo' : ''
                    }
                    onClick={() => setAberto(false)}
                  >
                    <Icone tamanho={20} />
                    <span>{nome}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
            <NavLink to="/ajustes" className="menu-ajustes" onClick={() => setAberto(false)}>
              <IconeAjustes tamanho={20} />
              <span>Ajustes</span>
            </NavLink>
          </nav>
        </div>
      )}
    </>
  )
}
