import type { Dados, Deposito, Gasto, NovaRecorrencia, NovoDeposito, NovoGasto, Recorrencia } from './types'
import { criarRepoLocal } from './localRepo'
import { criarRepoSupabase, supabaseConfigurado } from './supabaseRepo'

export interface Repo {
  /** Todos os dados do usuário (o volume é pequeno: algumas centenas de linhas por ano). */
  carregar(): Promise<Dados>

  criarGastos(novos: NovoGasto[]): Promise<Gasto[]>
  atualizarGasto(id: string, dados: Partial<NovoGasto>): Promise<void>
  excluirGastos(ids: string[]): Promise<void>

  criarRecorrencia(dados: NovaRecorrencia): Promise<Recorrencia>
  atualizarRecorrencia(id: string, dados: Partial<NovaRecorrencia>): Promise<void>
  excluirRecorrencia(id: string): Promise<void>

  /** Um recebido por mês: grava ou substitui. */
  salvarRecebido(mes: string, valorCentavos: number): Promise<void>

  criarDeposito(dados: NovoDeposito): Promise<Deposito>
  excluirDeposito(id: string): Promise<void>

  /** Só no modo demonstração: volta aos dados de exemplo. */
  restaurarExemplo?(): Promise<void>
}

/** Sem Supabase configurado, o app roda em modo demonstração, com dados só neste navegador. */
export const modoDemonstracao = !supabaseConfigurado

export const repo: Repo = supabaseConfigurado ? criarRepoSupabase() : criarRepoLocal()
