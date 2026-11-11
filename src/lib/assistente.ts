// O que o assistente com IA recebe: um resumo em texto dos dados do Lucas (cards do mês, ritmo e a lista
// de gastos dos últimos meses). Montado aqui no app, que já tem tudo carregado; a função
// supabase/functions/assistente só repassa para o Claude. Testes em assistente.test.ts.

import type { Aba, Carteira, Dados } from '../data/types'
import { cardCaju, carteiraDe, certosDoMes, outrosDoMes, resumoNubank } from './calculos'
import { mesDe, nomeDoMes, somarMeses } from './datas'
import { formatarReais } from './dinheiro'
import { ritmoDoMes } from './ritmo'

const NOME_ABA: Record<Aba, string> = { nubank: 'Nubank', caju: 'Caju' }
const NOME_CARTEIRA: Record<Carteira, string> = { refeicao: 'refeição', mobilidade: 'mobilidade' }

/** Texto com os dados para a IA. `meses`: quantos meses de gastos para trás (contando o atual). */
export function contextoParaIA(dados: Dados, hoje: string, meses = 6): string {
  const atual = mesDe(hoje)
  const linhas: string[] = [`Hoje: ${hoje} (mês atual: ${nomeDoMes(atual)} de ${atual.slice(0, 4)}).`, '']

  const n = resumoNubank(dados, atual, hoje)
  const c = cardCaju(dados, atual, hoje)
  linhas.push('## Mês atual')
  linhas.push(
    `Nubank: recebido ${formatarReais(n.recebido)}; fixos e parcelas ${formatarReais(n.certos.total)}; ` +
      `outros gastos ${formatarReais(n.outros)}; à parte ${formatarReais(n.aParte)}; livre ${formatarReais(n.livre)}.`,
  )
  linhas.push(
    `Caju: saldo ${formatarReais(c.saldo)}` +
      (c.modo === 'atual' && c.porDia !== null ? ` (dá ${formatarReais(c.porDia)} por dia, ${c.diasRestantes} dias restantes)` : '') +
      `; carteiras: ${c.carteiras.map((k) => `${k.nome} ${formatarReais(k.saldo)}`).join(', ')}.`,
  )
  for (const aba of ['nubank', 'caju'] as Aba[]) {
    const r = ritmoDoMes(dados, aba, atual, hoje)
    if (!r) continue
    const gasto = r.real[r.real.length - 1] ?? 0
    linhas.push(
      `Ritmo ${NOME_ABA[aba]} (só dia a dia, sem fixos): orçamento ${formatarReais(r.orcamento)}, gasto ${formatarReais(gasto)} ` +
        `até o dia ${r.diaAtual} de ${r.dias}; ${r.delta <= 0 ? 'abaixo' : 'acima'} do ritmo em ${formatarReais(Math.abs(r.delta))}` +
        (r.porDiaDaqui !== null ? `; para fechar no ritmo, até ${formatarReais(r.porDiaDaqui)} por dia.` : '; o dinheiro do dia a dia acabou.'),
    )
  }

  linhas.push('', '## Fixos e parcelas do mês atual (data | cartão | descrição | categoria | valor | situação)')
  for (const aba of ['nubank', 'caju'] as Aba[]) {
    for (const k of certosDoMes(dados, aba, atual, hoje)) {
      linhas.push(
        `${k.data} | ${NOME_ABA[aba]} | ${k.descricao} | ${k.categoria} | ${formatarReais(k.valor_centavos)} | ` +
          `${k.grupo === 'parcelas' ? `parcela ${k.parcela_numero}/${k.parcela_total}` : k.grupo === 'todo_mes' ? 'todo mês' : 'previsto'}${k.pago ? ', pago' : ''}`,
      )
    }
  }

  linhas.push('', `## Gastos dos últimos ${meses} meses (mês | data | hora | cartão | descrição | categoria | valor | detalhe)`)
  for (let i = 0; i < meses; i++) {
    const mes = somarMeses(atual, -i)
    for (const aba of ['nubank', 'caju'] as Aba[]) {
      for (const g of outrosDoMes(dados, aba, mes)) {
        const detalhe = [
          aba === 'caju' ? NOME_CARTEIRA[carteiraDe(g)] : g.forma === 'debito' ? 'débito' : 'crédito',
          g.separado && 'à parte',
          g.dinheiro_a_parte && 'pago com dinheiro à parte',
        ]
          .filter(Boolean)
          .join(', ')
        linhas.push(
          `${mes} | ${g.data} | ${g.hora ?? ''} | ${NOME_ABA[aba]} | ${g.descricao} | ${g.categoria} | ${formatarReais(g.valor_centavos)} | ${detalhe}`,
        )
      }
    }
  }

  linhas.push('', '## Recebido (Nubank) e depósitos (Caju) por mês')
  for (let i = 0; i < meses; i++) {
    const mes = somarMeses(atual, -i)
    const rec = dados.recebidos.find((r) => r.mes === mes)?.valor_centavos ?? 0
    const dep = dados.depositos
      .filter((d) => (d.mes_conta ?? mesDe(d.data)) === mes)
      .reduce((s, d) => s + d.valor_centavos, 0)
    linhas.push(`${mes}: Nubank recebido ${formatarReais(rec)}; Caju depósitos ${formatarReais(dep)}`)
  }
  return linhas.join('\n')
}

/** Um gasto que a IA leu de uma foto de comprovante ou do extrato. */
export interface GastoLido {
  descricao: string
  valor_centavos: number
  /** AAAA-MM-DD, ou '' se não aparece. */
  data: string
  /** HH:MM, ou '' se não aparece. */
  hora: string
  aba: Aba | ''
  carteira: Carteira | ''
}

/** Confere o que veio da IA: descarta o que não tem descrição ou valor e limpa datas e horas inválidas. */
export function limparGastosLidos(brutos: unknown): GastoLido[] {
  if (!Array.isArray(brutos)) return []
  const lidos: GastoLido[] = []
  for (const b of brutos) {
    if (!b || typeof b !== 'object') continue
    const o = b as Record<string, unknown>
    const descricao = typeof o.descricao === 'string' ? o.descricao.trim().slice(0, 80) : ''
    const valor = typeof o.valor_centavos === 'number' ? Math.round(o.valor_centavos) : NaN
    if (!descricao || !Number.isFinite(valor) || valor <= 0) continue
    const data = typeof o.data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.data) ? o.data : ''
    const hora = typeof o.hora === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(o.hora) ? o.hora : ''
    const aba = o.aba === 'nubank' || o.aba === 'caju' ? o.aba : ''
    const carteira = o.carteira === 'refeicao' || o.carteira === 'mobilidade' ? o.carteira : ''
    lidos.push({ descricao, valor_centavos: valor, data, hora, aba, carteira })
  }
  return lidos
}
