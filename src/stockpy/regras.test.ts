import { describe, expect, it } from 'vitest'
import {
  ESTADO_VAZIO,
  buscar_produto_recursivo,
  cadastrar_produto,
  calcular_valor_estoque,
  calcular_valor_estoque_recursivo,
  excluir_produto,
  exemploStockPy,
  formatar_moeda,
  gerar_matriz_vendas,
  ordenar_ranking,
  registrar_entrada,
  registrar_venda,
  relatorio_consolidado,
  verificar_estoque,
  type Estado,
} from './regras'

const novo = (): Estado => structuredClone(ESTADO_VAZIO)

describe('StockPy (mesmas regras do StockPy.py)', () => {
  it('formata moeda e diz a situação do estoque', () => {
    expect(formatar_moeda(1234.5)).toBe('R$ 1.234,50')
    expect(verificar_estoque({ codigo: 1, nome: 'a', categoria: 'b', preco: 1, quantidade: 0, minimo: 2, vendidos: 0 })).toBe('Sem estoque')
    expect(verificar_estoque({ codigo: 1, nome: 'a', categoria: 'b', preco: 1, quantidade: 2, minimo: 2, vendidos: 0 })).toBe('Estoque baixo')
    expect(verificar_estoque({ codigo: 1, nome: 'a', categoria: 'b', preco: 1, quantidade: 3, minimo: 2, vendidos: 0 })).toBe('Estoque adequado')
  })

  it('cadastro recusa código repetido e preço zero', () => {
    const e = novo()
    expect(cadastrar_produto(e, { codigo: 1, nome: 'A', categoria: 'X', preco: 10, quantidade: 5, minimo: 1 })).toBeNull()
    expect(cadastrar_produto(e, { codigo: 1, nome: 'B', categoria: 'X', preco: 10, quantidade: 5, minimo: 1 })).toMatch(/já existe/i)
    expect(cadastrar_produto(e, { codigo: 2, nome: 'B', categoria: 'X', preco: 0, quantidade: 5, minimo: 1 })).toMatch(/preço/i)
  })

  it('venda baixa o estoque e atualiza os totalizadores; recusa estoque insuficiente', () => {
    const e = novo()
    cadastrar_produto(e, { codigo: 1, nome: 'A', categoria: 'X', preco: 10, quantidade: 5, minimo: 1 })
    expect(registrar_venda(e, 1, 6, 0)).toMatch(/insuficiente/)
    expect(registrar_venda(e, 1, 2, 1)).toBeNull()
    expect(e.produtos[0].quantidade).toBe(3)
    expect([e.faturamento_total, e.total_operacoes, e.total_unidades_vendidas]).toEqual([20, 1, 2])
    expect(registrar_entrada(e, 1, 0)).toMatch(/positivo/)
    expect(registrar_entrada(e, 1, 4)).toBeNull()
    expect(e.produtos[0].quantidade).toBe(7)
    expect(excluir_produto(e, 1)).toMatch(/histórico/)
  })

  it('matriz, ranking por inserção e recursão batem com as versões com laço', () => {
    const e = exemploStockPy()
    const m = gerar_matriz_vendas(e.produtos, e.vendas)
    expect(m[1]).toEqual([10, 30, 0, 0])
    expect(ordenar_ranking(e.produtos.filter((p) => p.vendidos > 0)).map((p) => p.codigo)).toEqual([102, 101, 201, 202])
    expect(calcular_valor_estoque_recursivo(e.produtos)).toBeCloseTo(calcular_valor_estoque(e.produtos))
    expect(buscar_produto_recursivo(e.produtos, 201)).toMatchObject({ produto: { nome: 'Mouse sem fio' }, chamadas: 3 })
    expect(buscar_produto_recursivo(e.produtos, 999).produto).toBeNull()
  })

  it('relatório consolidado', () => {
    const r = relatorio_consolidado(exemploStockPy())
    expect(r.maisVendido?.nome).toBe('Caneta azul')
    expect(r.melhorPeriodo).toEqual({ periodo: 1, unidades: 30 })
    expect(r.melhorCategoria?.categoria).toBe('Papelaria')
    expect(r.emAlerta).toBe(2)
  })
})
