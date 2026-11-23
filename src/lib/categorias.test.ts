import { describe, expect, it } from 'vitest'
import { sugerirCategoria, sugestoesDeCategoria } from './categorias'

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

describe('palavras novas (gastos do Lucas que caíam em Outros)', () => {
  it('reconhece espetinho, marmita, chopp, Tauste, boné e capinha', () => {
    expect(sugerirCategoria('Espetinho')).toBe('Alimentação')
    expect(sugerirCategoria('Marmita')).toBe('Alimentação')
    expect(sugerirCategoria('Chopp')).toBe('Alimentação')
    expect(sugerirCategoria('Tauste')).toBe('Mercado')
    expect(sugerirCategoria('Boné')).toBe('Compras')
    expect(sugerirCategoria('Capinha')).toBe('Compras')
  })
})

describe('sugestões de categoria pelo nome', () => {
  it('dá mais de uma opção para escolher', () => {
    expect(sugestoesDeCategoria('Boné')).toEqual(['Vestuário', 'Acessórios', 'Compras'])
    expect(sugestoesDeCategoria('Fone bluetooth')).toEqual(['Eletrônicos'])
    expect(sugestoesDeCategoria('Xerox')).toEqual(['Educação'])
    expect(sugestoesDeCategoria('Uber')).toEqual(['Transporte'])
    expect(sugestoesDeCategoria('Coisa qualquer')).toEqual([])
  })
})
