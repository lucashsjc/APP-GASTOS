// Regras da área Faculdade: média, situação, faltas e prazos. Funções puras, com testes em regras.test.ts.

import { dataCurta } from '../lib/datas'
import type { AbaXlsx } from '../lib/xlsx'
import type { Atividade, DadosFaculdade, Disciplina, Falta, Nota } from './tipos'

/** Cores para as disciplinas novas, em ordem. */
export const CORES_DISCIPLINAS = ['#cfe7f8', '#bfe6cf', '#f3d9a8', '#f1d0e6', '#dcd2f6', '#f5cbc6', '#c6ecea', '#f6dcc6']

export function proximaCor(disciplinas: Disciplina[]): string {
  return CORES_DISCIPLINAS[disciplinas.length % CORES_DISCIPLINAS.length]
}

/** Média ponderada das notas que já saíram (null se nenhuma saiu). */
export function mediaPonderada(notas: Pick<Nota, 'valor' | 'peso'>[]): number | null {
  const feitas = notas.filter((n): n is { valor: number; peso: number } => n.valor !== null)
  const pesos = feitas.reduce((s, n) => s + n.peso, 0)
  if (!feitas.length || pesos <= 0) return null
  return feitas.reduce((s, n) => s + n.valor * n.peso, 0) / pesos
}

export type Necessaria =
  /** Já passou da mínima e não há avaliações futuras cadastradas. */
  | { tipo: 'ok' }
  /** Mesmo tirando zero no que falta, a média fica na mínima. */
  | { tipo: 'garantido' }
  /** Precisa de média `valor` nas avaliações futuras (ou na próxima, se nenhuma foi cadastrada). */
  | { tipo: 'precisa'; valor: number; nasFuturas: string[] }
  /** Nem com a nota máxima em tudo o que falta chega na mínima. */
  | { tipo: 'impossivel'; maximo: number }

/**
 * Quanto precisa tirar para fechar com a média mínima.
 * Com avaliações futuras cadastradas (nota vazia), considera os pesos delas; sem nenhuma, calcula
 * para uma próxima avaliação de peso 1. Nota máxima 10 (ou 100, se a média mínima passar de 10).
 */
export function notaNecessaria(notas: Pick<Nota, 'valor' | 'peso' | 'descricao'>[], minima: number): Necessaria {
  const feitas = notas.filter((n) => n.valor !== null)
  const futuras = notas.filter((n) => n.valor === null)
  const pontos = feitas.reduce((s, n) => s + (n.valor as number) * n.peso, 0)
  const pesoFeito = feitas.reduce((s, n) => s + n.peso, 0)
  const maximo = minima > 10 ? 100 : 10

  if (!futuras.length && feitas.length && pontos / pesoFeito >= minima - 1e-9) return { tipo: 'ok' }

  const pesoFuturo = futuras.length ? futuras.reduce((s, n) => s + n.peso, 0) : 1
  const valor = (minima * (pesoFeito + pesoFuturo) - pontos) / pesoFuturo
  // Arredonda para cima em centésimos (precisa de 6,333… → 6,34), sem erro de ponto flutuante.
  const arredondado = Math.ceil(Math.round(valor * 1e6) / 1e4) / 100
  if (arredondado <= 0) return { tipo: 'garantido' }
  if (arredondado > maximo) return { tipo: 'impossivel', maximo }
  return { tipo: 'precisa', valor: arredondado, nasFuturas: futuras.map((n) => n.descricao) }
}

export type SituacaoNota = 'sem_notas' | 'acima' | 'abaixo'

export function situacaoNota(media: number | null, minima: number): SituacaoNota {
  if (media === null) return 'sem_notas'
  // Arredonda para 2 casas antes de comparar (5,999999 conta como 6).
  return Math.round(media * 100) / 100 >= minima ? 'acima' : 'abaixo'
}

/** 7,5 / 10 / 6,25. Até duas casas, sem zeros sobrando. */
export function formatarNota(valor: number): string {
  return (Math.round(valor * 100) / 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

/** Lê uma nota digitada ("7,5", "10", "6.25"). Null se não for válida (0 a 100). */
export function lerNota(texto: string): number | null {
  const limpo = texto.trim().replace(',', '.')
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(limpo)) return null
  const valor = Number(limpo)
  return valor >= 0 && valor <= 100 ? valor : null
}

export type NivelFaltas = 'sem_limite' | 'ok' | 'atencao' | 'estourou'

export interface ResumoFaltas {
  total: number
  limite: number | null
  /** Quantas ainda pode faltar (null sem limite; 0 se já chegou). */
  restantes: number | null
  /** 0 a 1 (do limite). */
  proporcao: number
  nivel: NivelFaltas
}

/** Atenção a partir de 75% do limite; estourou ao passar do limite. */
export function resumoFaltas(faltas: Pick<Falta, 'quantidade'>[], limite: number | null): ResumoFaltas {
  const total = faltas.reduce((s, f) => s + f.quantidade, 0)
  if (limite === null || limite <= 0) {
    return { total, limite: null, restantes: null, proporcao: 0, nivel: 'sem_limite' }
  }
  const proporcao = total / limite
  const nivel = total > limite ? 'estourou' : proporcao >= 0.75 ? 'atencao' : 'ok'
  return { total, limite, restantes: Math.max(0, limite - total), proporcao: Math.min(1, proporcao), nivel }
}

function diasEntre(de: string, ate: string): number {
  const [a1, m1, d1] = de.split('-').map(Number)
  const [a2, m2, d2] = ate.split('-').map(Number)
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000)
}

export type NivelPrazo = 'feita' | 'atrasada' | 'hoje' | 'perto' | 'longe'

/** Texto e urgência do prazo de uma atividade, contando a partir de hoje. */
export function prazoAtividade(a: Pick<Atividade, 'entrega' | 'feita'>, hoje: string): { texto: string; nivel: NivelPrazo } {
  if (a.feita) return { texto: 'Entregue', nivel: 'feita' }
  const dias = diasEntre(hoje, a.entrega)
  if (dias < 0) return { texto: dias === -1 ? 'Atrasada (ontem)' : `Atrasada há ${-dias} dias`, nivel: 'atrasada' }
  if (dias === 0) return { texto: 'Hoje', nivel: 'hoje' }
  if (dias === 1) return { texto: 'Amanhã', nivel: 'perto' }
  if (dias <= 7) return { texto: `Em ${dias} dias`, nivel: 'perto' }
  return { texto: dataCurta(a.entrega), nivel: 'longe' }
}

/** Pendentes primeiro (da entrega mais próxima para a mais distante); depois as feitas, da mais recente. */
export function ordenarAtividades(atividades: Atividade[]): { pendentes: Atividade[]; feitas: Atividade[] } {
  return {
    pendentes: atividades.filter((a) => !a.feita).sort((a, b) => a.entrega.localeCompare(b.entrega)),
    feitas: atividades.filter((a) => a.feita).sort((a, b) => b.entrega.localeCompare(a.entrega)),
  }
}

/** Abas da cópia de segurança (.xlsx) com os dados da Faculdade. */
export function exportacaoFaculdade(d: DadosFaculdade): AbaXlsx[] {
  const nome = (id: string | null) => d.disciplinas.find((x) => x.id === id)?.nome ?? ''
  return [
    {
      nome: 'Disciplinas',
      colunas: ['Disciplina', 'Média mínima', 'Limite de faltas'],
      linhas: d.disciplinas.map((x) => [x.nome, x.media_minima, x.limite_faltas]),
    },
    {
      nome: 'Notas',
      colunas: ['Disciplina', 'O que foi', 'Nota', 'Peso', 'Data'],
      linhas: d.notas.map((n) => [nome(n.disciplina_id), n.descricao, n.valor ?? 'ainda não saiu', n.peso, n.data ? { data: n.data } : null]),
    },
    {
      nome: 'Faltas',
      colunas: ['Disciplina', 'Data', 'Aulas'],
      linhas: [...d.faltas]
        .sort((a, b) => a.data.localeCompare(b.data))
        .map((f) => [nome(f.disciplina_id), { data: f.data }, f.quantidade]),
    },
    {
      nome: 'Atividades',
      colunas: ['Atividade', 'Disciplina', 'Entrega', 'Entregue', 'Observação'],
      linhas: [...d.atividades]
        .sort((a, b) => a.entrega.localeCompare(b.entrega))
        .map((a) => [a.titulo, nome(a.disciplina_id), { data: a.entrega }, a.feita ? 'Sim' : 'Não', a.observacao]),
    },
  ]
}

// ---------- Calendário ----------

export type EventoCalendario =
  | { tipo: 'prova'; data: string; nota: Nota; disciplina: Disciplina | null }
  | { tipo: 'entrega'; data: string; atividade: Atividade; disciplina: Disciplina | null }

/**
 * Provas (avaliações com data, já com nota ou ainda não) e entregas de atividades, por data.
 * No mesmo dia, as provas vêm antes.
 */
export function eventosCalendario(d: DadosFaculdade): EventoCalendario[] {
  const disciplina = (id: string | null) => d.disciplinas.find((x) => x.id === id) ?? null
  const eventos: EventoCalendario[] = [
    ...d.notas
      .filter((n): n is Nota & { data: string } => Boolean(n.data))
      .map((n) => ({ tipo: 'prova' as const, data: n.data, nota: n, disciplina: disciplina(n.disciplina_id) })),
    ...d.atividades.map((a) => ({ tipo: 'entrega' as const, data: a.entrega, atividade: a, disciplina: disciplina(a.disciplina_id) })),
  ]
  return eventos.sort((a, b) => a.data.localeCompare(b.data) || (a.tipo === b.tipo ? 0 : a.tipo === 'prova' ? -1 : 1))
}

/** O que vem por aí: provas que ainda não têm nota e entregas pendentes, de hoje em diante (e as atrasadas). */
export function proximosEventos(eventos: EventoCalendario[], hoje: string): EventoCalendario[] {
  return eventos.filter((e) =>
    e.tipo === 'prova' ? e.data >= hoje && e.nota.valor === null : !e.atividade.feita,
  )
}

/** Dias do mês (AAAA-MM) arrumados em semanas de segunda a domingo; null = espaço vazio. */
export function semanasDoMes(mes: string): (string | null)[][] {
  const [a, m] = mes.split('-').map(Number)
  const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate()
  // getUTCDay: 0 = domingo. Segunda vira a primeira coluna.
  const inicio = (new Date(Date.UTC(a, m - 1, 1)).getUTCDay() + 6) % 7
  const celulas: (string | null)[] = Array(inicio).fill(null)
  for (let dia = 1; dia <= ultimo; dia++) celulas.push(`${mes}-${String(dia).padStart(2, '0')}`)
  while (celulas.length % 7) celulas.push(null)
  const semanas: (string | null)[][] = []
  for (let i = 0; i < celulas.length; i += 7) semanas.push(celulas.slice(i, i + 7))
  return semanas
}

/** Quantos dias faltam até a data (negativo = já passou). */
export function diasAte(hoje: string, data: string): number {
  return diasEntre(hoje, data)
}

// ---------- P1 e P2 de cada bimestre ----------

export type Bimestre = 1 | 2
export type NumeroProva = 1 | 2
export const BIMESTRES: Bimestre[] = [1, 2]

/** Nome com que a prova é guardada: "P1 · 1º bim". */
export function nomeProva(prova: NumeroProva, bimestre: Bimestre): string {
  return `P${prova} · ${bimestre}º bim`
}

function semEspacos(texto: string): string {
  return texto.toLowerCase().replace(/[\s·.º°]/g, '')
}

/** A nota que ocupa a P1 ou a P2 do bimestre. As antigas, só "P1" ou "P2", contam no 1º bimestre. */
export function provaDoBimestre(notas: Nota[], prova: NumeroProva, bimestre: Bimestre): Nota | undefined {
  const alvo = semEspacos(nomeProva(prova, bimestre))
  return (
    notas.find((n) => semEspacos(n.descricao) === alvo) ??
    (bimestre === 1 ? notas.find((n) => semEspacos(n.descricao) === `p${prova}`) : undefined)
  )
}

/** As notas que não são P1 ou P2 de nenhum bimestre (trabalhos, listas...). */
export function outrasNotas(notas: Nota[]): Nota[] {
  const das = new Set(
    BIMESTRES.flatMap((b) => [provaDoBimestre(notas, 1, b), provaDoBimestre(notas, 2, b)]).filter(Boolean).map((n) => n!.id),
  )
  return notas.filter((n) => !das.has(n.id))
}

export type ResumoBimestre =
  | { tipo: 'vazio' }
  /** Com uma prova feita: quanto precisa na outra para fechar a média. */
  | { tipo: 'precisa'; valor: number; naProva: NumeroProva }
  | { tipo: 'garantido'; naProva: NumeroProva }
  | { tipo: 'impossivel'; naProva: NumeroProva; maximo: number }
  /** As duas feitas. */
  | { tipo: 'fechado'; media: number; passou: boolean }

/**
 * Média do bimestre = (P1 + P2) / 2 + pontos extras (até a nota máxima). Com só uma prova feita,
 * diz quanto precisa tirar na outra.
 */
export function resumoBimestre(p1: number | null, p2: number | null, minima: number, extras = 0): ResumoBimestre {
  const maximo = minima > 10 ? 100 : 10
  if (p1 === null && p2 === null) return { tipo: 'vazio' }
  if (p1 !== null && p2 !== null) {
    const media = Math.min(maximo, (p1 + p2) / 2 + extras)
    return { tipo: 'fechado', media, passou: Math.round(media * 100) / 100 >= minima }
  }
  const feita = (p1 ?? p2) as number
  const naProva: NumeroProva = p1 === null ? 1 : 2
  // Arredonda para cima em centésimos, sem erro de ponto flutuante.
  const valor = Math.ceil(Math.round((2 * (minima - extras) - feita) * 1e6) / 1e4) / 100
  if (valor <= 0) return { tipo: 'garantido', naProva }
  if (valor > maximo) return { tipo: 'impossivel', naProva, maximo }
  return { tipo: 'precisa', valor, naProva }
}

/** Pontos extras que somam no bimestre. */
export function extrasDoBimestre(pontos: { pontos: number; bimestre: number }[], bimestre: Bimestre): number {
  return pontos.filter((p) => p.bimestre === bimestre).reduce((s, p) => s + p.pontos, 0)
}

/** Média da matéria: a média das provas P1 e P2 que já têm nota (null se nenhuma). */
export function mediaDasProvas(notas: Nota[]): number | null {
  const valores = BIMESTRES.flatMap((b) => [provaDoBimestre(notas, 1, b), provaDoBimestre(notas, 2, b)])
    .map((n) => n?.valor ?? null)
    .filter((v): v is number => v !== null)
  return valores.length ? valores.reduce((s, v) => s + v, 0) / valores.length : null
}
