import { categoria as dadosCategoria } from '../lib/categorias'
import { dataCurta, diaDe } from '../lib/datas'
import { formatarReais } from '../lib/dinheiro'
import type { Forma } from '../data/types'

interface Props {
  descricao: string
  categoria: string
  valor_centavos: number
  data: string
  forma?: Forma | null
  /** Texto extra abaixo da descrição (ex.: "2 de 2"). */
  detalhe?: string
  /** Para os certos: já caiu ou vai cair. */
  status?: 'caiu' | 'vai_cair'
  aoTocarStatus?: () => void
  positivo?: boolean
  /** Troca o ícone da categoria (ex.: depósito). */
  icone?: { simbolo: string; cor: string }
  /** Selo PAGO / NÃO PAGO (sem o selo quando não informado). */
  pago?: boolean
  aoAlternarPago?: () => void
}

export function LinhaGasto({ descricao, categoria, valor_centavos, data, forma, detalhe, status, aoTocarStatus, positivo, icone, pago, aoAlternarPago }: Props) {
  const base = dadosCategoria(categoria)
  const cat = icone ? { ...base, icone: icone.simbolo, cor: icone.cor } : base
  const partes = [detalhe ?? dataCurta(data), forma === 'debito' ? 'Débito' : forma === 'credito' ? 'Crédito' : null]
  return (
    <div className="linha-gasto">
      <span className="linha-icone" style={{ background: `${cat.cor}22`, color: cat.cor }} aria-hidden="true">
        {cat.icone}
      </span>
      <span className="linha-texto">
        <strong>{descricao}</strong>
        <small>
          {partes.filter(Boolean).map((p, i) => (
            <span key={i} className={p === 'Débito' ? 'marca-debito' : undefined}>
              {i > 0 && ' · '}
              {p}
            </span>
          ))}
        </small>
      </span>
      <span className="linha-valor">
        <strong className={positivo ? 'positivo' : undefined}>
          {positivo ? '+' : ''}
          {formatarReais(valor_centavos)}
        </strong>
        <span className="selos">
        {pago !== undefined && (
          <button
            type="button"
            className={`selo-pago${pago ? ' pago' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              aoAlternarPago?.()
            }}
            disabled={!aoAlternarPago}
            aria-pressed={pago}
            title={aoAlternarPago ? (pago ? 'Marcar como não pago' : 'Marcar como pago') : undefined}
          >
            {pago ? 'PAGO' : 'NÃO PAGO'}
          </button>
        )}
        {status && (
          <button
            type="button"
            className={`status status-${status}`}
            onClick={(e) => {
              e.stopPropagation()
              aoTocarStatus?.()
            }}
            disabled={!aoTocarStatus}
            title={aoTocarStatus ? (status === 'caiu' ? 'Desmarcar como caído' : 'Marcar como já caído') : undefined}
          >
            {status === 'caiu' ? 'caiu' : `dia ${diaDe(data)}`}
          </button>
        )}
        </span>
      </span>
    </div>
  )
}
