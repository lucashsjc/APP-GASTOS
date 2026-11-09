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
  eventosCalendario,
  proximosEventos,
  semanasDoMes,
  outrasNotas,
  provaDoSemestre,
  resumoSemestre,
  extrasDoBimestre,
  aulasDaDisciplinaNoDia,
  aulasDoDia,
  diaDaSemana,
  historico,
  nomeDoSemestre,
  provasProximas,
  semestreAtual,
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

describe('calendário', () => {
  it('junta provas com data e entregas, com as provas primeiro no mesmo dia', () => {
    const d = exemploFaculdade(HOJE)
    d.notas.push({ id: 'p', disciplina_id: 'd-calc', descricao: 'P2', valor: null, peso: 2, data: '2026-10-30' })
    d.atividades.push({ id: 'e', disciplina_id: null, titulo: 'Lista', entrega: '2026-10-30', feita: false, observacao: '' })
    const doDia = eventosCalendario(d).filter((e) => e.data === '2026-10-30')
    expect(doDia.map((e) => e.tipo)).toEqual(['prova', 'entrega'])
    // Avaliação sem data não aparece no calendário.
    expect(eventosCalendario(d).some((e) => e.tipo === 'prova' && e.nota.id === 'sem-data')).toBe(false)
  })

  it('próximos: provas sem nota a partir de hoje e entregas pendentes', () => {
    const d = { disciplinas: [], faltas: [], pontos_extras: [], aulas: [], notas: [
      { id: 'a', disciplina_id: 'x', descricao: 'P1', valor: 7, peso: 1, data: '2026-10-25' },
      { id: 'b', disciplina_id: 'x', descricao: 'P2', valor: null, peso: 1, data: '2026-10-25' },
      { id: 'c', disciplina_id: 'x', descricao: 'P0', valor: null, peso: 1, data: '2026-10-01' },
    ], atividades: [
      { id: 'e', disciplina_id: null, titulo: 'Feita', entrega: '2026-10-25', feita: true, observacao: '' },
      { id: 'f', disciplina_id: null, titulo: 'Atrasada', entrega: '2026-10-20', feita: false, observacao: '' },
    ] }
    const ids = proximosEventos(eventosCalendario(d), HOJE).map((e) => (e.tipo === 'prova' ? e.nota.id : e.atividade.id))
    expect(ids).toEqual(['f', 'b'])
  })

  it('semanas de segunda a domingo', () => {
    // 1º de novembro de 2026 é um domingo.
    const s = semanasDoMes('2026-11')
    expect(s[0]).toEqual([null, null, null, null, null, null, '2026-11-01'])
    expect(s.at(-1)).toEqual(['2026-11-30', null, null, null, null, null, null])
    expect(s.every((w) => w.length === 7)).toBe(true)
  })
})

describe('P1 e P2 do semestre (média 5)', () => {
  it('com a P1, diz quanto precisa na P2', () => {
    expect(resumoSemestre(4, null, 5)).toEqual({ tipo: 'precisa', valor: 6, naProva: 2 })
    expect(resumoSemestre(3.5, null, 5)).toEqual({ tipo: 'precisa', valor: 6.5, naProva: 2 })
    expect(resumoSemestre(10, null, 5)).toEqual({ tipo: 'garantido', naProva: 2 })
    expect(resumoSemestre(null, 7, 5)).toEqual({ tipo: 'precisa', valor: 3, naProva: 1 })
    expect(resumoSemestre(null, 0, 6)).toEqual({ tipo: 'impossivel', naProva: 1, maximo: 10 })
  })

  it('com as duas, fecha a média', () => {
    expect(resumoSemestre(4, 6, 5)).toEqual({ tipo: 'fechado', media: 5, passou: true })
    expect(resumoSemestre(4, 5.9, 5)).toEqual({ tipo: 'fechado', media: 4.95, passou: false })
    expect(resumoSemestre(null, null, 5)).toEqual({ tipo: 'vazio' })
  })

  it('acha a P1 e a P2 (também pelos nomes antigos com bimestre)', () => {
    const n = (id: string, descricao: string, valor: number | null) => ({ id, disciplina_id: 'x', descricao, valor, peso: 1, data: null })
    expect(provaDoSemestre([n('a', 'P1', 6), n('b', 'P2', 7), n('c', 'Trabalho', 9)], 2)?.id).toBe('b')
    const antigas = [n('a', 'P1 · 1º bim', 6), n('b', 'P1 · 2º bim', 8), n('c', 'Trabalho', 9)]
    expect(provaDoSemestre(antigas, 1)?.id).toBe('a')
    expect(provaDoSemestre(antigas, 2)?.id).toBe('b')
    expect(outrasNotas(antigas).map((x) => x.id)).toEqual(['c'])
  })
})

describe('pontos extras (SEAU e ACI no 2º bimestre)', () => {
  it('somam na nota da P2 e baixam o que precisa tirar', () => {
    // Média 5: com 4 na P1, a P2 precisa valer 6; com +3, basta tirar 3.
    expect(resumoSemestre(4, null, 5, 0, 3)).toEqual({ tipo: 'precisa', valor: 3, naProva: 2 })
    expect(resumoSemestre(7, null, 5, 0, 3)).toEqual({ tipo: 'garantido', naProva: 2 })
    expect(resumoSemestre(4, 3, 5, 0, 3)).toEqual({ tipo: 'fechado', media: 5, passou: true })
    // A P2 com os extras não passa de 10.
    expect(resumoSemestre(8, 9, 5, 0, 3)).toEqual({ tipo: 'fechado', media: 9, passou: true })
    // Com 0 na P1, nem 10 na P2 chega: precisaria de 10 (com os extras, a P2 vale no máximo 10).
    expect(resumoSemestre(0, null, 6, 0, 3)).toEqual({ tipo: 'impossivel', naProva: 2, maximo: 10 })
  })

  it('só do bimestre certo', () => {
    const pontos = [{ pontos: 3, bimestre: 2 }]
    expect(extrasDoBimestre(pontos, 1)).toBe(0)
    expect(extrasDoBimestre(pontos, 2)).toBe(3)
  })
})

describe('horário das aulas', () => {
  const aula = (id: string, disciplina_id: string, dia_semana: number, quantidade: number, inicio: string | null) => ({
    id,
    disciplina_id,
    dia_semana,
    quantidade,
    inicio,
  })

  it('dia da semana: 1 = segunda, 7 = domingo', () => {
    expect(diaDaSemana('2026-11-09')).toBe(1)
    expect(diaDaSemana('2026-11-15')).toBe(7)
  })

  it('aulas do dia pelo horário e quantas são de cada matéria', () => {
    const aulas = [aula('a', 'calc', 1, 2, '20:40'), aula('b', 'fis', 1, 2, '19:00'), aula('c', 'calc', 2, 2, null), aula('d', 'calc', 1, 1, null)]
    expect(aulasDoDia(aulas, '2026-11-09').map((x) => x.id)).toEqual(['b', 'a', 'd'])
    expect(aulasDaDisciplinaNoDia(aulas, 'calc', '2026-11-09')).toBe(3)
    expect(aulasDaDisciplinaNoDia(aulas, 'calc', '2026-11-11')).toBe(0)
  })
})

describe('semestres', () => {
  it('o semestre atual deixa de fora as matérias encerradas e o que é delas', () => {
    const d = exemploFaculdade(HOJE)
    const atual = semestreAtual(d)
    expect(atual.disciplinas.every((x) => x.semestre === null)).toBe(true)
    expect(atual.notas.some((n) => n.disciplina_id === 'd-alg')).toBe(false)
    expect(d.notas.some((n) => n.disciplina_id === 'd-alg')).toBe(true)
  })

  it('histórico com a média final e o coeficiente', () => {
    const h = historico(exemploFaculdade(HOJE))
    expect(h.map((s) => s.nome)).toEqual(['2026/1'])
    expect(h[0].materias.map((m) => [m.disciplina.nome, m.media, m.passou])).toEqual([
      ['Algoritmos', 7.5, true],
      ['Geometria Analítica', 5.25, true],
    ])
    expect(h[0].coeficiente).toBe(6.375)
  })

  it('nome sugerido do semestre', () => {
    expect(nomeDoSemestre('2026-11-09')).toBe('2026/2')
    expect(nomeDoSemestre('2026-06-30')).toBe('2026/1')
  })
})

describe('provas dos próximos dias', () => {
  it('mostra quanto precisa na P2 quando a P1 já saiu', () => {
    const d = exemploFaculdade('2026-11-09')
    const proximas = provasProximas(d, '2026-11-09')
    const fis = proximas.find((p) => p.disciplina?.id === 'd-fis')!
    // Física: 1,5 na P1, média 5, +3 na P2 → precisa de 5,5.
    expect(fis.dias).toBe(4)
    expect(fis.precisa).toBe(5.5)
    expect(proximas.map((p) => p.dias)).toEqual([...proximas.map((p) => p.dias)].sort((a, b) => a - b))
  })
})
