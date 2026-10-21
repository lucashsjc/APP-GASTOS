import { Link } from 'react-router-dom'
import { IconeAnterior } from '../componentes/icones'
import { SeletorMes } from '../componentes/SeletorMes'
import type { Aba } from '../data/types'
import { useEstado } from '../estado'
import { gastosDoMes, maisFrequente, porCategoria, ultimosMeses, type FatiaCategoria } from '../lib/analise'
import { categoria } from '../lib/categorias'
import { nomeDoMes } from '../lib/datas'
import { formatarReais, somar } from '../lib/dinheiro'

export default function ParaOnde({ aba }: { aba: Aba }) {
  const { dados, hoje, mes } = useEstado()
  const itens = gastosDoMes(dados, aba, mes, hoje)
  const total = somar(itens.map((i) => i.valor_centavos))
  const fatias = porCategoria(itens)
  const frequente = maisFrequente(itens)
  const meses = ultimosMeses(dados, aba, mes, hoje)
  const maior = Math.max(1, ...meses.map((m) => m.total))

  return (
    <div className={`pagina pagina-${aba}`}>
      <header className="topo">
        <div className="topo-linha">
          <Link to={`/${aba}`} className="voltar">
            <IconeAnterior tamanho={18} /> {aba === 'nubank' ? 'Nubank' : 'Caju'}
          </Link>
        </div>
        <h1>Para onde foi o dinheiro</h1>
        <div className="topo-linha">
          <SeletorMes />
        </div>
      </header>

      {itens.length === 0 ? (
        <p className="vazio">Nenhum gasto em {nomeDoMes(mes)} nesta aba.</p>
      ) : (
        <>
          <section className="card card-rosca">
            <Rosca fatias={fatias} total={total} />
            <ul className="legenda-rosca">
              {fatias.map((f) => (
                <li key={f.categoria}>
                  <i className="ponto" style={{ background: categoria(f.categoria).cor }} />
                  <span>{f.categoria}</span>
                  <strong>{f.percentual}%</strong>
                </li>
              ))}
            </ul>
          </section>

          {frequente && (
            <section className="card destaque-frequente">
              <small>O gasto que mais se repetiu em {nomeDoMes(mes)}</small>
              <strong>
                {frequente.descricao}: {frequente.vezes} vezes, {formatarReais(frequente.total)}
              </strong>
            </section>
          )}

          <section className="secao">
            <h2>Por categoria</h2>
            <ul className="lista lista-categorias">
              {fatias.map((f) => {
                const c = categoria(f.categoria)
                return (
                  <li key={f.categoria} className="card-categoria">
                    <div className="card-categoria-topo">
                      <span className="linha-icone" style={{ background: `${c.cor}22`, color: c.cor }} aria-hidden="true">
                        {c.icone}
                      </span>
                      <strong>{f.categoria}</strong>
                      <span>{formatarReais(f.total)}</span>
                    </div>
                    <div className="barra fina" aria-hidden="true">
                      <span style={{ width: `${f.percentual}%`, background: c.cor }} />
                    </div>
                    <ul className="principais">
                      {f.principais.map((p) => (
                        <li key={p.descricao}>
                          <span>
                            {p.descricao}
                            {p.vezes > 1 && <small> · {p.vezes}x</small>}
                          </span>
                          <span>{formatarReais(p.total)}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                )
              })}
            </ul>
          </section>
        </>
      )}

      <section className="secao">
        <h2>Últimos meses</h2>
        <div className="card barras-meses">
          {meses.map((m) => (
            <div key={m.mes} className={`barra-mes${m.mes === mes ? ' atual' : ''}`}>
              <small className="barra-mes-valor">{m.total ? formatarReais(m.total).replace('R$ ', '').replace(/,\d+$/, '') : ''}</small>
              <div className="barra-mes-coluna">
                <span style={{ height: `${(m.total / maior) * 100}%` }} />
              </div>
              <small>{nomeDoMes(m.mes).slice(0, 3)}</small>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

/** Gráfico de rosca em SVG, uma fatia por categoria. */
function Rosca({ fatias, total }: { fatias: FatiaCategoria[]; total: number }) {
  const raio = 52
  const circunferencia = 2 * Math.PI * raio
  let acumulado = 0
  return (
    <div className="rosca">
      <svg viewBox="0 0 140 140" role="img" aria-label="Gastos por categoria">
        <circle cx="70" cy="70" r={raio} fill="none" stroke="var(--borda)" strokeWidth="18" />
        {fatias.map((f) => {
          const tamanho = total > 0 ? (f.total / total) * circunferencia : 0
          const inicio = acumulado
          acumulado += tamanho
          return (
            <circle
              key={f.categoria}
              cx="70"
              cy="70"
              r={raio}
              fill="none"
              stroke={categoria(f.categoria).cor}
              strokeWidth="18"
              // Um respiro de 2px entre as fatias.
              strokeDasharray={`${Math.max(0, tamanho - (fatias.length > 1 ? 2 : 0))} ${circunferencia}`}
              strokeDashoffset={-inicio}
              transform="rotate(-90 70 70)"
            />
          )
        })}
      </svg>
      <div className="rosca-centro">
        <small>Total</small>
        <strong>{formatarReais(total)}</strong>
      </div>
    </div>
  )
}
