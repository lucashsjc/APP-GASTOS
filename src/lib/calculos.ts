// Regras de cálculo do app (seção 7 da descrição). Tudo aqui é função pura: recebe os dados e o
// dia de hoje (em São Paulo) e devolve números em centavos. Os testes ficam em calculos.test.ts.

import type { Aba, Carteira, Dados, Deposito, Forma, Gasto, NovaRecorrencia, NovoGasto, Recorrencia } from '../data/types'
import {
  dataNoMes,
  diaDe,
  diasRestantesNoMes,
  mesDe,
  somarMeses,
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
  /** Pago ou não (para um "todo mês", vem do ajuste daquele mês, se houver). */
  pago: boolean
  observacao: string
  /** "À parte": aparece separado e não soma com os outros gastos do mês (mas desconta do livre). */
  separado: boolean
  /** Pago com dinheiro à parte: fora das contas do card. */
  dinheiro_a_parte: boolean
  /** Carteira do Caju escolhida à mão (null = pela categoria). */
  carteira: Carteira | null
}

/** Já caiu = data até hoje, ou marcado à mão como caído. */
export function jaCaiu(data: string, hoje: string, caiuManual?: boolean | null): boolean {
  return caiuManual === true || data <= hoje
}

export function recorrenciaAtivaNoMes(r: Recorrencia, mes: string): boolean {
  return r.inicio <= mes && (r.fim === null || mes <= r.fim)
}

/** Mês em que o gasto conta: o escolhido em "Descontar no mês" ou, sem escolha, o mês da data. */
export function mesDoGasto(g: Pick<Gasto, 'data' | 'mes_conta'>): string {
  return g.mes_conta || mesDe(g.data)
}

export function certosDoMes(dados: Dados, aba: Aba, mes: string, hoje: string): Certo[] {
  const certos: Certo[] = []
  // O ajuste de um "todo mês" vale para o mês da data; os outros gastos, para o mês em que contam.
  const gastosDoMes = dados.gastos.filter(
    (g) => g.aba === aba && (g.recorrencia_id ? mesDe(g.data) : mesDoGasto(g)) === mes,
  )

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
      pago: ajuste?.pago ?? false,
      observacao: ajuste?.observacao || r.observacao,
      separado: r.separado,
      dinheiro_a_parte: r.dinheiro_a_parte,
      carteira: ajuste?.carteira ?? null,
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
      pago: g.pago,
      observacao: g.observacao,
      separado: g.separado,
      dinheiro_a_parte: g.dinheiro_a_parte,
      carteira: g.carteira,
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

// ---------- Pago / não pago ----------

/** Quanto do mês (certos + outros gastos) já está pago e quanto falta pagar. */
export function resumoPagamento(itens: { valor_centavos: number; pago: boolean }[]): { pago: number; naoPago: number } {
  const pago = somar(itens.filter((i) => i.pago).map((i) => i.valor_centavos))
  return { pago, naoPago: somar(itens.map((i) => i.valor_centavos)) - pago }
}

// ---------- Outros gastos ----------

/** Gastos de "uma vez" do mês, do mais recente para o mais antigo. */
export function outrosDoMes(dados: Dados, aba: Aba, mes: string): Gasto[] {
  return dados.gastos
    .filter((g) => g.aba === aba && g.tipo === 'unico' && mesDoGasto(g) === mes)
    .sort((a, b) => b.data.localeCompare(a.data) || (b.hora ?? '').localeCompare(a.hora ?? ''))
}

// ---------- Nubank ----------

export function recebidoDoMes(dados: Dados, mes: string): number {
  return dados.recebidos.find((r) => r.mes === mes)?.valor_centavos ?? 0
}

/**
 * Quanto do mês foi para o cofrinho (guardado − retirado). Positivo: saiu do livre; negativo: tirou do
 * cofrinho para gastar no mês.
 */
export function guardadoDoMes(dados: Dados, mes: string): number {
  return somar(
    (dados.guardados ?? [])
      .filter((g) => g.mes === mes)
      .map((g) => (g.tipo === 'guardar' ? g.valor_centavos : -g.valor_centavos)),
  )
}

export interface ResumoNubank {
  recebido: number
  certos: ResumoCertos
  outros: number
  /** Recebido − certos − outros − gastos à parte. Pode ser negativo. */
  livre: number
  credito: number
  debito: number
  /** Total dos gastos à parte do mês (fora do total do mês, mas descontado do livre). */
  aParte: number
  /** Total pago com dinheiro à parte (fora de todas as contas do card). */
  dinheiroAParte: number
  /** Guardado no cofrinho no mês (guardado − retirado); já descontado do livre. */
  guardado: number
}

export function resumoNubank(dados: Dados, mes: string, hoje: string): ResumoNubank {
  // O que foi pago com dinheiro à parte fica fora de todas as contas abaixo.
  const doMes = [...certosDoMes(dados, 'nubank', mes, hoje), ...outrosDoMes(dados, 'nubank', mes)]
  const dinheiroAParte = somar(doMes.filter((g) => g.dinheiro_a_parte).map((g) => g.valor_centavos))
  const todosCertos = certosDoMes(dados, 'nubank', mes, hoje).filter((c) => !c.dinheiro_a_parte)
  const todosOutros = outrosDoMes(dados, 'nubank', mes).filter((g) => !g.dinheiro_a_parte)
  const certos = todosCertos.filter((c) => !c.separado)
  const outros = todosOutros.filter((g) => !g.separado)
  const recebido = recebidoDoMes(dados, mes)
  const resumo = resumirCertos(certos)
  const totalOutros = somar(outros.map((g) => g.valor_centavos))
  const todos = [...todosCertos, ...todosOutros]
  const aParte = somar(todos.filter((g) => g.separado).map((g) => g.valor_centavos))
  // Crédito e débito contam tudo o que passou no cartão, inclusive os gastos à parte.
  const debito = somar(todos.filter((g) => g.forma === 'debito').map((g) => g.valor_centavos))
  const total = resumo.total + totalOutros + aParte
  return {
    recebido,
    certos: resumo,
    outros: totalOutros,
    livre: recebido - total - guardadoDoMes(dados, mes),
    credito: total - debito,
    debito,
    aParte,
    dinheiroAParte,
    guardado: guardadoDoMes(dados, mes),
  }
}

// ---------- Caju ----------

/**
 * Mês para o qual o depósito vale: o escolhido ao registrar ou, sem escolha, o mês da data.
 * (O Caju costuma cair no fim de um mês valendo para o seguinte.)
 */
export function mesDoDeposito(d: Pick<Deposito, 'data' | 'mes_conta'>): string {
  return d.mes_conta || mesDe(d.data)
}

export function depositosDoMes(dados: Dados, mes: string): Deposito[] {
  return dados.depositos.filter((d) => mesDoDeposito(d) === mes)
}

/**
 * Saldo do Caju no mês: depósitos que valem para o mês − gastos do Caju do mês. Cada mês é
 * separado: o que sobrou de um mês não passa para o outro. No mês atual, só os gastos já caídos
 * até hoje; nos outros meses, todos os gastos do mês (nos futuros, os fixos e parcelas previstos).
 */
export function saldoCajuDoMes(dados: Dados, mes: string, hoje: string, carteira?: Carteira): number {
  const daCarteira = (c: Carteira) => carteira === undefined || c === carteira
  const depositos = somar(
    depositosDoMes(dados, mes)
      .filter((d) => daCarteira(d.carteira ?? 'refeicao'))
      .map((d) => d.valor_centavos),
  )
  const atual = mes === mesDe(hoje)
  const certos = certosDoMes(dados, 'caju', mes, hoje).filter((c) => !atual || c.caiu)
  const outros = outrosDoMes(dados, 'caju', mes).filter((g) => !atual || jaCaiu(g.data, hoje, g.caiu_manual))
  return depositos - somar([...certos, ...outros].filter((g) => daCarteira(carteiraDe(g))).map((g) => g.valor_centavos))
}

export const CARTEIRAS: { id: Carteira; nome: string }[] = [
  { id: 'refeicao', nome: 'Refeição' },
  { id: 'mobilidade', nome: 'Mobilidade' },
]

/** A carteira do Caju de um gasto: a escolhida ou, sem escolha, Transporte → mobilidade e o resto → refeição. */
export function carteiraDe(g: { carteira?: Carteira | null; categoria: string }): Carteira {
  return g.carteira ?? (g.categoria === 'Transporte' ? 'mobilidade' : 'refeicao')
}

/** Quanto dá para gastar por dia até o fim do mês, contando hoje. Null = saldo esgotado. */
export function porDiaCaju(saldo: number, hoje: string): number | null {
  if (saldo <= 0) return null
  return Math.floor(saldo / diasRestantesNoMes(hoje))
}

export interface SaldoCarteira {
  carteira: Carteira
  nome: string
  saldo: number
  /** Por dia até o fim do mês (só no mês atual; null se acabou). */
  porDia: number | null
}

export type CardCaju = (
  | { modo: 'atual'; saldo: number; porDia: number | null; diasRestantes: number }
  | { modo: 'passado'; saldo: number }
  | { modo: 'futuro'; saldo: number }
) & { carteiras: SaldoCarteira[] }

/**
 * O que o card do Caju mostra no mês escolhido (sempre só com o dinheiro daquele mês):
 * - mês atual: saldo de hoje e quanto dá por dia;
 * - mês passado: saldo no fim daquele mês;
 * - mês futuro: depósitos que valem para ele − os gastos previstos nele.
 */
export function cardCaju(dados: Dados, mes: string, hoje: string): CardCaju {
  const saldo = saldoCajuDoMes(dados, mes, hoje)
  const mesAtual = mesDe(hoje)
  const carteiras = CARTEIRAS.map(({ id, nome }) => {
    const s = saldoCajuDoMes(dados, mes, hoje, id)
    return { carteira: id, nome, saldo: s, porDia: mes === mesAtual ? porDiaCaju(s, hoje) : null }
  })
  if (mes === mesAtual) {
    return { modo: 'atual', saldo, porDia: porDiaCaju(saldo, hoje), diasRestantes: diasRestantesNoMes(hoje), carteiras }
  }
  return { modo: mes < mesAtual ? 'passado' : 'futuro', saldo, carteiras }
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

/** As observações mais usadas (em todos os cartões), para os chips de sugestão. */
export function observacoesMaisUsadas(dados: Dados, quantas = 5): string[] {
  const contagem = new Map<string, { texto: string; vezes: number }>()
  for (const item of [...dados.gastos, ...dados.recorrencias]) {
    const texto = item.observacao?.trim()
    if (!texto) continue
    const chave = normalizarDescricao(texto)
    const atual = contagem.get(chave)
    if (atual) atual.vezes++
    else contagem.set(chave, { texto, vezes: 1 })
  }
  return [...contagem.values()]
    .sort((a, b) => b.vezes - a.vezes)
    .slice(0, quantas)
    .map((c) => c.texto)
}
