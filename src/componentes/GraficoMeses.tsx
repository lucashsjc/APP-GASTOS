import { useState } from 'react'
import type { Aba } from '../data/types'
import { useEstado } from '../estado'
import { mesDe, nomeDoMes, somarMeses } from '../lib/datas'
import { formatarReais } from '../lib/dinheiro'
import { resumoDoMes } from '../lib/extras'

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** Barras com o total gasto em cada um dos últimos 6 meses. Tocar numa barra mostra o valor do mês. */
export function GraficoMeses({ aba }: { aba: Aba }) {
  const { dados, hoje } = useEstado()
  const atual = mesDe(hoje)
  const meses = Array.from({ length: 6 }, (_, i) => somarMeses(atual, i - 5)).map((mes) => ({
    mes,
    total: resumoDoMes(dados, aba, mes, hoje).total,
  }))
  const [escolhido, setEscolhido] = useState(atual)
  const maior = Math.max(...meses.map((m) => m.total), 1)
  const fechados = meses.filter((m) => m.mes !== atual && m.total > 0)
  const media = fechados.length ? Math.round(fechados.reduce((s, m) => s + m.total, 0) / fechados.length) : null
  const sel = meses.find((m) => m.mes === escolhido) ?? meses[meses.length - 1]
  if (meses.every((m) => m.total === 0)) return null

  return (
    <section className="card grafico-meses">
      <div className="grafico-topo">
        <h2>Gastos por mês</h2>
        <span>
          <small>{sel.mes === atual ? `${nomeDoMes(sel.mes)} até agora` : nomeDoMes(sel.mes)}</small>
          <strong>{formatarReais(sel.total)}</strong>
        </span>
      </div>
      <div className="grafico-area" role="group" aria-label="Total gasto nos últimos 6 meses">
        {media !== null && (
          <div className="grafico-media" style={{ bottom: `${(media / maior) * 100}%` }} aria-hidden="true">
            <span>média {formatarReais(media)}</span>
          </div>
        )}
        {meses.map((m) => (
          <button
            key={m.mes}
            type="button"
            className={`grafico-coluna${m.mes === sel.mes ? ' ativo' : ''}${m.mes === atual ? ' atual' : ''}`}
            onClick={() => setEscolhido(m.mes)}
            onMouseEnter={() => setEscolhido(m.mes)}
            aria-label={`${nomeDoMes(m.mes)}: ${formatarReais(m.total)}`}
            aria-pressed={m.mes === sel.mes}
          >
            <span className="grafico-barra" style={{ height: `${Math.max(m.total > 0 ? 2 : 0, (m.total / maior) * 100)}%` }} />
          </button>
        ))}
      </div>
      <div className="grafico-eixo" aria-hidden="true">
        {meses.map((m) => (
          <span key={m.mes} className={m.mes === sel.mes ? 'ativo' : undefined}>
            {MESES_CURTOS[Number(m.mes.slice(5)) - 1]}
          </span>
        ))}
      </div>
      {media !== null && (
        <p className="nota">
          {sel.mes === atual
            ? sel.total > media
              ? `Este mês já passou da média dos últimos meses.`
              : `Faltam ${formatarReais(media - sel.total)} para chegar na média dos últimos meses.`
            : sel.total > media
              ? `${formatarReais(sel.total - media)} acima da média.`
              : `${formatarReais(media - sel.total)} abaixo da média.`}
        </p>
      )}
    </section>
  )
}
