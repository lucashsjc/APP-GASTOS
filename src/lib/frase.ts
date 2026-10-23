// Registrar um gasto com uma frase só ("uber 17", "mercado 85,90 caju", "tênis 300 em 3x").
// Usado pelo atalho da Siri / Botão de Ação (supabase/functions/gasto). Testes em frase.test.ts.

import type { Aba, Forma, NovoGasto } from '../data/types'
import { gerarParcelas } from './calculos'
import { semAcento } from './datas'
import { formatarReais, lerReais } from './dinheiro'

export interface Frase {
  descricao: string
  valor_centavos: number
  aba: Aba
  /** Null = não disse (usa a última forma daquela descrição, ou crédito). */
  forma: Forma | null
  /** 1 = à vista. */
  parcelas: number
}

export type ResultadoFrase = { ok: true; frase: Frase } | { ok: false; erro: string }

const EXEMPLO = 'Exemplos: "uber 17", "mercado 85,90 caju", "ifood 42 débito", "tênis 300 em 3x".'

// Palavras que só ligam a frase ("17 reais de uber", "gastei 42 no ifood").
const VAZIAS = new Set(['reais', 'real', 'r$', 'rs', 'de', 'do', 'da', 'no', 'na', 'em', 'com', 'gastei', 'paguei', 'comprei', 'um', 'uma', 'e'])

function valorDoToken(token: string): number | null {
  let t = token.replace(/^r\$/i, '')
  // "17.50" (ponto como vírgula, comum no ditado) vira "17,50".
  if (/^\d+\.\d{1,2}$/.test(t)) t = t.replace('.', ',')
  return lerReais(t)
}

export function lerFrase(texto: string): ResultadoFrase {
  let resto = ` ${texto.trim().replace(/\s+/g, ' ')} `
  if (!resto.trim()) return { ok: false, erro: `Escreva o gasto. ${EXEMPLO}` }

  // Parcelas: "3x", "em 3 vezes", "3 parcelas".
  let parcelas = 1
  resto = resto.replace(/\s(?:em\s)?(\d{1,2})\s?(?:x|vezes|parcelas)(?=\s)/i, (_, n: string) => {
    parcelas = Number(n)
    return ' '
  })
  if (parcelas < 1 || parcelas > 48) return { ok: false, erro: 'Parcelas: de 1 a 48.' }

  let aba: Aba = 'nubank'
  let forma: Forma | null = null
  let valor: number | null = null
  const palavras: string[] = []

  for (const token of resto.trim().split(' ')) {
    const chave = semAcento(token).toLowerCase().replace(/[.,!?;:]+$/, '')
    if (chave === 'caju') aba = 'caju'
    else if (chave === 'nubank' || chave === 'nu') aba = 'nubank'
    else if (chave === 'debito') forma = 'debito'
    else if (chave === 'credito') forma = 'credito'
    else if (valor === null && /\d/.test(token) && valorDoToken(token.replace(/[!?;:]+$/, '')) !== null) {
      valor = valorDoToken(token.replace(/[!?;:]+$/, ''))
    } else palavras.push(token)
  }
  // Tira as palavras de ligação só das pontas: "17 reais de uber" → "uber"; "pão de queijo" fica inteiro.
  const vazia = (p: string) => VAZIAS.has(semAcento(p).toLowerCase())
  while (palavras.length && vazia(palavras[0])) palavras.shift()
  while (palavras.length && vazia(palavras[palavras.length - 1])) palavras.pop()

  if (valor === null || valor <= 0) return { ok: false, erro: `Não achei o valor. ${EXEMPLO}` }
  if (!palavras.length) return { ok: false, erro: `Faltou dizer o que foi. ${EXEMPLO}` }
  if (parcelas > 1 && valor < parcelas) return { ok: false, erro: 'O valor é menor que um centavo por parcela.' }

  const descricao = palavras.join(' ')
  return {
    ok: true,
    frase: {
      descricao: descricao[0].toUpperCase() + descricao.slice(1),
      valor_centavos: valor,
      aba,
      forma: aba === 'caju' ? null : forma,
      parcelas,
    },
  }
}

/** Os gastos a gravar (um, ou as parcelas). `forma` e `categoria` já resolvidas pelo histórico. */
export function gastosDaFrase(
  f: Frase,
  extras: { data: string; categoria: string; forma: Forma; grupoId: string },
): NovoGasto[] {
  const forma = f.aba === 'nubank' ? extras.forma : null
  if (f.parcelas > 1) {
    return gerarParcelas(
      {
        aba: f.aba,
        forma,
        descricao: f.descricao,
        categoria: extras.categoria,
        total_centavos: f.valor_centavos,
        data: extras.data,
        parcelas: f.parcelas,
      },
      extras.grupoId,
    )
  }
  return [
    {
      aba: f.aba,
      forma,
      descricao: f.descricao,
      valor_centavos: f.valor_centavos,
      data: extras.data,
      categoria: extras.categoria,
      tipo: 'unico',
      recorrencia_id: null,
      grupo_id: null,
      parcela_numero: null,
      parcela_total: null,
      caiu_manual: null,
    },
  ]
}

/** Resposta curta que o atalho mostra: "✅ Uber · R$ 17,00 · Nubank crédito · Transporte". */
export function confirmacao(f: Frase, forma: Forma, categoria: string): string {
  const cartao = f.aba === 'caju' ? 'Caju' : `Nubank ${forma === 'debito' ? 'débito' : 'crédito'}`
  const valor = f.parcelas > 1 ? `${formatarReais(f.valor_centavos)} em ${f.parcelas}x` : formatarReais(f.valor_centavos)
  return `✅ ${f.descricao} · ${valor} · ${cartao} · ${categoria}`
}

export function ehDesfazer(texto: string): boolean {
  return /^(desfazer|desfaz|apagar|apaga|cancelar|cancela)( o)?( ultimo)?$/.test(semAcento(texto).trim().toLowerCase())
}
