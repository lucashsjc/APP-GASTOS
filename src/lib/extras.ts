// Limites por categoria, resumo do mês, busca e assinaturas. Testes em extras.test.ts.

import type { Aba, Dados, Gasto, Limite, Recorrencia } from '../data/types'
import { gastosDoMes, porCategoria, type ItemGasto } from './analise'
import { mesDoGasto, normalizarDescricao } from './calculos'
import { mesDe, somarMeses } from './datas'
import { somar } from './dinheiro'
import { ritmoDoMes } from './ritmo'

// ---------- Limites por categoria ----------

export type SituacaoLimite = 'ok' | 'perto' | 'passou'

export interface UsoLimite {
  limite: Limite
  gasto: number
  /** 0 a 1 (ou mais, se passou). */
  fracao: number
  restante: number
  situacao: SituacaoLimite
}

/** A partir de 80% do limite, "perto"; acima de 100%, "passou". */
export function situacaoDoLimite(gasto: number, limite: number): SituacaoLimite {
  if (gasto > limite) return 'passou'
  if (gasto >= limite * 0.8) return 'perto'
  return 'ok'
}

/** Quanto já foi de cada limite do cartão no mês (com os fixos e parcelas daquela categoria). */
export function usoDosLimites(dados: Dados, aba: Aba, mes: string, hoje: string): UsoLimite[] {
  const itens = gastosDoMes(dados, aba, mes, hoje)
  return (dados.limites ?? [])
    .filter((l) => l.aba === aba)
    .map((limite) => {
      const gasto = somar(itens.filter((i) => i.categoria === limite.categoria).map((i) => i.valor_centavos))
      return {
        limite,
        gasto,
        fracao: gasto / limite.valor_centavos,
        restante: limite.valor_centavos - gasto,
        situacao: situacaoDoLimite(gasto, limite.valor_centavos),
      }
    })
    .sort((a, b) => b.fracao - a.fracao)
}

// ---------- Resumo do mês ----------

export interface ResumoDoMes {
  total: number
  compras: number
  anterior: number
  /** Diferença para o mês anterior, em % (null se o anterior foi zero). */
  variacao: number | null
  campea: { categoria: string; total: number; percentual: number } | null
  maiorDia: { data: string; total: number } | null
  maiorCompra: ItemGasto | null
  /** Delta do ritmo do dia a dia (negativo = abaixo do ritmo). Null sem dinheiro cadastrado. */
  ritmo: number | null
  /** Categorias que mais subiram em relação ao mês anterior. */
  subiram: { categoria: string; diferenca: number }[]
}

export function resumoDoMes(dados: Dados, aba: Aba, mes: string, hoje: string): ResumoDoMes {
  const itens = gastosDoMes(dados, aba, mes, hoje)
  const antes = gastosDoMes(dados, aba, somarMeses(mes, -1), hoje)
  const total = somar(itens.map((i) => i.valor_centavos))
  const anterior = somar(antes.map((i) => i.valor_centavos))
  const fatias = porCategoria(itens)
  const porDia = new Map<string, number>()
  for (const i of itens) porDia.set(i.data, (porDia.get(i.data) ?? 0) + i.valor_centavos)
  const maiorDia = [...porDia.entries()].sort((a, b) => b[1] - a[1])[0]
  const maiorCompra = [...itens].sort((a, b) => b.valor_centavos - a.valor_centavos)[0] ?? null
  const totalAntes = new Map(porCategoria(antes).map((f) => [f.categoria, f.total]))
  const subiram = fatias
    .map((f) => ({ categoria: f.categoria, diferenca: f.total - (totalAntes.get(f.categoria) ?? 0) }))
    .filter((s) => s.diferenca > 0)
    .sort((a, b) => b.diferenca - a.diferenca)
    .slice(0, 3)
  const r = ritmoDoMes(dados, aba, mes, hoje)
  return {
    total,
    compras: itens.length,
    anterior,
    variacao: anterior > 0 ? Math.round(((total - anterior) / anterior) * 100) : null,
    campea: fatias[0] ? { categoria: fatias[0].categoria, total: fatias[0].total, percentual: fatias[0].percentual } : null,
    maiorDia: maiorDia ? { data: maiorDia[0], total: maiorDia[1] } : null,
    maiorCompra,
    ritmo: r ? r.delta : null,
    subiram,
  }
}

// ---------- Busca ----------

export interface ResultadoBusca {
  gastos: Gasto[]
  /** Gastos de todo mês com o termo (as ocorrências sem ajuste não são linhas gravadas). */
  recorrencias: Recorrencia[]
  total: number
  /** Total por mês, do mais recente para o mais antigo. */
  porMes: { mes: string; total: number; gastos: Gasto[] }[]
}

/** Procura em todos os meses, pela descrição, categoria ou observação (sem diferenciar acento e maiúscula). */
export function buscar(dados: Dados, termo: string, aba?: Aba): ResultadoBusca {
  const t = normalizarDescricao(termo)
  if (t.length < 2) return { gastos: [], recorrencias: [], total: 0, porMes: [] }
  const confere = (x: { descricao: string; categoria: string; observacao: string; aba: Aba }) =>
    (!aba || x.aba === aba) &&
    [x.descricao, x.categoria, x.observacao].some((campo) => normalizarDescricao(campo ?? '').includes(t))
  const gastos = dados.gastos
    .filter(confere)
    .sort((a, b) => b.data.localeCompare(a.data) || (b.hora ?? '').localeCompare(a.hora ?? ''))
  const meses = new Map<string, Gasto[]>()
  for (const g of gastos) meses.set(mesDoGasto(g), [...(meses.get(mesDoGasto(g)) ?? []), g])
  return {
    gastos,
    recorrencias: dados.recorrencias.filter(confere),
    total: somar(gastos.map((g) => g.valor_centavos)),
    porMes: [...meses.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([mes, lista]) => ({ mes, total: somar(lista.map((g) => g.valor_centavos)), gastos: lista })),
  }
}

// ---------- Assinaturas ----------

export interface Assinatura {
  descricao: string
  aba: Aba
  categoria: string
  /** Valor por mês (o último cobrado). */
  mensal: number
  anual: number
  /** "fixo" = cadastrado como todo mês; "repetido" = o app achou o mesmo gasto em vários meses. */
  origem: 'fixo' | 'repetido'
  /** Em quantos dos últimos 6 meses apareceu (só para "repetido"). */
  meses?: number
}

/**
 * O que é cobrado todo mês: os "todo mês" ativos e os gastos com o mesmo nome e quase o mesmo valor
 * (até 15% de diferença) em pelo menos 3 dos últimos 6 meses.
 */
export function assinaturas(dados: Dados, hoje: string): Assinatura[] {
  const atual = mesDe(hoje)
  const lista: Assinatura[] = dados.recorrencias
    .filter((r) => r.inicio <= atual && (!r.fim || r.fim >= atual))
    .map((r) => ({
      descricao: r.descricao,
      aba: r.aba,
      categoria: r.categoria,
      mensal: r.valor_centavos,
      anual: r.valor_centavos * 12,
      origem: 'fixo' as const,
    }))
  const jaTem = new Set(lista.map((a) => `${a.aba}:${normalizarDescricao(a.descricao)}`))

  const inicio = somarMeses(atual, -5)
  const grupos = new Map<string, Gasto[]>()
  for (const g of dados.gastos) {
    if (g.tipo !== 'unico') continue
    const mes = mesDoGasto(g)
    if (mes < inicio || mes > atual) continue
    const chave = `${g.aba}:${normalizarDescricao(g.descricao)}`
    grupos.set(chave, [...(grupos.get(chave) ?? []), g])
  }
  for (const [chave, gs] of grupos) {
    if (jaTem.has(chave)) continue
    const meses = new Set(gs.map(mesDoGasto))
    // Uma assinatura cai uma vez por mês: vários no mesmo mês (Uber, iFood) não contam.
    if (meses.size < 3 || gs.length > meses.size + 1) continue
    const valores = gs.map((g) => g.valor_centavos).sort((a, b) => a - b)
    const mediana = valores[Math.floor(valores.length / 2)]
    if (valores.some((v) => Math.abs(v - mediana) > mediana * 0.15)) continue
    const ultimo = [...gs].sort((a, b) => b.data.localeCompare(a.data))[0]
    lista.push({
      descricao: ultimo.descricao,
      aba: ultimo.aba,
      categoria: ultimo.categoria,
      mensal: ultimo.valor_centavos,
      anual: ultimo.valor_centavos * 12,
      origem: 'repetido',
      meses: meses.size,
    })
  }
  return lista.sort((a, b) => b.mensal - a.mensal)
}
