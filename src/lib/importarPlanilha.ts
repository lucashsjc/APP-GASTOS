// Importação da planilha antiga (seção 9 da descrição).
//
// Layout da aba "SALÁRIO" (com ou sem espaço no fim do nome):
// - cada mês é um bloco: na linha do mês, B = nome do mês e C = valor recebido;
// - colunas D a Z: na linha do mês, a data; na de baixo, a descrição; na seguinte, o valor;
// - células com 0 são vazias; a coluna AA (rótulo "MÊS") e a meta em C2 são ignoradas.

import type { Dados, NovaRecorrencia, NovoGasto } from '../data/types'
import { normalizarDescricao, recorrenciaAtivaNoMes } from './calculos'
import { sugerirCategoria } from './categorias'
import { dataNoMes, diaDe, mesDe, numeroDoMes, semAcento, somarMeses } from './datas'
import { lerReais, reaisParaCentavos, somar } from './dinheiro'
import { dataDoSerial, letraColuna, lerXlsx, type ValorLido } from './xlsx'

export const ANO_DA_PLANILHA = 2026

const PRIMEIRA_COLUNA = 3 // D
const ULTIMA_COLUNA = 25 // Z

export interface GastoPlanilha {
  data: string
  descricao: string
  valor_centavos: number
}

export interface MesPlanilha {
  mes: string
  recebido_centavos: number
  gastos: GastoPlanilha[]
}

function ehZeroOuVazio(v: ValorLido | undefined): boolean {
  if (v === undefined) return true
  if (typeof v === 'number') return v === 0
  const t = v.trim()
  return t === '' || t === '0' || t === '-'
}

function valorEmCentavos(v: ValorLido | undefined): number | null {
  if (ehZeroOuVazio(v)) return null
  if (typeof v === 'number') return reaisParaCentavos(v)
  return lerReais(v!.trim())
}

/** Dia do mês da célula de data: número de série do Excel, "05/10", "05/10/2026" ou só "5". */
function diaDaCelula(v: ValorLido | undefined): number | null {
  if (ehZeroOuVazio(v)) return null
  if (typeof v === 'number') {
    if (v >= 1 && v <= 31 && Number.isInteger(v)) return v
    return diaDe(dataDoSerial(v))
  }
  const m = /^(\d{1,2})(?:[/.-]\d{1,2}(?:[/.-]\d{2,4})?)?$/.exec(v!.trim())
  return m ? Number(m[1]) : null
}

/** Lê o arquivo e devolve os blocos de cada mês. */
export function lerPlanilhaDeGastos(bytes: Uint8Array, ano = ANO_DA_PLANILHA): MesPlanilha[] {
  const abas = lerXlsx(bytes)
  const aba = abas.find((a) => semAcento(a.nome).trim().toUpperCase() === 'SALARIO')
  if (!aba) {
    throw new Error(`A planilha não tem a aba "SALÁRIO". Abas encontradas: ${abas.map((a) => a.nome.trim()).join(', ')}.`)
  }
  const celula = (col: number, linha: number) => aba.celulas.get(`${letraColuna(col)}${linha}`)

  const linhas = [...aba.celulas.keys()].map((ref) => Number(/\d+$/.exec(ref)![0]))
  const ultimaLinha = Math.max(0, ...linhas)
  const meses: MesPlanilha[] = []

  for (let linha = 1; linha <= ultimaLinha; linha++) {
    const nome = celula(1, linha)
    const numero = typeof nome === 'string' ? numeroDoMes(nome) : null
    if (!numero) continue
    const mes = `${ano}-${String(numero).padStart(2, '0')}`

    const gastos: GastoPlanilha[] = []
    for (let col = PRIMEIRA_COLUNA; col <= ULTIMA_COLUNA; col++) {
      const valor = valorEmCentavos(celula(col, linha + 2))
      const descricao = celula(col, linha + 1)
      if (valor === null || valor <= 0 || ehZeroOuVazio(descricao)) continue
      // O mês vem do bloco (como na planilha); da célula de data, só o dia.
      const dia = diaDaCelula(celula(col, linha)) ?? 1
      gastos.push({ data: dataNoMes(mes, dia), descricao: String(descricao).trim(), valor_centavos: valor })
    }
    meses.push({ mes, recebido_centavos: valorEmCentavos(celula(2, linha)) ?? 0, gastos })
  }

  if (!meses.length) throw new Error('Não encontrei nenhum mês (ABRIL…DEZEMBRO) na coluna B da aba SALÁRIO.')
  return meses.sort((a, b) => a.mes.localeCompare(b.mes))
}

// ---------- Plano de importação ----------

export type TipoSugestao = 'todo_mes' | 'parcela' | 'certo_unico'

export interface SugestaoCerto {
  chave: string
  tipo: TipoSugestao
  descricao: string
  valor_centavos: number
  categoria: string
  /** todo_mes: primeiro mês e dia. */
  inicio: string
  dia: number
  /** parcela: as parcelas que ainda vão cair (as anteriores já entraram como gastos). */
  parcelas: { data: string; numero: number }[]
  parcela_total: number
  /** certo_unico: a data. */
  data: string
}

export interface ResumoMesImportado {
  mes: string
  futuro: boolean
  recebido_centavos: number
  quantidade: number
  total_centavos: number
}

export interface PlanoImportacao {
  meses: ResumoMesImportado[]
  /** Gastos "uma vez" novos (meses até o atual), sem os que já existem. */
  gastos: NovoGasto[]
  /** Gastos ignorados por já existirem (mesma data, descrição, valor e aba). */
  duplicados: number
  /** Recebidos dos meses que ainda não têm um. */
  recebidos: { mes: string; valor_centavos: number }[]
  /** Certos encontrados nos meses futuros, para o Lucas confirmar. */
  sugestoes: SugestaoCerto[]
}

function chaveGasto(g: { aba: string; data: string; descricao: string; valor_centavos: number }): string {
  return `${g.aba}|${g.data}|${normalizarDescricao(g.descricao)}|${g.valor_centavos}`
}

export function planejarImportacao(meses: MesPlanilha[], dados: Dados, hoje: string): PlanoImportacao {
  const mesAtual = mesDe(hoje)
  const existentes = new Set(dados.gastos.map(chaveGasto))
  const gastos: NovoGasto[] = []
  let duplicados = 0

  for (const bloco of meses) {
    if (bloco.mes > mesAtual) continue
    for (const g of bloco.gastos) {
      const novo: NovoGasto = {
        aba: 'nubank',
        forma: 'credito',
        descricao: g.descricao,
        valor_centavos: g.valor_centavos,
        data: g.data,
        categoria: sugerirCategoria(g.descricao),
        tipo: 'unico',
        recorrencia_id: null,
        grupo_id: null,
        parcela_numero: null,
        parcela_total: null,
        caiu_manual: null,
      }
      const chave = chaveGasto(novo)
      if (existentes.has(chave)) {
        duplicados++
        continue
      }
      existentes.add(chave)
      gastos.push(novo)
    }
  }

  const recebidos = meses
    .filter((b) => b.mes <= mesAtual && b.recebido_centavos > 0 && !dados.recebidos.some((r) => r.mes === b.mes))
    .map((b) => ({ mes: b.mes, valor_centavos: b.recebido_centavos }))

  return {
    meses: meses.map((b) => ({
      mes: b.mes,
      futuro: b.mes > mesAtual,
      recebido_centavos: b.recebido_centavos,
      quantidade: b.gastos.length,
      total_centavos: somar(b.gastos.map((g) => g.valor_centavos)),
    })),
    gastos,
    duplicados,
    recebidos,
    sugestoes: sugerirCertos(meses, dados, mesAtual),
  }
}

/**
 * Os meses futuros não viram gastos soltos. Cada gasto deles é comparado com os meses vizinhos
 * (mesma descrição e valor):
 * - aparece em meses seguidos até o último mês da planilha → "todo mês";
 * - aparece em meses seguidos, mas para antes do fim → parcelas (ex.: Tampa PS5, 2x);
 * - aparece só naquele mês → certo só deste mês.
 */
function sugerirCertos(meses: MesPlanilha[], dados: Dados, mesAtual: string): SugestaoCerto[] {
  if (!meses.length) return []
  const ultimoMes = meses[meses.length - 1].mes
  const chave = (g: GastoPlanilha) => `${normalizarDescricao(g.descricao)}|${g.valor_centavos}`
  const presenca = new Map<string, Map<string, GastoPlanilha>>()
  for (const bloco of meses) {
    for (const g of bloco.gastos) {
      const porMes = presenca.get(chave(g)) ?? new Map<string, GastoPlanilha>()
      if (!porMes.has(bloco.mes)) porMes.set(bloco.mes, g)
      presenca.set(chave(g), porMes)
    }
  }

  const existentes = new Set(dados.gastos.map(chaveGasto))
  const usados = new Set<string>()
  const sugestoes: SugestaoCerto[] = []

  for (const bloco of meses) {
    if (bloco.mes <= mesAtual) continue
    for (const g of bloco.gastos) {
      const k = chave(g)
      if (usados.has(`${k}|${bloco.mes}`)) continue
      const porMes = presenca.get(k)!

      // Sequência de meses seguidos em que o gasto aparece, passando por este mês.
      let primeiro = bloco.mes
      while (porMes.has(somarMeses(primeiro, -1))) primeiro = somarMeses(primeiro, -1)
      let ultimo = bloco.mes
      while (porMes.has(somarMeses(ultimo, 1))) ultimo = somarMeses(ultimo, 1)
      const sequencia: string[] = []
      for (let m = primeiro; m <= ultimo; m = somarMeses(m, 1)) sequencia.push(m)
      const futuros = sequencia.filter((m) => m > mesAtual)
      futuros.forEach((m) => usados.add(`${k}|${m}`))

      const base = {
        chave: `${k}|${bloco.mes}`,
        descricao: g.descricao,
        valor_centavos: g.valor_centavos,
        categoria: sugerirCategoria(g.descricao),
        inicio: bloco.mes,
        dia: diaDe(g.data),
        parcelas: [] as { data: string; numero: number }[],
        parcela_total: 0,
        data: g.data,
      }

      if (sequencia.length >= 2 && ultimo === ultimoMes) {
        const jaExiste = dados.recorrencias.some(
          (r) =>
            r.aba === 'nubank' &&
            normalizarDescricao(r.descricao) === normalizarDescricao(g.descricao) &&
            r.valor_centavos === g.valor_centavos &&
            recorrenciaAtivaNoMes(r, bloco.mes),
        )
        if (!jaExiste) sugestoes.push({ ...base, tipo: 'todo_mes' })
      } else if (sequencia.length >= 2) {
        const parcelas = futuros
          .map((m) => ({ data: porMes.get(m)!.data, numero: sequencia.indexOf(m) + 1 }))
          .filter((p) => !existentes.has(chaveGasto({ ...g, aba: 'nubank', data: p.data })))
        if (parcelas.length) sugestoes.push({ ...base, tipo: 'parcela', parcelas, parcela_total: sequencia.length })
      } else if (!existentes.has(chaveGasto({ ...g, aba: 'nubank' }))) {
        sugestoes.push({ ...base, tipo: 'certo_unico' })
      }
    }
  }
  return sugestoes
}

/** O que gravar para uma sugestão confirmada. */
export function gravacaoDaSugestao(
  s: SugestaoCerto,
  grupoId: string,
): { recorrencia: NovaRecorrencia | null; gastos: NovoGasto[] } {
  const comum = {
    aba: 'nubank' as const,
    forma: 'credito' as const,
    descricao: s.descricao,
    categoria: s.categoria,
  }
  if (s.tipo === 'todo_mes') {
    return {
      recorrencia: { ...comum, valor_centavos: s.valor_centavos, dia: s.dia, inicio: s.inicio, fim: null },
      gastos: [],
    }
  }
  if (s.tipo === 'parcela') {
    // Só as parcelas que ainda vão cair; as anteriores já entraram como gastos da planilha.
    return {
      recorrencia: null,
      gastos: s.parcelas.map((p) => ({
        ...comum,
        valor_centavos: s.valor_centavos,
        data: p.data,
        tipo: 'parcela',
        recorrencia_id: null,
        grupo_id: grupoId,
        parcela_numero: p.numero,
        parcela_total: s.parcela_total,
        caiu_manual: null,
      })),
    }
  }
  return {
    recorrencia: null,
    gastos: [
      {
        ...comum,
        valor_centavos: s.valor_centavos,
        data: s.data,
        tipo: 'certo_unico',
        recorrencia_id: null,
        grupo_id: null,
        parcela_numero: null,
        parcela_total: null,
        caiu_manual: null,
      },
    ],
  }
}
