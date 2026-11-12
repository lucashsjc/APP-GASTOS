import { describe, expect, it } from 'vitest'
import { completarGasto } from '../data/completar'
import type { Dados, NovoGasto } from '../data/types'
import { resumoNubank } from './calculos'
import { resumoCofrinho } from './cofrinho'
import { ritmoDoMes } from './ritmo'

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
    recebidos: ['2026-08', '2026-09', '2026-10', '2026-11'].map((mes) => ({ id: mes, aba: 'nubank' as const, mes, valor_centavos: 200000 })),
    recorrencias: [],
    gastos: [
      gasto({ data: '2026-08-10', valor_centavos: 150000 }, 'a'),
      gasto({ data: '2026-09-10', valor_centavos: 120000 }, 'b'),
      gasto({ data: '2026-10-10', valor_centavos: 210000 }, 'c'),
      gasto({ data: '2026-11-05', valor_centavos: 30000 }, 'd'),
    ],
    depositos: [],
    guardados: [
      // A sobra de agosto foi toda para a caixinha.
      { id: 'g1', mes: '2026-08', valor_centavos: 50000, tipo: 'guardar', descricao: 'Sobra de agosto' },
      { id: 'g2', mes: '2026-11', valor_centavos: 20000, tipo: 'guardar', descricao: '' },
      { id: 'g3', mes: '2026-11', valor_centavos: 5000, tipo: 'retirar', descricao: 'Cinema' },
    ],
    metaGuardar: 30000,
  }
}

describe('cofrinho', () => {
  it('o guardado sai do livre do mês; o retirado volta', () => {
    expect(resumoNubank(dados(), '2026-08', '2026-11-12').livre).toBe(0)
    expect(resumoNubank(dados(), '2026-08', '2026-11-12').guardado).toBe(50000)
    // Novembro: 2.000 − 300 − (200 guardados − 50 retirados)
    expect(resumoNubank(dados(), '2026-11', '2026-11-12').livre).toBe(200000 - 30000 - 15000)
  })

  it('o ritmo do dia a dia não conta o que foi guardado', () => {
    expect(ritmoDoMes(dados(), 'nubank', '2026-11', '2026-11-12')!.orcamento).toBe(200000 - 15000)
  })

  it('total guardado, meta do mês e as sobras de meses passados', () => {
    const r = resumoCofrinho(dados(), '2026-11-12')
    expect(r.total).toBe(50000 + 20000 - 5000)
    expect(r.meta).toBe(30000)
    expect(r.noMes).toBe(15000)
    // Agosto já foi guardado; outubro ficou negativo; setembro sobrou 800.
    expect(r.sobras).toEqual([{ mes: '2026-09', valor: 80000 }])
    expect(r.historico.map((h) => [h.mes, h.liquido])).toEqual([
      ['2026-11', 15000],
      ['2026-08', 50000],
    ])
  })

  it('sem o SQL do cofrinho, nada muda', () => {
    const d = { ...dados(), guardados: undefined, metaGuardar: undefined }
    expect(resumoNubank(d, '2026-08', '2026-11-12').livre).toBe(50000)
    expect(resumoCofrinho(d, '2026-11-12').total).toBe(0)
  })
})
