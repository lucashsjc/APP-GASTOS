// O que a tela "Hoje" mostra: funções puras, com testes em resumo.test.ts.

import type { Aba, Dados } from '../data/types'
import { certosDoMes } from '../lib/calculos'
import { FUSO, mesDe, somarMeses } from '../lib/datas'
import { notaNecessaria, mediaPonderada, ordenarAtividades, resumoFaltas, situacaoNota } from '../faculdade/regras'
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

export interface CertoProximo {
  chave: string
  aba: Aba
  descricao: string
  valor_centavos: number
  data: string
}

/** Certos (Nubank e Caju) que ainda vão cair de hoje até `dias` dias depois, por data. */
export function certosProximos(dados: Dados, hoje: string, dias = 7): CertoProximo[] {
  const ate = somarDias(hoje, dias)
  const meses = [mesDe(hoje)]
  if (mesDe(ate) !== mesDe(hoje)) meses.push(somarMeses(mesDe(hoje), 1))
  return (['nubank', 'caju'] as const)
    .flatMap((aba) => meses.flatMap((mes) => certosDoMes(dados, aba, mes, hoje)))
    .filter((c) => !c.caiu && c.data >= hoje && c.data <= ate)
    .map((c) => ({ chave: c.chave, aba: c.aba, descricao: c.descricao, valor_centavos: c.valor_centavos, data: c.data }))
    .sort((a, b) => a.data.localeCompare(b.data))
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

    const notas = d.notas.filter((n) => n.disciplina_id === disc.id)
    if (situacaoNota(mediaPonderada(notas), disc.media_minima) !== 'abaixo') continue
    const precisa = notaNecessaria(notas, disc.media_minima)
    alertas.push({
      tipo: 'nota',
      disciplina: disc,
      grave: precisa.tipo === 'impossivel',
      texto:
        precisa.tipo === 'precisa'
          ? `Abaixo da média: precisa de ${String(precisa.valor).replace('.', ',')}${
              precisa.nasFuturas.length === 1 ? ` na ${precisa.nasFuturas[0]}` : precisa.nasFuturas.length ? ' no que falta' : ' na próxima'
            }`
          : precisa.tipo === 'impossivel'
            ? 'Abaixo da média, sem como recuperar só com as notas que faltam'
            : 'Abaixo da média por enquanto',
    })
  }
  return alertas.sort((a, b) => Number(b.grave) - Number(a.grave))
}
