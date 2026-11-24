// Fechamento do mês: o balanço de um mês que acabou (Nubank e Caju) e quanto sobrou para mandar ao
// cofrinho. Testes em fechamento.test.ts.

import type { Dados } from '../data/types'
import { depositosDoMes, recebidoDoMes, resumoNubank, saldoCajuDoMes } from './calculos'
import { diaDe, mesDe, somarMeses } from './datas'
import { somar } from './dinheiro'
import { resumoDoMes } from './extras'
import { faturaDoMes, type Fatura } from './fatura'

export interface Fechamento {
  mes: string
  nubank: {
    recebido: number
    /** Tudo o que saiu no mês (fixos, parcelas e compras, inclusive os à parte). */
    gasto: number
    guardado: number
    /** O que sobrou do recebido: dá para mandar para o cofrinho. */
    sobra: number
    variacao: number | null
    campea: { categoria: string; total: number; percentual: number } | null
    compras: number
  }
  caju: {
    depositado: number
    gasto: number
    /** Saldo que ficou no Caju (não passa para o mês seguinte). */
    saldo: number
    campea: { categoria: string; total: number; percentual: number } | null
  }
  fatura: Fatura
  /** Tem o recebido do Nubank: sem ele não dá para dizer quanto sobrou. */
  temRecebido: boolean
}

export function fechamentoDoMes(dados: Dados, mes: string, hoje: string): Fechamento {
  const nu = resumoNubank(dados, mes, hoje)
  const rNu = resumoDoMes(dados, 'nubank', mes, hoje)
  const rCaju = resumoDoMes(dados, 'caju', mes, hoje)
  const depositado = somar(depositosDoMes(dados, mes).map((d) => d.valor_centavos))
  const recebido = recebidoDoMes(dados, mes)
  return {
    mes,
    nubank: {
      recebido,
      gasto: nu.certos.total + nu.outros + nu.aParte,
      guardado: nu.guardado,
      sobra: Math.max(0, nu.livre),
      variacao: rNu.variacao,
      campea: rNu.campea,
      compras: rNu.compras,
    },
    caju: {
      depositado,
      gasto: rCaju.total,
      saldo: saldoCajuDoMes(dados, mes, hoje),
      campea: rCaju.campea,
    },
    fatura: faturaDoMes(dados, mes, hoje),
    temRecebido: recebido > 0,
  }
}

/**
 * Aviso do Hoje nos 10 primeiros dias do mês: o mês passado fechou e sobrou dinheiro no Nubank que
 * ainda não foi para o cofrinho. Null quando não tem nada para mostrar.
 */
export function sobraParaGuardar(dados: Dados, hoje: string): { mes: string; valor: number } | null {
  if (diaDe(hoje) > 10) return null
  const mes = somarMeses(mesDe(hoje), -1)
  if (recebidoDoMes(dados, mes) <= 0) return null
  const livre = resumoNubank(dados, mes, hoje).livre
  return livre > 0 ? { mes, valor: livre } : null
}
