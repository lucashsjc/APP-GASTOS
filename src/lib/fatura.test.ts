import { describe, expect, it } from 'vitest'
import { completarGasto, completarRecorrencia } from '../data/completar'
import type { Dados, NovoGasto } from '../data/types'
import { faturaDoMes } from './fatura'

const gasto = (g: Partial<NovoGasto>, id: string) =>
  completarGasto(
    {
      aba: 'nubank',
      forma: 'credito',
      descricao: 'X',
      valor_centavos: 1000,
      data: '2026-11-05',
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
    recebidos: [],
    recorrencias: [
      completarRecorrencia(
        { aba: 'nubank', forma: 'credito', descricao: 'Spotify', valor_centavos: 2190, dia: 15, categoria: 'Fixos', inicio: '2026-01', fim: null },
        'sp',
      ),
    ],
    gastos: [
      gasto({ valor_centavos: 5000 }, 'a'),
      gasto({ valor_centavos: 3000, forma: 'debito' }, 'b'),
      // Comprado em 31/10, mas conta em novembro.
      gasto({ valor_centavos: 2000, data: '2026-10-31', mes_conta: '2026-11' }, 'c'),
      gasto({ valor_centavos: 4000, data: '2026-12-03' }, 'd'),
    ],
    depositos: [],
  }
}

describe('fatura do Nubank', () => {
  it('soma só o crédito do mês (com fixos e o que foi descontado no mês) e calcula fecha/vence', () => {
    const f = faturaDoMes(dados(), '2026-11', '2026-11-16')
    expect(f.total).toBe(5000 + 2000 + 2190)
    expect(f.itens).toBe(3)
    expect(f.fecha).toBe('2026-12-01')
    expect(f.vence).toBe('2026-12-08')
    expect(f.fechada).toBe(false)
    expect(f.diasParaVencer).toBe(22)
    expect(f.paga).toBe(false)
    // Dezembro: a compra do dia 3 e o Spotify.
    expect(f.proxima).toBe(4000 + 2190)
  })

  it('fechada a partir do dia 1 do mês seguinte', () => {
    expect(faturaDoMes(dados(), '2026-10', '2026-11-16').fechada).toBe(true)
  })
})
