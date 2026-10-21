import { BotaoMenu } from '../componentes/MenuLateral'

/** Área da rotina que ainda não tem conteúdo. */
export default function EmBreve({ titulo }: { titulo: string }) {
  return (
    <div className="pagina">
      <header className="topo">
        <div className="topo-com-menu">
          <BotaoMenu />
          <h1>{titulo}</h1>
        </div>
      </header>
      <section className="card em-breve">
        <strong>Em breve</strong>
        <p>Esta área ainda vai ganhar conteúdo. Por enquanto, use o menu para ir até o Banco.</p>
      </section>
    </div>
  )
}
