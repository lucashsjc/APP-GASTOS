// Regras de cálculo do app (seção 7 da descrição). Tudo aqui é função pura: recebe os dados e o
// dia de hoje (em São Paulo) e devolve números em centavos. Os testes ficam em calculos.test.ts.

import type { Aba, Dados, Forma, Gasto, NovaRecorrencia, NovoGasto, Recorrencia } from '../data/types'
import {
  dataNoMes,
  diaDe,
  diasRestantesNoMes,
  mesDe,
  somarMeses,
  ultimoDiaDoMes,
} from './datas'
import { somar } from './dinheiro'

// ---------- Certos do mês ----------

export type GrupoCerto = 'todo_mes' | 'parcelas' | 'so_este_mes'

export interface Certo {
  /** Identifica o item na lista (estável entre renderizações). */
  chave: string
  grupo: GrupoCerto
  aba: Aba
  forma: Forma | null
  descricao: string
  categoria: string
  valor_centavos: number
  data: string
  caiu: boolean
  /** Linha gravada: parcela, certo só deste mês ou ocorrência de "todo mês" ajustada à mão. */
  gasto: Gasto | null
  /** O "todo mês" de onde vem a ocorrência. */
  recorrencia: Recorrencia | null
  parcela_numero: number | null
  parcela_total: number | null
}

/** Já caiu = data até hoje, ou marcado à mão como caído. */
export function jaCaiu(data: string, hoje: string, caiuManual?: boolean | null): boolean {
  return caiuManual === true || data <= hoje
}

export function recorrenciaAtivaNoMes(r: Recorrencia, mes: string): boolean {
  return r.inicio <= mes && (r.fim === null || mes <= r.fim)
}

export function certosDoMes(dados: Dados, aba: Aba, mes: string, hoje: string): Certo[] {
  const certos: Certo[] = []
  const gastosDoMes = dados.gastos.filter((g) => g.aba === aba && mesDe(g.data) === mes)

  for (const r of dados.recorrencias) {
    if (r.aba !== aba || !recorrenciaAtivaNoMes(r, mes)) continue
    const ajuste = gastosDoMes.find((g) => g.recorrencia_id === r.id) ?? null
    const data = ajuste?.data ?? dataNoMes(mes, r.dia)
    certos.push({
      chave: `r:${r.id}:${mes}`,
      grupo: 'todo_mes',
      aba,
      forma: ajuste?.forma ?? r.forma,
      descricao: ajuste?.descricao ?? r.descricao,
      categoria: ajuste?.categoria ?? r.categoria,
      valor_centavos: ajuste?.valor_centavos ?? r.valor_centavos,
      data,
      caiu: jaCaiu(data, hoje, ajuste?.caiu_manual),
      gasto: ajuste,
      recorrencia: r,
      parcela_numero: null,
      parcela_total: null,
    })
  }

  for (const g of gastosDoMes) {
    if (g.tipo === 'unico') continue
    // Ajuste de um "todo mês" que já não vale neste mês: não conta.
    if (g.recorrencia_id) {
      const r = dados.recorrencias.find((x) => x.id === g.recorrencia_id)
      if (r) continue
    }
    certos.push({
      chave: `g:${g.id}`,
      grupo: g.tipo === 'parcela' ? 'parcelas' : 'so_este_mes',
      aba,
      forma: g.forma,
      descricao: g.descricao,
      categoria: g.categoria,
      valor_centavos: g.valor_centavos,
      data: g.data,
      caiu: jaCaiu(g.data, hoje, g.caiu_manual),
      gasto: g,
      recorrencia: null,
      parcela_numero: g.parcela_numero,
      parcela_total: g.parcela_total,
    })
  }

  return certos.sort((a, b) => a.data.localeCompare(b.data) || a.descricao.localeCompare(b.descricao, 'pt-BR'))
}

export interface ResumoCertos {
  total: number
  jaCaiu: number
  vaiCair: number
}

export function resumirCertos(certos: Certo[]): ResumoCertos {
  const jaCaiuTotal = somar(certos.filter((c) => c.caiu).map((c) => c.valor_centavos))
  const total = somar(certos.map((c) => c.valor_centavos))
  return { total, jaCaiu: jaCaiuTotal, vaiCair: total - jaCaiuTotal }
}

// ---------- Outros gastos ----------

/** Gastos de "uma vez" do mês, do mais recente para o mais antigo. */
export function outrosDoMes(dados: Dados, aba: Aba, mes: string): Gasto[] {
  return dados.gastos
    .filter((g) => g.aba === aba && g.tipo === 'unico' && mesDe(g.data) === mes)
    .sort((a, b) => b.data.localeCompare(a.data))
}

// ---------- Nubank ----------

export function recebidoDoMes(dados: Dados, mes: string): number {
  return dados.recebidos.find((r) => r.mes === mes)?.valor_centavos ?? 0
}

export interface ResumoNubank {
  recebido: number
  certos: ResumoCertos
  outros: number
  /** Recebido − certos − outros. Pode ser negativo. */
  livre: number
  credito: number
  debito: number
}

export function resumoNubank(dados: Dados, mes: string, hoje: string): ResumoNubank {
  const certos = certosDoMes(dados, 'nubank', mes, hoje)
  const outros = outrosDoMes(dados, 'nubank', mes)
  const recebido = recebidoDoMes(dados, mes)
  const resumo = resumirCertos(certos)
  const totalOutros = somar(outros.map((g) => g.valor_centavos))
  const todos = [...certos, ...outros]
  const debito = somar(todos.filter((g) => g.forma === 'debito').map((g) => g.valor_centavos))
  return {
    recebido,
    certos: resumo,
    outros: totalOutros,
    livre: recebido - resumo.total - totalOutros,
    credito: resumo.total + totalOutros - debito,
    debito,
  }
}

// ---------- Caju ----------

interface Item {
  data: string
  valor_centavos: number
  caiu_manual: boolean | null
}

/** Primeiro mês com algum dado da aba (para somar o saldo desde o começo). */
function primeiroMes(dados: Dados, aba: Aba): string | null {
  const meses = [
    ...dados.gastos.filter((g) => g.aba === aba).map((g) => mesDe(g.data)),
    ...dados.recorrencias.filter((r) => r.aba === aba).map((r) => r.inicio),
    ...(aba === 'caju' ? dados.depositos.map((d) => mesDe(d.data)) : []),
  ]
  return meses.length ? meses.reduce((a, b) => (a < b ? a : b)) : null
}

/** Todos os gastos da aba (com as ocorrências de "todo mês") até o fim de `ateMes`. */
function gastosAte(dados: Dados, aba: Aba, ateMes: string, hoje: string): Item[] {
  const inicio = primeiroMes(dados, aba)
  if (!inicio) return []
  const itens: Item[] = []
  for (let mes = inicio; mes <= ateMes; mes = somarMeses(mes, 1)) {
    for (const c of certosDoMes(dados, aba, mes, hoje)) {
      itens.push({ data: c.data, valor_centavos: c.valor_centavos, caiu_manual: c.gasto?.caiu_manual ?? null })
    }
    itens.push(...outrosDoMes(dados, aba, mes))
  }
  return itens
}

/**
 * Saldo do Caju no dia `ate`: depósitos até esse dia − gastos do Caju já caídos até esse dia.
 * Acumula entre os meses. Um gasto marcado à mão como caído conta a partir de hoje.
 */
export function saldoCajuEm(dados: Dados, ate: string, hoje: string): number {
  const depositos = somar(dados.depositos.filter((d) => d.data <= ate).map((d) => d.valor_centavos))
  const caidos = gastosAte(dados, 'caju', mesDe(ate), hoje).filter(
    (g) => g.data <= ate || (g.caiu_manual === true && hoje <= ate),
  )
  return depositos - somar(caidos.map((g) => g.valor_centavos))
}

/** Quanto dá para gastar por dia até o fim do mês, contando hoje. Null = saldo esgotado. */
export function porDiaCaju(saldo: number, hoje: string): number | null {
  if (saldo <= 0) return null
  return Math.floor(saldo / diasRestantesNoMes(hoje))
}

export type CardCaju =
  | { modo: 'atual'; saldo: number; porDia: number | null; diasRestantes: number }
  | { modo: 'passado'; saldo: number }
  | { modo: 'futuro'; saldo: number }

/**
 * O que o card do Caju mostra no mês escolhido:
 * - mês atual: saldo de hoje e quanto dá por dia;
 * - mês passado: saldo no fim daquele mês;
 * - mês futuro: saldo de hoje − certos do Caju que ainda vão cair até o fim daquele mês.
 */
export function cardCaju(dados: Dados, mes: string, hoje: string): CardCaju {
  const mesAtual = mesDe(hoje)
  const saldoHoje = saldoCajuEm(dados, hoje, hoje)
  if (mes === mesAtual) {
    return { modo: 'atual', saldo: saldoHoje, porDia: porDiaCaju(saldoHoje, hoje), diasRestantes: diasRestantesNoMes(hoje) }
  }
  if (mes < mesAtual) return { modo: 'passado', saldo: saldoCajuEm(dados, ultimoDiaDoMes(mes), hoje) }

  let previstos = 0
  for (let m = mesAtual; m <= mes; m = somarMeses(m, 1)) {
    previstos += somar(certosDoMes(dados, 'caju', m, hoje).filter((c) => !c.caiu).map((c) => c.valor_centavos))
  }
  return { modo: 'futuro', saldo: saldoHoje - previstos }
}

// ---------- Parcelas ----------

/** Divide o total igualmente; a sobra de centavos fica na primeira parcela. */
export function dividirParcelas(total: number, parcelas: number): number[] {
  if (!Number.isInteger(total) || total <= 0) throw new Error('O total precisa ser um valor positivo em centavos.')
  if (!Number.isInteger(parcelas) || parcelas < 1) throw new Error('Número de parcelas inválido.')
  const base = Math.floor(total / parcelas)
  const sobra = total - base * parcelas
  return Array.from({ length: parcelas }, (_, i) => (i === 0 ? base + sobra : base))
}

/** Cada parcela cai no mesmo dia da compra (ou no último dia, em meses mais curtos). */
export function datasDasParcelas(dataCompra: string, parcelas: number): string[] {
  const dia = diaDe(dataCompra)
  return Array.from({ length: parcelas }, (_, i) => dataNoMes(somarMeses(mesDe(dataCompra), i), dia))
}

export interface Compra {
  aba: Aba
  forma: Forma | null
  descricao: string
  categoria: string
  total_centavos: number
  data: string
  parcelas: number
}

export function gerarParcelas(compra: Compra, grupoId: string): NovoGasto[] {
  const valores = dividirParcelas(compra.total_centavos, compra.parcelas)
  const datas = datasDasParcelas(compra.data, compra.parcelas)
  return valores.map((valor, i) => ({
    aba: compra.aba,
    forma: compra.aba === 'nubank' ? compra.forma : null,
    descricao: compra.descricao,
    valor_centavos: valor,
    data: datas[i],
    categoria: compra.categoria,
    tipo: 'parcela',
    recorrencia_id: null,
    grupo_id: grupoId,
    parcela_numero: i + 1,
    parcela_total: compra.parcelas,
    caiu_manual: null,
  }))
}

// ---------- Todo mês ----------

export interface PlanoRecorrencia {
  /** Alterações na recorrência existente. */
  atualizar: Partial<NovaRecorrencia> | null
  /** Nova recorrência que passa a valer a partir do mês da edição. */
  criar: NovaRecorrencia | null
  /** Ajustes à mão (linhas em `gastos`) que deixam de valer e devem ser apagados. */
  excluirAjustes: string[]
  /** A recorrência inteira deve ser apagada (nunca chegou a valer). */
  excluir: boolean
}

function ajustesDesde(dados: Dados, r: Recorrencia, mes: string): string[] {
  return dados.gastos.filter((g) => g.recorrencia_id === r.id && mesDe(g.data) >= mes).map((g) => g.id)
}

/**
 * Editar um "todo mês" vale do mês `aPartirDe` em diante; os meses anteriores não mudam.
 * Se a recorrência começou antes, ela é encerrada no mês anterior e uma nova começa em `aPartirDe`.
 */
export function planejarEdicaoRecorrencia(
  dados: Dados,
  r: Recorrencia,
  alteracoes: Partial<NovaRecorrencia>,
  aPartirDe: string,
): PlanoRecorrencia {
  if (r.fim !== null && r.fim < aPartirDe) throw new Error('Este gasto já foi encerrado.')
  const excluirAjustes = ajustesDesde(dados, r, aPartirDe)
  if (r.inicio >= aPartirDe) {
    return { atualizar: alteracoes, criar: null, excluirAjustes, excluir: false }
  }
  const { id: _id, ...base } = r
  return {
    atualizar: { fim: somarMeses(aPartirDe, -1) },
    criar: { ...base, ...alteracoes, inicio: aPartirDe, fim: r.fim },
    excluirAjustes,
    excluir: false,
  }
}

/** Encerrar um "todo mês": `ultimoMes` é o último mês em que ele ainda conta. */
export function planejarEncerramento(dados: Dados, r: Recorrencia, ultimoMes: string): PlanoRecorrencia {
  if (ultimoMes < r.inicio) {
    return { atualizar: null, criar: null, excluirAjustes: ajustesDesde(dados, r, r.inicio), excluir: true }
  }
  return {
    atualizar: { fim: ultimoMes },
    criar: null,
    excluirAjustes: ajustesDesde(dados, r, somarMeses(ultimoMes, 1)),
    excluir: false,
  }
}

// ---------- Lembranças por descrição ----------

export function normalizarDescricao(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ')
}

/** A última categoria e forma usadas para a descrição (o gasto mais recente com ela). */
export function lembrarPorDescricao(
  dados: Dados,
  aba: Aba,
  descricao: string,
): { categoria: string | null; forma: Forma | null } {
  const chave = normalizarDescricao(descricao)
  if (!chave) return { categoria: null, forma: null }
  const candidatos: { data: string; categoria: string; forma: Forma | null }[] = [
    ...dados.gastos.filter((g) => g.aba === aba),
    ...dados.recorrencias.filter((r) => r.aba === aba).map((r) => ({ ...r, data: `${r.inicio}-01` })),
  ].filter((g) => normalizarDescricao(g.descricao) === chave)
  if (!candidatos.length) return { categoria: null, forma: null }
  const ultimo = candidatos.reduce((a, b) => (b.data >= a.data ? b : a))
  return { categoria: ultimo.categoria, forma: ultimo.forma }
}

/** As descrições mais usadas na aba, para os chips de sugestão. */
export function descricoesMaisUsadas(dados: Dados, aba: Aba, quantas = 6): string[] {
  const contagem = new Map<string, { texto: string; vezes: number; ultima: string }>()
  for (const g of dados.gastos) {
    if (g.aba !== aba) continue
    const chave = normalizarDescricao(g.descricao)
    const atual = contagem.get(chave)
    if (atual) {
      atual.vezes++
      if (g.data > atual.ultima) atual.ultima = g.data
    } else contagem.set(chave, { texto: g.descricao.trim(), vezes: 1, ultima: g.data })
  }
  return [...contagem.values()]
    .sort((a, b) => b.vezes - a.vezes || b.ultima.localeCompare(a.ultima))
    .slice(0, quantas)
    .map((c) => c.texto)
}
