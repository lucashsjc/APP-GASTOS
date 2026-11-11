import { Link } from 'react-router-dom'
import { IconeAnterior, IconeCategoria } from '../componentes/icones'
import { SeletorMes } from '../componentes/SeletorMes'
import { Valor } from '../componentes/Valor'
import type { Aba } from '../data/types'
import { useEstado } from '../estado'
import { categoria } from '../lib/categorias'
import { dataCurta, mesDe, nomeDoMes, somarMeses } from '../lib/datas'
import { formatarReais } from '../lib/dinheiro'
import { resumoDoMes } from '../lib/extras'

/** Fechamento do mês: quanto saiu, a categoria campeã, o dia mais caro e a comparação com o mês anterior. */
export default function ResumoMes({ aba }: { aba: Aba }) {
  const { dados, hoje, mes } = useEstado()
  const r = resumoDoMes(dados, aba, mes, hoje)
  const anterior = nomeDoMes(somarMeses(mes, -1))
  const emAndamento = mes === mesDe(hoje)

  return (
    <div className={`pagina pagina-${aba}`}>
      <header className="topo">
        <div className="topo-linha">
          <Link to={`/${aba}`} className="voltar">
            <IconeAnterior tamanho={18} /> {aba === 'nubank' ? 'Nubank' : 'Caju'}
          </Link>
        </div>
        <h1>Resumo do mês</h1>
        <div className="topo-linha">
          <SeletorMes />
        </div>
      </header>

      {r.compras === 0 ? (
        <p className="vazio">Nenhum gasto em {nomeDoMes(mes)} nesta aba.</p>
      ) : (
        <>
          <section className="card-principal card-resumo">
            <span className="resumo-rotulo">
              {emAndamento ? `${nomeDoMes(mes)} até agora` : `Fechamento de ${nomeDoMes(mes)}`}
            </span>
            <Valor centavos={r.total} />
            <span className="resumo-sub">
              {r.compras} {r.compras === 1 ? 'gasto' : 'gastos'}
              {r.variacao !== null && (
                <>
                  {' · '}
                  <b className={r.variacao > 0 ? 'ruim' : 'bom'}>
                    {r.variacao > 0 ? '▲' : '▼'} {Math.abs(r.variacao)}%
                  </b>{' '}
                  vs {anterior}
                </>
              )}
            </span>
            {r.ritmo !== null && (
              <span className={`resumo-selo ${r.ritmo <= 0 ? 'bom' : 'ruim'}`}>
                {r.ritmo <= 0
                  ? `🏁 ${formatarReais(-r.ritmo)} abaixo do ritmo`
                  : `${formatarReais(r.ritmo)} acima do ritmo`}
              </span>
            )}
          </section>

          <div className="resumo-grade">
            {r.campea && (
              <section className="card resumo-bloco">
                <small>Categoria campeã</small>
                <span className="resumo-icone" style={{ background: categoria(r.campea.categoria).cor }}>
                  <IconeCategoria nome={r.campea.categoria} tamanho={18} />
                </span>
                <strong>{r.campea.categoria}</strong>
                <span>
                  {formatarReais(r.campea.total)} · {r.campea.percentual}%
                </span>
              </section>
            )}
            {r.maiorDia && (
              <section className="card resumo-bloco">
                <small>Dia mais caro</small>
                <strong className="resumo-grande">{dataCurta(r.maiorDia.data)}</strong>
                <span>{formatarReais(r.maiorDia.total)}</span>
              </section>
            )}
            {r.maiorCompra && (
              <section className="card resumo-bloco resumo-largo">
                <small>Maior gasto</small>
                <strong>{r.maiorCompra.descricao}</strong>
                <span>
                  {formatarReais(r.maiorCompra.valor_centavos)} · {dataCurta(r.maiorCompra.data)}
                </span>
              </section>
            )}
          </div>

          <section className="card">
            <h2 className="resumo-titulo">Comparado com {anterior}</h2>
            <div className="resumo-comparacao">
              <div>
                <small>{anterior}</small>
                <strong>{formatarReais(r.anterior)}</strong>
              </div>
              <div>
                <small>{nomeDoMes(mes)}</small>
                <strong>{formatarReais(r.total)}</strong>
              </div>
            </div>
            {r.subiram.length > 0 ? (
              <ul className="resumo-subiram">
                {r.subiram.map((s) => (
                  <li key={s.categoria}>
                    <span>
                      <i className="ponto" style={{ background: categoria(s.categoria).cor }} /> {s.categoria}
                    </span>
                    <b className="ruim">+{formatarReais(s.diferenca)}</b>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="nota">Nenhuma categoria subiu em relação a {anterior}. 👏</p>
            )}
          </section>
        </>
      )}
    </div>
  )
}
