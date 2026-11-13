import { BotaoMenu } from './MenuLateral'

/** Cabeçalho de todas as telas: o LK, o nome, o menu e as áreas em texto, com a linha verde-água embaixo. */
export function Cabecalho() {

  return (
    <header className="cabecalho">
      <div className="cabecalho-topo">
        <div className="cabecalho-marca">
          <span>
            <small>Minha rotina</small>
            <small>Lucas · {new Date().getFullYear()}</small>
          </span>
        </div>
        <BotaoMenu />
      </div>
    </header>
  )
}
