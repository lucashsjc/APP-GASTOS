// Datas como texto (AAAA-MM-DD) e meses como AAAA-MM. As contas são feitas com Date.UTC, para o
// fuso do aparelho nunca mudar o dia. "Hoje" é sempre o dia em São Paulo.

export const FUSO = 'America/Sao_Paulo'

const NOMES_MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

/** O dia de hoje em São Paulo, como AAAA-MM-DD. */
export function hojeSP(agora: Date = new Date()): string {
  // en-CA formata como AAAA-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(agora)
}

export function mesDe(data: string): string {
  return data.slice(0, 7)
}

function partes(mes: string): [number, number] {
  const [a, m] = mes.split('-').map(Number)
  return [a, m]
}

export function diasNoMes(mes: string): number {
  const [a, m] = partes(mes)
  return new Date(Date.UTC(a, m, 0)).getUTCDate()
}

function doisDigitos(n: number): string {
  return String(n).padStart(2, '0')
}

/** Data do dia `dia` no mês; em meses mais curtos, o último dia do mês. */
export function dataNoMes(mes: string, dia: number): string {
  return `${mes}-${doisDigitos(Math.min(dia, diasNoMes(mes)))}`
}

export function somarMeses(mes: string, n: number): string {
  const [a, m] = partes(mes)
  const total = a * 12 + (m - 1) + n
  return `${Math.floor(total / 12)}-${doisDigitos((total % 12) + 1)}`
}

/** Quantos meses de `de` até `ate` (pode ser negativo). */
export function mesesEntre(de: string, ate: string): number {
  const [a1, m1] = partes(de)
  const [a2, m2] = partes(ate)
  return a2 * 12 + m2 - (a1 * 12 + m1)
}

export function ultimoDiaDoMes(mes: string): string {
  return dataNoMes(mes, 31)
}

export function diaDe(data: string): number {
  return Number(data.slice(8, 10))
}

/** Dias que faltam no mês, contando o próprio dia. */
export function diasRestantesNoMes(data: string): number {
  return diasNoMes(mesDe(data)) - diaDe(data) + 1
}

export function nomeDoMes(mes: string): string {
  return NOMES_MESES[partes(mes)[1] - 1]
}

/** "Outubro" no ano atual; "Outubro de 2027" em outros anos. */
export function tituloDoMes(mes: string, mesAtual?: string): string {
  const nome = nomeDoMes(mes)
  const capitalizado = nome[0].toUpperCase() + nome.slice(1)
  if (mesAtual && mes.slice(0, 4) === mesAtual.slice(0, 4)) return capitalizado
  return `${capitalizado} de ${mes.slice(0, 4)}`
}

/** 21/10 (ou 21/10/2027 se `comAno`). */
export function dataCurta(data: string, comAno = false): string {
  const [a, m, d] = data.split('-')
  return comAno ? `${d}/${m}/${a}` : `${d}/${m}`
}

/** Mês (1 a 12) a partir do nome em português, com ou sem acento e em qualquer caixa. */
export function numeroDoMes(nome: string): number | null {
  const limpo = semAcento(nome).trim().toLowerCase()
  const i = NOMES_MESES.findIndex((n) => semAcento(n) === limpo)
  return i >= 0 ? i + 1 : null
}

export function semAcento(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}
