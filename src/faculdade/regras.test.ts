import { describe, expect, it } from 'vitest'
import { exemploFaculdade } from './exemplo'
import {
  formatarNota,
  lerNota,
  mediaPonderada,
  notaNecessaria,
  ordenarAtividades,
  prazoAtividade,
  proximaCor,
  resumoFaltas,
  situacaoNota,
  CORES_DISCIPLINAS,
} from './regras'
import type { Atividade } from './tipos'

const HOJE = '2026-10-21'

describe('notas', () => {
  it('média ponderada', () => {
    expect(mediaPonderada([{ valor: 6, peso: 1 }, { valor: 8, peso: 1 }])).toBe(7)
    expect(mediaPonderada([{ valor: 5, peso: 2 }, { valor: 8, peso: 1 }])).toBe(6)
    expect(mediaPonderada([])).toBeNull()
    expect(mediaPonderada([{ valor: 7, peso: 0 }])).toBeNull()
  })

  it('situação em relação à média mínima', () => {
    expect(situacaoNota(null, 6)).toBe('sem_notas')
    expect(situacaoNota(6, 6)).toBe('acima')
    expect(situacaoNota(5.99, 6)).toBe('abaixo')
    // Erro de ponto flutuante não reprova ninguém.
    expect(situacaoNota((5.4 + 6.6 + 6) / 3, 6)).toBe('acima')
  })

  it('lê e mostra notas no formato brasileiro', () => {
    expect(lerNota('7,5')).toBe(7.5)
    expect(lerNota('10')).toBe(10)
    expect(lerNota('6.25')).toBe(6.25)
    expect(lerNota('0')).toBe(0)
    expect(lerNota('abc')).toBeNull()
    expect(lerNota('101')).toBeNull()
    expect(lerNota('7,555')).toBeNull()
    expect(formatarNota(7.5)).toBe('7,5')
    expect(formatarNota(20 / 3)).toBe('6,67')
    expect(formatarNota(8)).toBe('8')
  })
})

describe('faltas', () => {
  it('soma as aulas perdidas e compara com o limite', () => {
    expect(resumoFaltas([{ quantidade: 2 }, { quantidade: 2 }], 16)).toEqual({
      total: 4,
      limite: 16,
      restantes: 12,
      proporcao: 0.25,
      nivel: 'ok',
    })
  })

  it('atenção a partir de 75% do limite e estourou depois do limite', () => {
    expect(resumoFaltas([{ quantidade: 12 }], 16).nivel).toBe('atencao')
    expect(resumoFaltas([{ quantidade: 16 }], 16)).toMatchObject({ nivel: 'atencao', restantes: 0 })
    expect(resumoFaltas([{ quantidade: 18 }], 16)).toMatchObject({ nivel: 'estourou', restantes: 0, proporcao: 1 })
  })

  it('sem limite cadastrado, só conta', () => {
    expect(resumoFaltas([{ quantidade: 3 }], null)).toMatchObject({ total: 3, nivel: 'sem_limite', restantes: null })
  })
})

describe('atividades', () => {
  const at = (entrega: string, feita = false): Atividade => ({
    id: entrega + feita,
    disciplina_id: null,
    titulo: 'Lista',
    entrega,
    feita,
    observacao: '',
  })

  it('prazo em relação a hoje', () => {
    expect(prazoAtividade(at('2026-10-18'), HOJE)).toEqual({ texto: 'Atrasada há 3 dias', nivel: 'atrasada' })
    expect(prazoAtividade(at('2026-10-20'), HOJE)).toEqual({ texto: 'Atrasada (ontem)', nivel: 'atrasada' })
    expect(prazoAtividade(at('2026-10-21'), HOJE)).toEqual({ texto: 'Hoje', nivel: 'hoje' })
    expect(prazoAtividade(at('2026-10-22'), HOJE)).toEqual({ texto: 'Amanhã', nivel: 'perto' })
    expect(prazoAtividade(at('2026-10-28'), HOJE)).toEqual({ texto: 'Em 7 dias', nivel: 'perto' })
    expect(prazoAtividade(at('2026-11-05'), HOJE)).toEqual({ texto: '05/11', nivel: 'longe' })
    expect(prazoAtividade(at('2026-10-01', true), HOJE)).toEqual({ texto: 'Entregue', nivel: 'feita' })
  })

  it('conta os dias certo na virada do ano', () => {
    expect(prazoAtividade(at('2027-01-02'), '2026-12-31').texto).toBe('Em 2 dias')
  })

  it('pendentes pela entrega mais próxima; feitas depois', () => {
    const { pendentes, feitas } = ordenarAtividades([
      at('2026-11-05'),
      at('2026-10-01', true),
      at('2026-10-18'),
      at('2026-10-10', true),
    ])
    expect(pendentes.map((a) => a.entrega)).toEqual(['2026-10-18', '2026-11-05'])
    expect(feitas.map((a) => a.entrega)).toEqual(['2026-10-10', '2026-10-01'])
  })
})

describe('disciplinas', () => {
  it('cores novas seguem a paleta em ordem', () => {
    expect(proximaCor([])).toBe(CORES_DISCIPLINAS[0])
    const tres = exemploFaculdade(HOJE).disciplinas.slice(0, 3)
    expect(proximaCor(tres)).toBe(CORES_DISCIPLINAS[3])
  })

  it('dados de exemplo são consistentes', () => {
    const d = exemploFaculdade(HOJE)
    const ids = new Set(d.disciplinas.map((x) => x.id))
    expect([...d.notas, ...d.faltas].every((x) => ids.has(x.disciplina_id))).toBe(true)
    expect(d.atividades.every((a) => a.disciplina_id === null || ids.has(a.disciplina_id))).toBe(true)
  })
})

describe('quanto preciso tirar', () => {
  const n = (valor: number | null, peso = 1, descricao = 'P') => ({ valor, peso, descricao })

  it('sem avaliações futuras, calcula para a próxima (peso 1)', () => {
    // 5 e 6 → precisa de 7 na próxima para fechar com 6.
    expect(notaNecessaria([n(5), n(6)], 6)).toEqual({ tipo: 'precisa', valor: 7, nasFuturas: [] })
    // Sem nota nenhuma: precisa da própria média mínima.
    expect(notaNecessaria([], 6)).toEqual({ tipo: 'precisa', valor: 6, nasFuturas: [] })
  })

  it('já acima da mínima e nada futuro cadastrado: ok', () => {
    expect(notaNecessaria([n(8), n(7)], 6)).toEqual({ tipo: 'ok' })
  })

  it('com avaliações futuras, usa os pesos delas', () => {
    // P1 = 5 (peso 1); P2 ainda vai acontecer (peso 2): 6·3 − 5 = 13 → 13/2 = 6,5.
    expect(notaNecessaria([n(5, 1, 'P1'), n(null, 2, 'P2')], 6)).toEqual({
      tipo: 'precisa',
      valor: 6.5,
      nasFuturas: ['P2'],
    })
    // Dízima sobe para o centésimo: (6·4 − 5) / 3 = 6,333… → 6,34.
    expect(notaNecessaria([n(5), n(null), n(null), n(null)], 6)).toEqual({
      tipo: 'precisa',
      valor: 6.34,
      nasFuturas: ['P', 'P', 'P'],
    })
  })

  it('garantido quando nem precisa pontuar no que falta', () => {
    expect(notaNecessaria([n(10, 3), n(null, 1)], 6)).toEqual({ tipo: 'garantido' })
  })

  it('impossível quando nem 10 em tudo resolve', () => {
    expect(notaNecessaria([n(1, 3), n(null, 1)], 6)).toEqual({ tipo: 'impossivel', maximo: 10 })
  })

  it('escala de 0 a 100 quando a média mínima passa de 10', () => {
    expect(notaNecessaria([n(50), n(null)], 60)).toEqual({ tipo: 'precisa', valor: 70, nasFuturas: ['P'] })
  })

  it('a média ignora avaliações que ainda não aconteceram', () => {
    expect(mediaPonderada([n(8), n(null, 5)])).toBe(8)
    expect(mediaPonderada([n(null)])).toBeNull()
  })
})
