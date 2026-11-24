// Fatura do Nubank: tudo no crédito que conta no mês (compras, parcelas e fixos). A fatura do mês fecha
// no dia 1 do mês seguinte e vence no dia 8. Testes em fatura.test.ts.

import type { Dados } from '../data/types'
import { certosDoMes, outrosDoMes } from './calculos'
import { dataNoMes, diasEntre, somarMeses } from './datas'
import { somar } from './dinheiro'

export const DIA_FECHA = 1
export const DIA_VENCE = 8

export interface Fatura {
  mes: string
  total: number
  /** Quantos itens no crédito. */
  itens: number
  fecha: string
  vence: string
  /** Fechada: já passou do dia em que fecha. */
  fechada: boolean
  /** Dias até vencer (negativo = já venceu). */
  diasParaVencer: number
  /** Todos os itens marcados como pagos. */
  paga: boolean
  /** O que já está lançado para a fatura seguinte (parcelas, fixos, compras do fim do mês). */
  proxima: number
}

/** O que entra na fatura do mês: tudo do Nubank no crédito (compras, parcelas e fixos). */
export function itensDaFatura(dados: Dados, mes: string, hoje: string) {
  return [...certosDoMes(dados, 'nubank', mes, hoje), ...outrosDoMes(dados, 'nubank', mes)].filter((g) => g.forma !== 'debito')
}

export function faturaDoMes(dados: Dados, mes: string, hoje: string): Fatura {
  const itens = itensDaFatura(dados, mes, hoje)
  const seguinte = somarMeses(mes, 1)
  const fecha = dataNoMes(seguinte, DIA_FECHA)
  const vence = dataNoMes(seguinte, DIA_VENCE)
  return {
    mes,
    total: somar(itens.map((g) => g.valor_centavos)),
    itens: itens.length,
    fecha,
    vence,
    fechada: hoje >= fecha,
    diasParaVencer: diasEntre(hoje, vence),
    paga: itens.length > 0 && itens.every((g) => g.pago),
    proxima: somar(itensDaFatura(dados, seguinte, hoje).map((g) => g.valor_centavos)),
  }
}
