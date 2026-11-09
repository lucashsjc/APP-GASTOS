// O que a tela "Hoje" mostra: funções puras, com testes em resumo.test.ts.

import { FUSO } from '../lib/datas'
import {
  BIMESTRES,
  extrasDoBimestre,
  formatarNota,
  ordenarAtividades,
  provaDoBimestre,
  resumoBimestre,
  resumoFaltas,
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

    // P1 e P2 de cada bimestre (com os pontos extras): avisa o que precisa tirar ou o que não fechou.
    const notas = d.notas.filter((n) => n.disciplina_id === disc.id)
    for (const bim of BIMESTRES) {
      const p1 = provaDoBimestre(notas, 1, bim)?.valor ?? null
      const p2 = provaDoBimestre(notas, 2, bim)?.valor ?? null
      const extras = extrasDoBimestre(d.pontos_extras ?? [], bim)
      const r = resumoBimestre(p1, p2, disc.media_minima, extras)
      const feita = (p1 ?? p2) ?? 0
      if (r.tipo === 'precisa' && r.valor > feita) {
        alertas.push({ tipo: 'nota', disciplina: disc, grave: false, texto: `Precisa de ${formatarNota(r.valor)} na P${r.naProva} do ${bim}º bimestre` })
      } else if (r.tipo === 'impossivel') {
        alertas.push({ tipo: 'nota', disciplina: disc, grave: true, texto: `${bim}º bimestre: nem com ${r.maximo} na P${r.naProva} chega na média` })
      } else if (r.tipo === 'fechado' && !r.passou) {
        alertas.push({ tipo: 'nota', disciplina: disc, grave: true, texto: `Fechou o ${bim}º bimestre com ${formatarNota(r.media)}, abaixo da média` })
      }
    }
  }
  return alertas.sort((a, b) => Number(b.grave) - Number(a.grave))
}
