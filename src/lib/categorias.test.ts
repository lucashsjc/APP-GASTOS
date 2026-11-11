import { describe, expect, it } from 'vitest'
import { sugerirCategoria } from './categorias'

describe('categoria sugerida pelo nome', () => {
  it('reconhece os gastos mais comuns', () => {
    expect(sugerirCategoria('Uber')).toBe('Transporte')
    expect(sugerirCategoria('99 Pop')).toBe('Transporte')
    expect(sugerirCategoria('Mango')).toBe('Alimentação')
    expect(sugerirCategoria('Água')).toBe('Alimentação')
    expect(sugerirCategoria('Lanche cantina')).toBe('Alimentação')
    expect(sugerirCategoria('Açaí')).toBe('Alimentação')
    expect(sugerirCategoria('GTA VI')).toBe('Lazer')
    expect(sugerirCategoria('Tampa PS5')).toBe('Compras')
    expect(sugerirCategoria('Americanas')).toBe('Compras')
    expect(sugerirCategoria('Mercado')).toBe('Mercado')
    expect(sugerirCategoria('Remédio')).toBe('Saúde')
    expect(sugerirCategoria('PORTO')).toBe('Fixos')
  })

  it('o que não reconhece fica em Outros', () => {
    expect(sugerirCategoria('Copo')).toBe('Outros')
  })
})
