import { dataCurta } from '../lib/datas'
import { formatarReais } from '../lib/dinheiro'
import type { Forma } from '../data/types'
import { IconeCarteira, IconeCategoria, IconeNota } from './icones'

interface Props {
  descricao: string
  categoria: string
  valor_centavos: number
  data: string
  forma?: Forma | null
  /** Texto extra abaixo da descrição (ex.: "2 de 2"). */
  detalhe?: string
  positivo?: boolean
  /** Troca o ícone da categoria (ex.: "Depósito"). */
  icone?: string
  /** Anotação mostrada embaixo (ex.: com qual dinheiro foi pago). */
  observacao?: string
  /** Pago com dinheiro à parte (marca embaixo do gasto). */
  dinheiro_a_parte?: boolean
  /** Selo PAGO / NÃO PAGO (sem o selo quando não informado). */
  pago?: boolean
  aoAlternarPago?: () => void
}

export function LinhaGasto({ descricao, categoria, valor_centavos, data, forma, detalhe, positivo, icone, pago, aoAlternarPago, observacao, dinheiro_a_parte }: Props) {
  const partes = [detalhe ?? dataCurta(data), forma === 'debito' ? 'Débito' : forma === 'credito' ? 'Crédito' : null]
  return (
    <div className="linha-gasto">
      <span className="linha-icone" aria-hidden="true">
        <IconeCategoria nome={icone ?? categoria} />
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
        {dinheiro_a_parte && (
          <small className="linha-dinheiro">
            <IconeCarteira tamanho={12} /> Dinheiro à parte
          </small>
        )}
        {observacao && (
          <small className="linha-obs">
            <IconeNota tamanho={12} /> {observacao}
          </small>
        )}
      </span>
      <span className="linha-valor">
        <strong className={positivo ? 'positivo' : undefined}>
          {positivo ? '+' : '−'}
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
            {pago ? 'Pago' : 'Não pago'}
          </button>
        )}
        </span>
      </span>
    </div>
  )
}
