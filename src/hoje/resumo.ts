// O que a tela "Hoje" mostra: funções puras, com testes em resumo.test.ts.

import { FUSO } from '../lib/datas'
import {
  extrasDoBimestre,
  formatarNota,
  ordenarAtividades,
  provaDoSemestre,
  resumoFaltas,
  resumoSemestre,
} from '../faculdade/regras'
import type { Atividade, DadosFaculdade, Disciplina } from '../faculdade/tipos'

export function somarDias(data: string, dias: number): string {
  const [a, m, d] = data.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10)
}

/** Bom dia / Boa tarde / Boa noite, pela hora de São Paulo. */
export function saudacao(agora: Date = new Date()): string {
  const hora = Number(new Intl.DateTimeFormat('en-US', { timeZone: FUSO, hour: 'numeric', hourCycle: 'h23' }).format(agora))
  return hora < 5 ? 'Boa noite' : hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
}

/** "quinta-feira, 22 de outubro" */
export function dataPorExtenso(hoje: string): string {
  const [a, m, d] = hoje.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(
    new Date(Date.UTC(a, m - 1, d)),
  )
}

/** Atividades pendentes atrasadas ou com entrega até `dias` dias. */
export function atividadesUrgentes(atividades: Atividade[], hoje: string, dias = 7): Atividade[] {
  const ate = somarDias(hoje, dias)
  return ordenarAtividades(atividades).pendentes.filter((a) => a.entrega <= ate)
}

export type Alerta =
  | { tipo: 'faltas'; disciplina: Disciplina; texto: string; grave: boolean }
  | { tipo: 'nota'; disciplina: Disciplina; texto: string; grave: boolean }

/** Disciplinas que pedem atenção: faltas perto do limite e média abaixo da mínima. */
export function alertasFaculdade(d: DadosFaculdade): Alerta[] {
  const alertas: Alerta[] = []
  for (const disc of d.disciplinas) {
    const r = resumoFaltas(
      d.faltas.filter((f) => f.disciplina_id === disc.id),
      disc.limite_faltas,
    )
    if (r.nivel === 'estourou') {
      alertas.push({ tipo: 'faltas', disciplina: disc, grave: true, texto: `Passou do limite de faltas (${r.total}/${r.limite})` })
    } else if (r.nivel === 'atencao') {
      alertas.push({
        tipo: 'faltas',
        disciplina: disc,
        grave: false,
        texto: r.restantes === 0 ? 'Chegou no limite de faltas' : `Só pode faltar mais ${r.restantes} ${r.restantes === 1 ? 'aula' : 'aulas'}`,
      })
    }

    // P1 e P2 do semestre (com os pontos extras): avisa o que precisa tirar ou se não fechou a média.
    const notas = d.notas.filter((n) => n.disciplina_id === disc.id)
    const p1 = provaDoSemestre(notas, 1)?.valor ?? null
    const p2 = provaDoSemestre(notas, 2)?.valor ?? null
    const pontos = d.pontos_extras ?? []
    const nota = resumoSemestre(p1, p2, disc.media_minima, extrasDoBimestre(pontos, 1), extrasDoBimestre(pontos, 2))
    // Só avisa quando precisa de mais na outra prova do que tirou na que já fez (abaixo do ritmo).
    if (nota.tipo === 'precisa' && nota.valor > ((nota.naProva === 2 ? p1 : p2) ?? 0)) {
      alertas.push({ tipo: 'nota', disciplina: disc, grave: false, texto: `Precisa de ${formatarNota(nota.valor)} na P${nota.naProva}` })
    } else if (nota.tipo === 'impossivel') {
      alertas.push({ tipo: 'nota', disciplina: disc, grave: true, texto: `Nem com ${nota.maximo} na P${nota.naProva} chega na média` })
    } else if (nota.tipo === 'fechado' && !nota.passou) {
      alertas.push({ tipo: 'nota', disciplina: disc, grave: true, texto: `Fechou com ${formatarNota(nota.media)}, abaixo da média` })
    }
  }
  return alertas.sort((a, b) => Number(b.grave) - Number(a.grave))
}
