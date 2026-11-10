import { describe, expect, it } from 'vitest'
import { completarGasto, completarRecorrencia } from '../data/completar'
import type { Dados, NovoGasto } from '../data/types'
import { ideal, ritmoDoMes, simularCompra } from './ritmo'

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
    // Novembro tem 30 dias: recebido 3.300, PORTO de 300 → 3.000 para o dia a dia = 100 por dia.
    recebidos: [{ id: 'r', aba: 'nubank', mes: '2026-11', valor_centavos: 330000 }],
    recorrencias: [
      completarRecorrencia(
        { aba: 'nubank', forma: 'credito', descricao: 'PORTO', valor_centavos: 30000, dia: 1, categoria: 'Fixos', inicio: '2026-01', fim: null },
        'porto',
      ),
    ],
    gastos: [
      gasto({ data: '2026-11-02', valor_centavos: 15000 }, 'a'),
      gasto({ data: '2026-11-05', valor_centavos: 20000 }, 'b'),
      // Pago com dinheiro à parte: não entra.
      gasto({ data: '2026-11-06', valor_centavos: 99900, dinheiro_a_parte: true }, 'c'),
    ],
    depositos: [],
  }
}

describe('telemetria do mês (ritmo)', () => {
  it('orçamento do dia a dia sem os fixos e o gasto acumulado por dia', () => {
    const r = ritmoDoMes(dados(), 'nubank', '2026-11', '2026-11-10')!
    expect(r.orcamento).toBe(300000)
    expect(r.dias).toBe(30)
    expect(r.real).toHaveLength(10)
    expect(r.real[0]).toBe(0)
    expect(r.real[1]).toBe(15000)
    expect(r.real[9]).toBe(35000)
    // Ideal no dia 10: 1.000,00; gastou 350,00 → 650,00 abaixo do ritmo.
    expect(ideal(r, 10)).toBe(100000)
    expect(r.delta).toBe(-65000)
    // Sobram 2.650,00 para 21 dias (do dia 10 ao 30).
    expect(r.porDiaDaqui).toBe(Math.floor(265000 / 21))
  })

  it('mês futuro ou sem recebido não tem telemetria', () => {
    expect(ritmoDoMes(dados(), 'nubank', '2026-12', '2026-11-10')).toBeNull()
    expect(ritmoDoMes({ ...dados(), recebidos: [] }, 'nubank', '2026-11', '2026-11-10')).toBeNull()
  })

  it('mês passado usa o mês inteiro', () => {
    const r = ritmoDoMes(dados(), 'nubank', '2026-11', '2026-12-03')!
    expect(r.diaAtual).toBe(30)
    expect(r.delta).toBe(35000 - 300000)
  })
})

describe('posso comprar?', () => {
  it('cabe, aperta ou estoura', () => {
    expect(simularCompra(100000, 300000, 20000, 1, 20).veredito).toBe('cabe')
    // Sobra 200,00, menos que 10% de 3.000,00.
    expect(simularCompra(100000, 300000, 80000, 1, 20).veredito).toBe('aperta')
    expect(simularCompra(100000, 300000, 120000, 1, 20)).toMatchObject({ veredito: 'estoura', depois: -20000, porDiaDepois: null })
  })

  it('parcelado: só a 1ª parcela sai neste mês (com a sobra de centavos)', () => {
    const s = simularCompra(100000, 300000, 30001, 3, 20)
    expect(s.agora).toBe(10001)
    expect(s.parcelaSeguinte).toBe(10000)
    expect(s.mesesSeguintes).toBe(2)
    expect(s.depois).toBe(89999)
    expect(s.porDiaAntes).toBe(5000)
  })
})
