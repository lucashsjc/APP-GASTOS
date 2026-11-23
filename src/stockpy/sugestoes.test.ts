import { describe, expect, it } from 'vitest'
import { sugerir_categorias } from './sugestoes'

describe('sugerir_categorias', () => {
  it('sugere pelo nome do produto', () => {
    expect(sugerir_categorias('Boné')).toEqual(['Vestuário', 'Acessórios'])
    expect(sugerir_categorias('Mouse sem fio')).toEqual(['Informática', 'Eletrônicos'])
    expect(sugerir_categorias('Caderno 10 matérias')).toEqual(['Papelaria'])
    expect(sugerir_categorias('Coisa qualquer')).toEqual([])
  })

  it('aproveita as categorias que já existem no estoque, sem repetir', () => {
    expect(sugerir_categorias('Caneta azul', ['papelaria', 'Informática'])).toEqual(['papelaria', 'Informática'])
    expect(sugerir_categorias('', ['Utilidades'])).toEqual(['Utilidades'])
  })
})
