import { describe, expect, it } from 'vitest'
import { completarGasto } from '../data/completar'
import type { Dados, NovoGasto } from '../data/types'
import { avisosDinheiro } from './avisos'

const gasto = (g: Partial<NovoGasto>, id: string) =>
  completarGasto(
    {
      aba: 'nubank',
      forma: 'credito',
      descricao: 'X',
      valor_centavos: 1000,
      data: '2026-11-01',
      categoria: 'Outros',
      tipo: 'unico',
      recorrencia_id: null,
      grupo_id: null,
      parcela_numero: null,
      parcela_total: null,
      caiu_manual: null,
      ...g,
    },
    id,
  )

function dados(): Dados {
  return {
    // Novembro: 3.000 para 30 dias = 100 por dia.
    recebidos: [{ id: 'r', aba: 'nubank', mes: '2026-11', valor_centavos: 300000 }],
    recorrencias: [],
    gastos: [
      gasto({ descricao: 'iFood', categoria: 'Alimentação', data: '2026-11-03', valor_centavos: 19000 }, 'a'),
      gasto({ descricao: 'Uber', categoria: 'Transporte', data: '2026-11-04', valor_centavos: 120000 }, 'b'),
    ],
    depositos: [{ id: 'd', aba: 'caju', data: '2026-10-30', valor_centavos: 60000, mes_conta: '2026-11', carteira: 'refeicao' }],
    limites: [
      { id: 'l1', aba: 'nubank', categoria: 'Alimentação', valor_centavos: 20000 },
      { id: 'l2', aba: 'nubank', categoria: 'Transporte', valor_centavos: 100000 },
    ],
    guardados: [{ id: 'g', mes: '2026-11', valor_centavos: 5000, tipo: 'guardar', descricao: '' }],
    metaGuardar: 20000,
  }
}

describe('avisos de dinheiro', () => {
  it('limite estourado vem primeiro; limite perto e ritmo acima também avisam', () => {
    const avisos = avisosDinheiro(dados(), '2026-11-10')
    expect(avisos[0]).toMatchObject({ chave: 'limite-nubank-Transporte', grave: true })
    expect(avisos.map((a) => a.chave)).toEqual(
      expect.arrayContaining(['limite-nubank-Transporte', 'limite-nubank-Alimentação', 'ritmo-nubank']),
    )
    // Antes dos últimos 10 dias, sem lembrete do cofrinho; com recebido e depósito, sem esses avisos.
    expect(avisos.map((a) => a.chave)).not.toEqual(expect.arrayContaining(['cofrinho']))
    expect(avisos.some((a) => a.chave === 'recebido' || a.chave === 'deposito')).toBe(false)
  })

  it('lembra a meta do cofrinho no fim do mês e o recebido que falta', () => {
    const d = dados()
    expect(avisosDinheiro(d, '2026-11-25').find((a) => a.chave === 'cofrinho')?.texto).toContain('R$ 150,00')
    expect(avisosDinheiro({ ...d, recebidos: [], depositos: [] }, '2026-11-10').map((a) => a.chave)).toEqual(
      expect.arrayContaining(['recebido', 'deposito']),
    )
  })

  it('sem nada para avisar, lista vazia', () => {
    const d: Dados = { ...dados(), gastos: [], limites: [], metaGuardar: null }
    expect(avisosDinheiro(d, '2026-11-10')).toEqual([])
  })
})
