import { describe, expect, it } from 'vitest'
import type { DadosFaculdade } from '../faculdade/tipos'
import { alertasFaculdade, atividadesUrgentes, dataPorExtenso, saudacao, somarDias } from './resumo'

describe('tela Hoje', () => {
  it('saudação pela hora de São Paulo', () => {
    expect(saudacao(new Date('2026-10-22T11:00:00Z'))).toBe('Bom dia') // 08h
    expect(saudacao(new Date('2026-10-22T17:00:00Z'))).toBe('Boa tarde') // 14h
    expect(saudacao(new Date('2026-10-22T23:30:00Z'))).toBe('Boa noite') // 20h30
    expect(saudacao(new Date('2026-10-23T02:30:00Z'))).toBe('Boa noite') // 23h30 do dia 22
  })

  it('data por extenso', () => {
    expect(dataPorExtenso('2026-10-22')).toBe('quinta-feira, 22 de outubro')
  })

  it('soma dias atravessando o mês', () => {
    expect(somarDias('2026-10-28', 7)).toBe('2026-11-04')
  })

  it('atividades atrasadas e da próxima semana', () => {
    const a = (id: string, entrega: string, feita = false) => ({
      id,
      disciplina_id: null,
      titulo: id,
      entrega,
      feita,
      observacao: '',
    })
    const lista = [a('longe', '2026-11-20'), a('atrasada', '2026-10-10'), a('feita', '2026-10-22', true), a('semana', '2026-10-27')]
    expect(atividadesUrgentes(lista, '2026-10-22').map((x) => x.id)).toEqual(['atrasada', 'semana'])
  })

  it('alertas de faltas e notas, os graves primeiro', () => {
    const d: DadosFaculdade = {
      disciplinas: [
        { id: 'a', nome: 'Cálculo', cor: '#000', media_minima: 6, limite_faltas: 16 },
        { id: 'b', nome: 'Física', cor: '#000', media_minima: 6, limite_faltas: 12 },
        { id: 'c', nome: 'Química', cor: '#000', media_minima: 6, limite_faltas: 10 },
      ],
      notas: [
        { id: '1', disciplina_id: 'a', descricao: 'P1', valor: 5, peso: 1, data: null },
        { id: '2', disciplina_id: 'a', descricao: 'P2', valor: null, peso: 2, data: null },
        { id: '3', disciplina_id: 'c', descricao: 'P1', valor: 8, peso: 1, data: null },
      ],
      faltas: [
        { id: 'f1', disciplina_id: 'b', data: '2026-10-01', quantidade: 13 },
        { id: 'f2', disciplina_id: 'c', data: '2026-10-01', quantidade: 8 },
      ],
      atividades: [],
    }
    expect(alertasFaculdade(d).map((x) => [x.disciplina.nome, x.texto, x.grave])).toEqual([
      ['Física', 'Passou do limite de faltas (13/12)', true],
      ['Cálculo', 'Abaixo da média: precisa de 6,5 na P2', false],
      ['Química', 'Só pode faltar mais 2 aulas', false],
    ])
  })
})
