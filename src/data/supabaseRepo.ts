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
  gastos:
    'id, aba, forma, descricao, valor_centavos, data, categoria, tipo, recorrencia_id, grupo_id, parcela_numero, parcela_total, caiu_manual, pago',
  recorrencias: 'id, aba, forma, descricao, valor_centavos, dia, categoria, inicio, fim',
  recebidos: 'id, aba, mes, valor_centavos',
  depositos: 'id, aba, data, valor_centavos',
}

const PAGINA = 1000

export function criarRepoSupabase(): Repo {
  const db = supabase!
  // A coluna "pago" só existe depois do SQL 005. Até lá o app funciona, tratando tudo como não pago.
  let temPago = true
  const semPago = <T extends { pago?: boolean }>(g: T) => {
    if (temPago) return g
    const { pago: _pago, ...resto } = g
    return resto
  }

  /** Lê a tabela inteira, de 1000 em 1000 linhas (limite padrão da API). */
  async function tudo<T>(tabela: keyof typeof COLUNAS): Promise<T[]> {
    const linhas: T[] = []
    for (let de = 0; ; de += PAGINA) {
      const { data, error } = await db
        .from(tabela)
        .select(tabela === 'gastos' && !temPago ? COLUNAS.gastos.replace(', pago', '') : COLUNAS[tabela])
        .order('id')
        .range(de, de + PAGINA - 1)
      if (error?.code === '42703' && tabela === 'gastos' && temPago) {
        temPago = false
        return tudo<T>(tabela)
      }
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
      return { gastos: gastos.map((g) => ({ ...g, pago: g.pago ?? false })), recorrencias, recebidos, depositos }
    },

    async criarGastos(novos) {
      if (!novos.length) return []
      if (!temPago && novos.some((g) => g.pago)) {
        throw new Error('Para marcar como pago, rode o supabase/005_pago.sql no Supabase.')
      }
      const { data, error } = await db
        .from('gastos')
        .insert(novos.map(semPago))
        .select(temPago ? COLUNAS.gastos : COLUNAS.gastos.replace(', pago', ''))
      erro(error)
      return (data as unknown as Gasto[]).map((g) => ({ ...g, pago: g.pago ?? false }))
    },
    async atualizarGasto(id, dados) {
      if ('pago' in dados && !temPago) {
        throw new Error('Para marcar como pago, rode o supabase/005_pago.sql no Supabase.')
      }
      const { error } = await db.from('gastos').update(dados).eq('id', id)
      erro(error)
    },
    async excluirGastos(ids) {
      if (!ids.length) return
      const { error } = await db.from('gastos').delete().in('id', ids)
      erro(error)
    },

    async criarRecorrencia(dados) {
      const { data, error } = await db.from('recorrencias').insert(dados).select(COLUNAS.recorrencias).single()
      erro(error)
      return data as unknown as Recorrencia
    },
    async atualizarRecorrencia(id, dados) {
      const { error } = await db.from('recorrencias').update(dados).eq('id', id)
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
      const { data, error } = await db.from('depositos').insert(dados).select(COLUNAS.depositos).single()
      erro(error)
      return data as unknown as Deposito
    },
    async excluirDeposito(id) {
      const { error } = await db.from('depositos').delete().eq('id', id)
      erro(error)
    },
  }
}
