import { describe, expect, it } from 'vitest'
import { completarGasto, completarRecorrencia } from '../data/completar'
import type { Dados, NovoGasto } from '../data/types'
import { assinaturas, buscar, resumoDoMes, situacaoDoLimite, usoDosLimites } from './extras'

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
    recebidos: [{ id: 'r', aba: 'nubank', mes: '2026-11', valor_centavos: 300000 }],
    recorrencias: [
      completarRecorrencia(
        { aba: 'nubank', forma: 'credito', descricao: 'Spotify', valor_centavos: 2190, dia: 5, categoria: 'Assinaturas', inicio: '2026-01', fim: null },
        'spotify',
      ),
      completarRecorrencia(
        { aba: 'nubank', forma: 'credito', descricao: 'Academia antiga', valor_centavos: 9900, dia: 5, categoria: 'Saúde', inicio: '2025-01', fim: '2026-03' },
        'academia',
      ),
    ],
    gastos: [
      gasto({ descricao: 'iFood', categoria: 'Alimentação', data: '2026-11-03', valor_centavos: 4000 }, 'a'),
      gasto({ descricao: 'iFood', categoria: 'Alimentação', data: '2026-11-03', valor_centavos: 2500 }, 'b'),
      gasto({ descricao: 'Uber', categoria: 'Transporte', data: '2026-11-04', valor_centavos: 1800 }, 'c'),
      gasto({ descricao: 'Ifood', categoria: 'Alimentação', data: '2026-10-10', valor_centavos: 3000 }, 'd'),
      // Netflix: 4 meses seguidos com o mesmo valor → assinatura achada.
      ...['2026-08-12', '2026-09-12', '2026-10-12', '2026-11-12'].map((data, i) =>
        gasto({ descricao: 'Netflix', categoria: 'Lazer', data, valor_centavos: 3990 }, `n${i}`),
      ),
      // Mercado: valores muito diferentes → não é assinatura.
      ...['2026-09-02', '2026-10-02', '2026-11-02'].map((data, i) =>
        gasto({ descricao: 'Mercado', categoria: 'Mercado', data, valor_centavos: [8000, 25000, 14000][i] }, `m${i}`),
      ),
    ],
    depositos: [],
    limites: [
      { id: 'l1', aba: 'nubank', categoria: 'Alimentação', valor_centavos: 8000 },
      { id: 'l2', aba: 'nubank', categoria: 'Transporte', valor_centavos: 10000 },
      { id: 'l3', aba: 'caju', categoria: 'Alimentação', valor_centavos: 1000 },
    ],
  }
}

describe('limites por categoria', () => {
  it('soma o que foi da categoria no mês e diz a situação', () => {
    const uso = usoDosLimites(dados(), 'nubank', '2026-11', '2026-11-20')
    expect(uso.map((u) => [u.limite.categoria, u.gasto, u.situacao])).toEqual([
      ['Alimentação', 6500, 'perto'],
      ['Transporte', 1800, 'ok'],
    ])
    expect(uso[0].restante).toBe(1500)
  })

  it('situação: perto a partir de 80%, passou acima de 100%', () => {
    expect(situacaoDoLimite(799, 1000)).toBe('ok')
    expect(situacaoDoLimite(800, 1000)).toBe('perto')
    expect(situacaoDoLimite(1000, 1000)).toBe('perto')
    expect(situacaoDoLimite(1001, 1000)).toBe('passou')
  })

  it('sem limites cadastrados (antes do SQL), lista vazia', () => {
    expect(usoDosLimites({ ...dados(), limites: undefined }, 'nubank', '2026-11', '2026-11-20')).toEqual([])
  })
})

describe('resumo do mês', () => {
  it('total, comparação, categoria campeã, maior dia e maior compra', () => {
    const r = resumoDoMes(dados(), 'nubank', '2026-11', '2026-11-30')
    // iFood 65 + Uber 18 + Netflix 39,90 + Mercado 140 + Spotify 21,90
    expect(r.total).toBe(6500 + 1800 + 3990 + 14000 + 2190)
    expect(r.compras).toBe(6)
    // Outubro: iFood 30 + Netflix 39,90 + Mercado 250 + Spotify 21,90
    expect(r.anterior).toBe(3000 + 3990 + 25000 + 2190)
    expect(r.campea?.categoria).toBe('Mercado')
    expect(r.maiorDia).toEqual({ data: '2026-11-02', total: 14000 })
    expect(r.maiorCompra?.descricao).toBe('Mercado')
    expect(r.subiram[0]).toEqual({ categoria: 'Alimentação', diferenca: 3500 })
  })
})

describe('busca', () => {
  it('acha sem diferenciar acento e maiúscula, em todos os meses, com o total', () => {
    const r = buscar(dados(), 'IFOOD')
    expect(r.gastos).toHaveLength(3)
    expect(r.total).toBe(9500)
    expect(r.porMes.map((m) => [m.mes, m.total])).toEqual([
      ['2026-11', 6500],
      ['2026-10', 3000],
    ])
    expect(buscar(dados(), 'alimentacao').gastos).toHaveLength(3)
    expect(buscar(dados(), 'spot').recorrencias.map((x) => x.descricao)).toEqual(['Spotify'])
    expect(buscar(dados(), 'i').gastos).toEqual([])
    expect(buscar(dados(), 'ifood', 'caju').gastos).toEqual([])
  })
})

describe('assinaturas', () => {
  it('pega os todo mês ativos e o que se repete todo mês com o mesmo valor', () => {
    const lista = assinaturas(dados(), '2026-11-20')
    expect(lista.map((a) => [a.descricao, a.origem, a.mensal, a.anual])).toEqual([
      ['Netflix', 'repetido', 3990, 47880],
      ['Spotify', 'fixo', 2190, 26280],
    ])
    expect(lista[0].meses).toBe(4)
  })
})
