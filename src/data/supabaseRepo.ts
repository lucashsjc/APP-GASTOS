import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Repo } from './repo'
import type { Deposito, Gasto, Recebido, Recorrencia } from './types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const chave = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigurado = Boolean(url && chave)

export const supabase: SupabaseClient | null = supabaseConfigurado ? createClient(url!, chave!) : null

function erro(e: { message: string } | null) {
  if (e) throw new Error(e.message)
}

// Colunas lidas (o user_id fica de fora: quem filtra é o RLS).
const COLUNAS = {
  gastos: [
    'id',
    'aba',
    'forma',
    'descricao',
    'valor_centavos',
    'data',
    'categoria',
    'tipo',
    'recorrencia_id',
    'grupo_id',
    'parcela_numero',
    'parcela_total',
    'caiu_manual',
    'pago',
    'observacao',
    'separado',
    'dinheiro_a_parte',
  ],
  recorrencias: [
    'id',
    'aba',
    'forma',
    'descricao',
    'valor_centavos',
    'dia',
    'categoria',
    'inicio',
    'fim',
    'observacao',
    'separado',
    'dinheiro_a_parte',
  ],
  recebidos: ['id', 'aba', 'mes', 'valor_centavos'],
  depositos: ['id', 'aba', 'data', 'valor_centavos'],
}

type Tabela = keyof typeof COLUNAS

/**
 * Colunas que chegaram depois do esquema inicial, com o SQL que as cria. Até o SQL ser rodado, o app
 * continua funcionando sem elas (lê sem a coluna e usa o valor padrão).
 */
const OPCIONAIS: Record<string, { sql: string; uso: string }> = {
  pago: { sql: '005_pago.sql', uso: 'marcar como pago' },
  observacao: { sql: '006_observacao_e_a_parte.sql', uso: 'guardar a observação' },
  separado: { sql: '006_observacao_e_a_parte.sql', uso: 'separar o gasto dos outros' },
  dinheiro_a_parte: { sql: '007_dinheiro_a_parte.sql', uso: 'marcar como pago com dinheiro à parte' },
}

const PAGINA = 1000

export function criarRepoSupabase(): Repo {
  const db = supabase!
  const faltando: Record<Tabela, Set<string>> = {
    gastos: new Set(),
    recorrencias: new Set(),
    recebidos: new Set(),
    depositos: new Set(),
  }

  const colunas = (tabela: Tabela) => COLUNAS[tabela].filter((c) => !faltando[tabela].has(c)).join(', ')

  /** Coluna opcional citada num erro "column … does not exist" (código 42703). */
  function colunaQueFalta(tabela: Tabela, e: { code?: string; message: string } | null): string | null {
    if (e?.code !== '42703') return null
    const coluna = Object.keys(OPCIONAIS).find((c) => e.message.includes(c) && !faltando[tabela].has(c))
    if (coluna) faltando[tabela].add(coluna)
    return coluna ?? null
  }

  /** Tira das gravações as colunas que o banco ainda não tem; avisa se alguma delas traz informação. */
  function preparar<T extends object>(tabela: Tabela, linha: T): T {
    const copia: Record<string, unknown> = { ...(linha as Record<string, unknown>) }
    for (const coluna of faltando[tabela]) {
      const valor = copia[coluna]
      if (valor !== undefined && valor !== false && valor !== '' && valor !== null) {
        const { sql, uso } = OPCIONAIS[coluna]
        throw new Error(`Para ${uso}, rode o supabase/${sql} no Supabase.`)
      }
      delete copia[coluna]
    }
    return copia as T
  }

  const comPadroes = <T extends { observacao?: string; separado?: boolean; dinheiro_a_parte?: boolean }>(linha: T) => ({
    ...linha,
    observacao: linha.observacao ?? '',
    separado: linha.separado ?? false,
    dinheiro_a_parte: linha.dinheiro_a_parte ?? false,
  })

  /** Lê a tabela inteira, de 1000 em 1000 linhas (limite padrão da API). */
  async function tudo<T>(tabela: Tabela): Promise<T[]> {
    const linhas: T[] = []
    for (let de = 0; ; de += PAGINA) {
      const { data, error } = await db
        .from(tabela)
        .select(colunas(tabela))
        .order('id')
        .range(de, de + PAGINA - 1)
      if (colunaQueFalta(tabela, error)) return tudo<T>(tabela)
      erro(error)
      linhas.push(...((data ?? []) as T[]))
      if (!data || data.length < PAGINA) return linhas
    }
  }

  return {
    async carregar() {
      const [gastos, recorrencias, recebidos, depositos] = await Promise.all([
        tudo<Gasto>('gastos'),
        tudo<Recorrencia>('recorrencias'),
        tudo<Recebido>('recebidos'),
        tudo<Deposito>('depositos'),
      ])
      return {
        gastos: gastos.map((g) => ({ ...comPadroes(g), pago: g.pago ?? false })),
        recorrencias: recorrencias.map(comPadroes),
        recebidos,
        depositos,
      }
    },

    async criarGastos(novos) {
      if (!novos.length) return []
      const linhas = novos.map((g) => preparar('gastos', g))
      const { data, error } = await db.from('gastos').insert(linhas).select(colunas('gastos'))
      erro(error)
      return (data as unknown as Gasto[]).map((g) => ({ ...comPadroes(g), pago: g.pago ?? false }))
    },
    async atualizarGasto(id, dados) {
      const { error } = await db.from('gastos').update(preparar('gastos', dados)).eq('id', id)
      erro(error)
    },
    async excluirGastos(ids) {
      if (!ids.length) return
      const { error } = await db.from('gastos').delete().in('id', ids)
      erro(error)
    },

    async criarRecorrencia(dados) {
      const { data, error } = await db
        .from('recorrencias')
        .insert(preparar('recorrencias', dados))
        .select(colunas('recorrencias'))
        .single()
      erro(error)
      return comPadroes(data as unknown as Recorrencia)
    },
    async atualizarRecorrencia(id, dados) {
      const { error } = await db.from('recorrencias').update(preparar('recorrencias', dados)).eq('id', id)
      erro(error)
    },
    async excluirRecorrencia(id) {
      const { error } = await db.from('recorrencias').delete().eq('id', id)
      erro(error)
    },

    async salvarRecebido(mes, valorCentavos) {
      const { error } = await db
        .from('recebidos')
        .upsert({ aba: 'nubank', mes, valor_centavos: valorCentavos }, { onConflict: 'user_id,mes' })
      erro(error)
    },

    async criarDeposito(dados) {
      const { data, error } = await db.from('depositos').insert(dados).select(colunas('depositos')).single()
      erro(error)
      return data as unknown as Deposito
    },
    async excluirDeposito(id) {
      const { error } = await db.from('depositos').delete().eq('id', id)
      erro(error)
    },
  }
}
