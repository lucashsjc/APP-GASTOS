// Cofrinho: o dinheiro do Nubank guardado (ex.: na caixinha do Nubank). Guardar tira do livre do mês;
// retirar devolve. Testes em cofrinho.test.ts.

import type { Dados, Guardado } from '../data/types'
import { guardadoDoMes, resumoNubank } from './calculos'
import { mesDe, somarMeses } from './datas'
import { somar } from './dinheiro'

export interface MesDoCofrinho {
  mes: string
  /** Guardado − retirado no mês. */
  liquido: number
  movimentos: Guardado[]
}

export interface ResumoCofrinho {
  /** Tudo o que está guardado (guardado − retirado, de todos os meses). */
  total: number
  meta: number | null
  /** Guardado no mês atual (para a barra da meta). */
  noMes: number
  /** Meses passados que ainda têm livre sobrando no Nubank: dá para mandar para o cofrinho. */
  sobras: { mes: string; valor: number }[]
  /** Movimentos por mês, do mais recente para o mais antigo. */
  historico: MesDoCofrinho[]
}

/** `quantosMeses`: até onde olhar para trás procurando sobras. */
export function resumoCofrinho(dados: Dados, hoje: string, quantosMeses = 12): ResumoCofrinho {
  const atual = mesDe(hoje)
  const guardados = dados.guardados ?? []
  const total = somar(guardados.map((g) => (g.tipo === 'guardar' ? g.valor_centavos : -g.valor_centavos)))

  const sobras: { mes: string; valor: number }[] = []
  for (let i = 1; i <= quantosMeses; i++) {
    const mes = somarMeses(atual, -i)
    if (!dados.recebidos.some((r) => r.mes === mes && r.valor_centavos > 0)) continue
    const livre = resumoNubank(dados, mes, hoje).livre
    if (livre > 0) sobras.push({ mes, valor: livre })
  }

  const porMes = new Map<string, Guardado[]>()
  for (const g of guardados) porMes.set(g.mes, [...(porMes.get(g.mes) ?? []), g])
  const historico = [...porMes.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([mes, movimentos]) => ({ mes, liquido: guardadoDoMes(dados, mes), movimentos }))

  return { total, meta: dados.metaGuardar ?? null, noMes: guardadoDoMes(dados, atual), sobras, historico }
}

export type PlanoDesejo =
  | { tipo: 'cabe'; sobra: number }
  | { tipo: 'cofrinho'; sobraNoCofrinho: number }
  | { tipo: 'meses'; meses: number; falta: number }
  | { tipo: 'sem-meta'; falta: number }

/**
 * Como dá para comprar: com o livre deste mês, com o que está no cofrinho ou, guardando a meta do
 * mês, em quantos meses junta o que falta.
 */
export function planoDoDesejo(valor: number, livre: number, guardado: number, meta: number | null): PlanoDesejo {
  if (livre >= valor) return { tipo: 'cabe', sobra: livre - valor }
  if (guardado >= valor) return { tipo: 'cofrinho', sobraNoCofrinho: guardado - valor }
  const falta = valor - Math.max(0, guardado)
  if (!meta || meta <= 0) return { tipo: 'sem-meta', falta }
  return { tipo: 'meses', meses: Math.ceil(falta / meta), falta }
}
