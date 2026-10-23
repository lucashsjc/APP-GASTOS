// "Para onde foi o dinheiro": tudo o que saiu da aba no mês (certos + outros gastos).

import type { Aba, Dados } from '../data/types'
import { certosDoMes, normalizarDescricao, outrosDoMes } from './calculos'
import { somarMeses } from './datas'
import { somar } from './dinheiro'

export interface ItemGasto {
  descricao: string
  categoria: string
  valor_centavos: number
  data: string
}

/** Gastos do mês para a análise (sem os gastos à parte, que ficam fora das contas do mês). */
export function gastosDoMes(dados: Dados, aba: Aba, mes: string, hoje: string): ItemGasto[] {
  return [...certosDoMes(dados, aba, mes, hoje), ...outrosDoMes(dados, aba, mes)].filter((g) => !g.separado).map((g) => ({
    descricao: g.descricao,
    categoria: g.categoria,
    valor_centavos: g.valor_centavos,
    data: g.data,
  }))
}

export interface FatiaCategoria {
  categoria: string
  total: number
  /** 0 a 100, arredondado. */
  percentual: number
  /** Os maiores gastos da categoria, somados por descrição. */
  principais: { descricao: string; total: number; vezes: number }[]
}

export function porCategoria(itens: ItemGasto[]): FatiaCategoria[] {
  const total = somar(itens.map((i) => i.valor_centavos))
  const grupos = new Map<string, ItemGasto[]>()
  for (const i of itens) grupos.set(i.categoria, [...(grupos.get(i.categoria) ?? []), i])
  return [...grupos.entries()]
    .map(([categoria, lista]) => {
      const soma = somar(lista.map((i) => i.valor_centavos))
      return {
        categoria,
        total: soma,
        percentual: total > 0 ? Math.round((soma / total) * 100) : 0,
        principais: somarPorDescricao(lista)
          .sort((a, b) => b.total - a.total)
          .slice(0, 3),
      }
    })
    .sort((a, b) => b.total - a.total)
}

function somarPorDescricao(itens: ItemGasto[]): { descricao: string; total: number; vezes: number }[] {
  const mapa = new Map<string, { descricao: string; total: number; vezes: number }>()
  for (const i of itens) {
    const chave = normalizarDescricao(i.descricao)
    const atual = mapa.get(chave)
    if (atual) {
      atual.total += i.valor_centavos
      atual.vezes++
    } else mapa.set(chave, { descricao: i.descricao.trim(), total: i.valor_centavos, vezes: 1 })
  }
  return [...mapa.values()]
}

/** O gasto que mais se repete no mês ("Uber: 10 vezes, R$ 160,81"). Null se nada se repete. */
export function maisFrequente(itens: ItemGasto[]): { descricao: string; vezes: number; total: number } | null {
  const lista = somarPorDescricao(itens).sort((a, b) => b.vezes - a.vezes || b.total - a.total)
  return lista.length && lista[0].vezes >= 2 ? lista[0] : null
}

/** Total gasto em cada um dos últimos `quantos` meses, terminando em `mes`. */
export function ultimosMeses(
  dados: Dados,
  aba: Aba,
  mes: string,
  hoje: string,
  quantos = 6,
): { mes: string; total: number }[] {
  return Array.from({ length: quantos }, (_, i) => {
    const m = somarMeses(mes, i - quantos + 1)
    return { mes: m, total: somar(gastosDoMes(dados, aba, m, hoje).map((g) => g.valor_centavos)) }
  })
}
