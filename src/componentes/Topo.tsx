import { Link } from 'react-router-dom'
import type { Aba } from '../data/types'
import { IconeAjustes, IconeMais } from './icones'
import { BotaoMenu } from './MenuLateral'
import { SeletorMes } from './SeletorMes'

/** Topo das abas: menu, nome, Ajustes, seletor de mês e o botão + (pequeno, sem cobrir a lista). */
export function Topo({ aba, titulo, aoAdicionar }: { aba: Aba; titulo: string; aoAdicionar?: () => void }) {
  return (
    <header className="topo">
      <div className="topo-linha">
        <div className="topo-com-menu">
          <BotaoMenu />
          <h1>{titulo}</h1>
        </div>
        <Link to="/ajustes" className="botao-icone" aria-label="Ajustes">
          <IconeAjustes />
        </Link>
      </div>
      <div className="topo-linha">
        <SeletorMes />
        {aoAdicionar && (
          <button type="button" className={`botao-mais botao-${aba}`} onClick={aoAdicionar} aria-label="Novo gasto">
            <IconeMais tamanho={20} />
          </button>
        )}
      </div>
    </header>
  )
}
