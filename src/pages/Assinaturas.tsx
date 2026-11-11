import { useNavigate } from 'react-router-dom'
import { IconeAnterior, IconeCategoria } from '../componentes/icones'
import { useEstado } from '../estado'
import { categoria } from '../lib/categorias'
import { formatarReais, somar } from '../lib/dinheiro'
import { assinaturas } from '../lib/extras'

/** Tudo o que é cobrado todo mês (cadastrado ou achado pelo app) e quanto isso dá por ano. */
export default function Assinaturas() {
  const { dados, hoje } = useEstado()
  const navegar = useNavigate()
  const lista = assinaturas(dados, hoje)
  const mensal = somar(lista.map((a) => a.mensal))
  const achadas = lista.filter((a) => a.origem === 'repetido')

  return (
    <div className="pagina pagina-assinaturas">
      <header className="topo">
        <div className="topo-linha">
          <button type="button" className="voltar" onClick={() => navegar(-1)}>
            <IconeAnterior tamanho={18} /> Voltar
          </button>
        </div>
        <h1>Assinaturas e fixos</h1>
      </header>

      {lista.length === 0 ? (
        <p className="vazio">Nada que se repita todo mês por enquanto.</p>
      ) : (
        <>
          <section className="card-principal card-resumo">
            <span className="resumo-rotulo">Cobrado todo mês</span>
            <strong className="busca-total">{formatarReais(mensal)}</strong>
            <span className="resumo-sub">
              <b>{formatarReais(mensal * 12)}</b> por ano · {lista.length} {lista.length === 1 ? 'item' : 'itens'}
            </span>
          </section>

          {achadas.length > 0 && (
            <p className="nota">
              ✦ O app achou {achadas.length === 1 ? '1 gasto' : `${achadas.length} gastos`} que se repete
              {achadas.length === 1 ? '' : 'm'} todo mês com o mesmo valor. Se for assinatura, cadastre como “Todo mês” nos
              Fixos para ele entrar sozinho.
            </p>
          )}

          <ul className="lista lista-assinaturas">
            {lista.map((a) => (
              <li key={`${a.aba}:${a.descricao}`} className="card assinatura">
                <span className="resumo-icone" style={{ background: categoria(a.categoria).cor }}>
                  <IconeCategoria nome={a.categoria} tamanho={18} />
                </span>
                <div className="assinatura-info">
                  <strong>{a.descricao}</strong>
                  <small>
                    {a.aba === 'nubank' ? 'Nubank' : 'Caju'} ·{' '}
                    {a.origem === 'fixo' ? 'cadastrado como todo mês' : `achado em ${a.meses} dos últimos 6 meses`}
                  </small>
                </div>
                <div className="assinatura-valores">
                  <strong>{formatarReais(a.mensal)}</strong>
                  <small>{formatarReais(a.anual)}/ano</small>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
