// Telemetria do mês: compara os gastos do dia a dia com o ritmo ideal (o dinheiro do mês dividido
// igualmente pelos dias). Fixos e parcelas ficam de fora (já são certos), para um PORTO não distorcer.
// Testes em ritmo.test.ts.

import type { Aba, Dados } from '../data/types'
import { certosDoMes, depositosDoMes, guardadoDoMes, outrosDoMes, recebidoDoMes } from './calculos'
import { diaDe, diasNoMes, mesDe } from './datas'
import { somar } from './dinheiro'

export interface Ritmo {
  /** O que sobra para o dia a dia: recebido (ou depósitos do Caju) menos fixos e parcelas do mês. */
  orcamento: number
  dias: number
  /** Até que dia o mês já andou (hoje, no mês atual; o último dia, num mês passado). */
  diaAtual: number
  /** Gasto acumulado do dia a dia até cada dia (posição 0 = dia 1), até `diaAtual`. */
  real: number[]
  /** Real − ideal no dia atual. Negativo = abaixo do ritmo (bom); positivo = acima. */
  delta: number
  /** Quanto dá por dia daqui até o fim do mês para fechar no ritmo (null se já estourou). */
  porDiaDaqui: number | null
}

/** O ritmo ideal acumulado no dia `d`. */
export function ideal(r: Pick<Ritmo, 'orcamento' | 'dias'>, d: number): number {
  return Math.round((r.orcamento * d) / r.dias)
}

/** Null para um mês futuro ou sem dinheiro cadastrado. */
export function ritmoDoMes(dados: Dados, aba: Aba, mes: string, hoje: string): Ritmo | null {
  const mesAtual = mesDe(hoje)
  if (mes > mesAtual) return null
  const certos = certosDoMes(dados, aba, mes, hoje).filter((c) => !c.dinheiro_a_parte)
  const dinheiro =
    // No Nubank, o que foi para o cofrinho não é dinheiro do dia a dia.
    aba === 'nubank'
      ? recebidoDoMes(dados, mes) - guardadoDoMes(dados, mes)
      : somar(depositosDoMes(dados, mes).map((d) => d.valor_centavos))
  if (dinheiro <= 0) return null
  const orcamento = dinheiro - somar(certos.map((c) => c.valor_centavos))
  const dias = diasNoMes(mes)
  const diaAtual = mes === mesAtual ? diaDe(hoje) : dias

  const porDia = Array<number>(dias).fill(0)
  for (const g of outrosDoMes(dados, aba, mes)) {
    if (g.dinheiro_a_parte) continue
    // Compra de outro mês que desconta neste (ex.: o Caju do fim do mês): conta no dia 1.
    const dia = mesDe(g.data) === mes ? diaDe(g.data) : 1
    porDia[dia - 1] += g.valor_centavos
  }
  const real: number[] = []
  let acumulado = 0
  for (let d = 1; d <= diaAtual; d++) {
    acumulado += porDia[d - 1]
    real.push(acumulado)
  }
  const delta = acumulado - ideal({ orcamento, dias }, diaAtual)
  const sobra = orcamento - acumulado
  const diasDaqui = dias - diaAtual + (mes === mesAtual ? 1 : 0)
  return {
    orcamento,
    dias,
    diaAtual,
    real,
    delta,
    porDiaDaqui: sobra > 0 && diasDaqui > 0 ? Math.floor(sobra / diasDaqui) : null,
  }
}

export type Veredito = 'cabe' | 'aperta' | 'estoura'

export interface Simulacao {
  /** Quanto sai neste mês (o valor, ou a 1ª parcela). */
  agora: number
  /** Livre (Nubank) ou saldo do mês (Caju), antes e depois. */
  antes: number
  depois: number
  /** Por dia até o fim do mês, antes e depois (só no mês atual). */
  porDiaAntes: number | null
  porDiaDepois: number | null
  /** Parcela que fica nos próximos meses (null à vista). */
  parcelaSeguinte: number | null
  mesesSeguintes: number
  veredito: Veredito
}

/**
 * "Posso comprar?": o efeito de uma compra no dinheiro do mês. Aperta quando sobra menos de 10% do
 * orçamento do dia a dia (ou menos de R$ 50); estoura quando passa do que tem.
 */
export function simularCompra(
  disponivel: number,
  orcamento: number,
  valor: number,
  parcelas: number,
  diasRestantes: number | null,
): Simulacao {
  const base = Math.floor(valor / parcelas)
  const agora = valor - base * (parcelas - 1)
  const depois = disponivel - agora
  const porDia = (v: number) => (diasRestantes && v > 0 ? Math.floor(v / diasRestantes) : null)
  const margem = Math.max(5000, Math.round(Math.max(0, orcamento) * 0.1))
  return {
    agora,
    antes: disponivel,
    depois,
    porDiaAntes: porDia(disponivel),
    porDiaDepois: porDia(depois),
    parcelaSeguinte: parcelas > 1 ? base : null,
    mesesSeguintes: parcelas - 1,
    veredito: depois < 0 ? 'estoura' : depois < margem ? 'aperta' : 'cabe',
  }
}
