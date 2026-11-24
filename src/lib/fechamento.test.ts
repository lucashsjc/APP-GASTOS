import { describe, expect, it } from 'vitest'
import { completarGasto } from '../data/completar'
import type { Dados, NovoGasto } from '../data/types'
import { fechamentoDoMes, sobraParaGuardar } from './fechamento'

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
    recebidos: ['2026-10', '2026-11'].map((mes) => ({ id: mes, aba: 'nubank' as const, mes, valor_centavos: 200000 })),
    recorrencias: [],
    gastos: [
      gasto({ data: '2026-10-10', valor_centavos: 100000, categoria: 'Mercado' }, 'a'),
      gasto({ data: '2026-11-10', valor_centavos: 120000, categoria: 'Transporte' }, 'b'),
      gasto({ data: '2026-11-12', valor_centavos: 30000, categoria: 'Lazer' }, 'c'),
      gasto({ aba: 'caju', data: '2026-11-05', valor_centavos: 25000, categoria: 'Mercado' }, 'd'),
    ],
    depositos: [{ id: 'dep', aba: 'caju', data: '2026-11-01', valor_centavos: 40000, carteira: 'refeicao', mes_conta: null }],
    guardados: [{ id: 'g', mes: '2026-11', valor_centavos: 10000, tipo: 'guardar', descricao: '' }],
  }
}

describe('fechamento do mês', () => {
  it('soma recebido, gasto, guardado e o que sobrou; compara com o mês anterior', () => {
    const f = fechamentoDoMes(dados(), '2026-11', '2026-12-02')
    expect(f.nubank).toMatchObject({ recebido: 200000, gasto: 150000, guardado: 10000, sobra: 40000, compras: 2, variacao: 50 })
    expect(f.nubank.campea?.categoria).toBe('Transporte')
    expect(f.caju).toMatchObject({ depositado: 40000, gasto: 25000, saldo: 15000 })
  })

  it('avisa a sobra do mês passado só nos 10 primeiros dias, e some depois de guardar', () => {
    expect(sobraParaGuardar(dados(), '2026-12-02')).toEqual({ mes: '2026-11', valor: 40000 })
    expect(sobraParaGuardar(dados(), '2026-12-15')).toBeNull()
    const guardou = dados()
    guardou.guardados!.push({ id: 'g2', mes: '2026-11', valor_centavos: 40000, tipo: 'guardar', descricao: 'Sobra de novembro' })
    expect(sobraParaGuardar(guardou, '2026-12-02')).toBeNull()
  })
})
