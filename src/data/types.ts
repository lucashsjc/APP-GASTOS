// Tipos do app. Dinheiro sempre em centavos (inteiros); datas como texto AAAA-MM-DD e meses
// como AAAA-MM, sempre no fuso de São Paulo (ver src/lib/datas.ts).

export type Aba = 'nubank' | 'caju'
export type Forma = 'credito' | 'debito'

/**
 * - `unico`: gasto de uma vez (entra em "Outros gastos").
 * - `certo_unico`: gasto certo só deste mês (ou a ocorrência de um "todo mês" ajustada à mão).
 * - `parcela`: uma parcela de uma compra parcelada.
 */
export type TipoGasto = 'unico' | 'certo_unico' | 'parcela'

export interface Gasto {
  id: string
  aba: Aba
  /** Só no Nubank; no Caju é sempre null. */
  forma: Forma | null
  descricao: string
  valor_centavos: number
  data: string
  categoria: string
  tipo: TipoGasto
  /** Quando preenchido, este gasto substitui a ocorrência daquele "todo mês" no mês da data. */
  recorrencia_id: string | null
  /** Liga as parcelas de uma mesma compra. */
  grupo_id: string | null
  parcela_numero: number | null
  parcela_total: number | null
  /** Marcado à mão como já caído (mesmo com data futura). */
  caiu_manual: boolean | null
  /** Controle do Lucas: já pagou (ex.: a fatura) ou não. */
  pago: boolean
}

/** Ao criar, "pago" é opcional (começa como não pago). */
export type NovoGasto = Omit<Gasto, 'id' | 'pago'> & { pago?: boolean }

export interface Recorrencia {
  id: string
  aba: Aba
  forma: Forma | null
  descricao: string
  valor_centavos: number
  /** Dia do mês em que cai (1 a 31; em meses curtos, cai no último dia). */
  dia: number
  categoria: string
  /** Primeiro mês (AAAA-MM). */
  inicio: string
  /** Último mês (AAAA-MM), ou null enquanto não for encerrada. */
  fim: string | null
}

export type NovaRecorrencia = Omit<Recorrencia, 'id'>

export interface Recebido {
  id: string
  aba: 'nubank'
  mes: string
  valor_centavos: number
}

export interface Deposito {
  id: string
  aba: 'caju'
  data: string
  valor_centavos: number
}

export type NovoDeposito = Omit<Deposito, 'id'>

export interface Dados {
  gastos: Gasto[]
  recorrencias: Recorrencia[]
  recebidos: Recebido[]
  depositos: Deposito[]
}
