// Testes da importação com uma planilha SINTÉTICA, montada aqui mesmo no layout da planilha
// antiga. Nenhum arquivo real vai para o repositório (o .gitignore bloqueia *.xlsx).

import { strToU8, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { completarGasto, completarRecorrencia } from '../data/completar'
import type { Dados } from '../data/types'
import { certosDoMes } from './calculos'
import { gravacaoDaSugestao, lerPlanilhaDeGastos, planejarImportacao } from './importarPlanilha'
import { escaparXml, gerarXlsx, lerXlsx, serialDaData } from './xlsx'

const HOJE = '2026-10-21'

type Celulas = Record<string, string | number>

/** Monta um .xlsx parecido com o que o Excel grava: zip comprimido, textos em sharedStrings. */
function criarXlsx(abas: { nome: string; celulas: Celulas }[]): Uint8Array {
  const textos: string[] = []
  const indiceTexto = (t: string) => {
    const i = textos.indexOf(t)
    if (i >= 0) return i
    textos.push(t)
    return textos.length - 1
  }

  const planilhas = abas.map(({ celulas }) => {
    const porLinha = new Map<number, string[]>()
    for (const [ref, valor] of Object.entries(celulas)) {
      const linha = Number(/\d+$/.exec(ref)![0])
      const xml =
        typeof valor === 'number'
          ? `<c r="${ref}" s="1"><v>${valor}</v></c>`
          : `<c r="${ref}" t="s"><v>${indiceTexto(valor)}</v></c>`
      porLinha.set(linha, [...(porLinha.get(linha) ?? []), xml])
    }
    const linhas = [...porLinha.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([n, cs]) => `<row r="${n}" spans="1:27">${cs.join('')}</row>`)
      .join('')
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:AA30"/><sheetData>${linhas}</sheetData></worksheet>`
  })

  const arquivos: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>'),
    'xl/workbook.xml': strToU8(
      `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${abas
        .map((a, i) => `<sheet name="${escaparXml(a.nome)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
        .join('')}</sheets></workbook>`,
    ),
    'xl/_rels/workbook.xml.rels': strToU8(
      `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${abas
        .map((_, i) => `<Relationship Id="rId${i + 1}" Type="worksheet" Target="/xl/worksheets/sheet${i + 1}.xml"/>`)
        .join('')}</Relationships>`,
    ),
    'xl/sharedStrings.xml': strToU8(
      `<?xml version="1.0" encoding="UTF-8"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${textos.length}">${textos
        .map((t) => `<si><t>${escaparXml(t)}</t></si>`)
        .join('')}</sst>`,
    ),
  }
  planilhas.forEach((xml, i) => (arquivos[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(xml)))
  return zipSync(arquivos)
}

const COLUNAS = 'DEFGHIJKLMNOPQRSTUVWXYZ'.split('')

/** Um bloco de mês a partir da `linha`: B = mês, C = recebido, D–Z = data/descrição/valor, AA = "MÊS". */
function bloco(
  linha: number,
  mes: string,
  recebido: number,
  gastos: [data: string | number, descricao: string, valor: number | string][],
): Celulas {
  const c: Celulas = { [`B${linha}`]: mes, [`C${linha}`]: recebido, [`AA${linha}`]: 'MÊS' }
  COLUNAS.forEach((col, i) => {
    const g = gastos[i]
    // Colunas sem gasto ficam com 0, como na planilha.
    c[`${col}${linha}`] = g ? (typeof g[0] === 'string' && /^\d{4}-/.test(g[0]) ? serialDaData(g[0]) : g[0]) : 0
    c[`${col}${linha + 1}`] = g ? g[1] : 0
    c[`${col}${linha + 2}`] = g ? g[2] : 0
  })
  return c
}

function planilhaSintetica(nomeAba = 'SALÁRIO '): Uint8Array {
  return criarXlsx([
    { nome: 'Resumo', celulas: { A1: 'Outra aba, ignorada', B3: 'JANEIRO', C3: 999 } },
    {
      nome: nomeAba,
      celulas: {
        B1: 'CONTROLE',
        B2: 'META',
        C2: 500, // a meta é ignorada
        ...bloco(4, 'AGOSTO', 1800, [
          ['2026-08-06', 'Uber', 18.74],
          ['2026-08-10', 'PORTO', 367.92],
          ['2026-08-15', 'Spotify', 12.9],
          ['2026-08-20', 'Mercado', 89.45],
        ]),
        ...bloco(8, 'SETEMBRO', 1800.5, [
          ['2026-09-03', 'Uber', 15.32],
          ['2026-09-10', 'PORTO', 367.92],
          // Data como texto e valor como texto, para garantir que também são aceitos.
          ['12/09', 'Remédio', '23,89'],
          ['2026-09-15', 'Spotify', 12.9],
        ]),
        ...bloco(12, 'Outubro', 1800, [
          ['2026-10-02', 'Uber', 16.9],
          ['2026-10-08', 'Tampa PS5', 84.38],
          ['2026-10-10', 'PORTO', 367.92],
          ['2026-10-15', 'Spotify', 12.9],
          // Valor 0: coluna vazia.
          ['2026-10-16', 'Cancelado', 0],
        ]),
        ...bloco(16, 'NOVEMBRO', 0, [
          ['2026-11-08', 'Tampa PS5', 84.38],
          ['2026-11-10', 'PORTO', 367.92],
          ['2026-11-15', 'Spotify', 12.9],
          ['2026-11-20', 'Presente', 50],
        ]),
        ...bloco(20, 'DEZEMBRO', 0, [
          ['2026-12-10', 'PORTO', 367.92],
          ['2026-12-15', 'Spotify', 12.9],
        ]),
      },
    },
  ])
}

function vazio(): Dados {
  return { gastos: [], recorrencias: [], recebidos: [], depositos: [] }
}

describe('leitura da planilha', () => {
  it('lê os blocos de cada mês (B = mês, C = recebido, D–Z = data/descrição/valor)', () => {
    const meses = lerPlanilhaDeGastos(planilhaSintetica())
    expect(meses.map((m) => [m.mes, m.recebido_centavos, m.gastos.length])).toEqual([
      ['2026-08', 180000, 4],
      ['2026-09', 180050, 4],
      ['2026-10', 180000, 4],
      ['2026-11', 0, 4],
      ['2026-12', 0, 2],
    ])
    expect(meses[1].gastos).toContainEqual({ data: '2026-09-12', descricao: 'Remédio', valor_centavos: 2389 })
    expect(meses[0].gastos[1]).toEqual({ data: '2026-08-10', descricao: 'PORTO', valor_centavos: 36792 })
  })

  it('ignora células com 0, a coluna AA e a meta em C2', () => {
    const meses = lerPlanilhaDeGastos(planilhaSintetica())
    const descricoes = meses.flatMap((m) => m.gastos.map((g) => g.descricao))
    expect(descricoes).not.toContain('Cancelado')
    expect(descricoes).not.toContain('MÊS')
    expect(descricoes).not.toContain('0')
  })

  it('aceita a aba com ou sem o espaço no fim do nome', () => {
    expect(lerPlanilhaDeGastos(planilhaSintetica('SALÁRIO'))).toHaveLength(5)
    expect(lerPlanilhaDeGastos(planilhaSintetica('Salario  '))).toHaveLength(5)
  })

  it('avisa quando a aba SALÁRIO não existe', () => {
    const arquivo = criarXlsx([{ nome: 'Planilha1', celulas: { A1: 'x' } }])
    expect(() => lerPlanilhaDeGastos(arquivo)).toThrow(/SALÁRIO/)
  })

  it('avisa quando o arquivo não é um .xlsx', () => {
    expect(() => lerPlanilhaDeGastos(strToU8('não sou um zip'))).toThrow(/xlsx/)
  })
})

describe('plano de importação', () => {
  it('meses até o atual viram gastos "uma vez" no Nubank, no crédito, com categoria sugerida', () => {
    const plano = planejarImportacao(lerPlanilhaDeGastos(planilhaSintetica()), vazio(), HOJE)
    expect(plano.gastos).toHaveLength(12)
    expect(plano.gastos.every((g) => g.aba === 'nubank' && g.forma === 'credito' && g.tipo === 'unico')).toBe(true)
    const categoria = (d: string) => plano.gastos.find((g) => g.descricao === d)!.categoria
    expect(categoria('Uber')).toBe('Transporte')
    expect(categoria('PORTO')).toBe('Fixos')
    expect(categoria('Spotify')).toBe('Fixos')
    expect(categoria('Remédio')).toBe('Saúde')
    expect(categoria('Mercado')).toBe('Outros')
    expect(categoria('Tampa PS5')).toBe('Outros')
  })

  it('o valor da coluna C vira o recebido dos meses até o atual', () => {
    const plano = planejarImportacao(lerPlanilhaDeGastos(planilhaSintetica()), vazio(), HOJE)
    expect(plano.recebidos).toEqual([
      { mes: '2026-08', valor_centavos: 180000 },
      { mes: '2026-09', valor_centavos: 180050 },
      { mes: '2026-10', valor_centavos: 180000 },
    ])
    expect(plano.meses.map((m) => [m.mes, m.futuro, m.quantidade, m.total_centavos])).toEqual([
      ['2026-08', false, 4, 48901],
      ['2026-09', false, 4, 42003],
      ['2026-10', false, 4, 48210],
      ['2026-11', true, 4, 51520],
      ['2026-12', true, 2, 38082],
    ])
  })

  it('meses futuros viram sugestões: todo mês, parcela e certo só deste mês', () => {
    const plano = planejarImportacao(lerPlanilhaDeGastos(planilhaSintetica()), vazio(), HOJE)
    const resumo = plano.sugestoes.map((s) => ({
      tipo: s.tipo,
      descricao: s.descricao,
      valor: s.valor_centavos,
      inicio: s.inicio,
      dia: s.dia,
      parcelas: s.parcelas,
      total: s.parcela_total,
    }))
    expect(resumo).toEqual([
      {
        tipo: 'parcela',
        descricao: 'Tampa PS5',
        valor: 8438,
        inicio: '2026-11',
        dia: 8,
        parcelas: [{ data: '2026-11-08', numero: 2 }],
        total: 2,
      },
      { tipo: 'todo_mes', descricao: 'PORTO', valor: 36792, inicio: '2026-11', dia: 10, parcelas: [], total: 0 },
      { tipo: 'todo_mes', descricao: 'Spotify', valor: 1290, inicio: '2026-11', dia: 15, parcelas: [], total: 0 },
      { tipo: 'certo_unico', descricao: 'Presente', valor: 5000, inicio: '2026-11', dia: 20, parcelas: [], total: 0 },
    ])
  })

  it('confirmadas as sugestões, novembro tem os certos certos', () => {
    const dados = vazio()
    const plano = planejarImportacao(lerPlanilhaDeGastos(planilhaSintetica()), dados, HOJE)
    let n = 0
    for (const s of plano.sugestoes) {
      const { recorrencia, gastos } = gravacaoDaSugestao(s, 'grupo')
      if (recorrencia) dados.recorrencias.push(completarRecorrencia(recorrencia, `r${++n}`))
      for (const g of gastos) dados.gastos.push(completarGasto(g, `g${++n}`))
    }
    const novembro = certosDoMes(dados, 'nubank', '2026-11', HOJE)
    expect(novembro.map((c) => [c.descricao, c.valor_centavos, c.grupo])).toEqual([
      ['Tampa PS5', 8438, 'parcelas'],
      ['PORTO', 36792, 'todo_mes'],
      ['Spotify', 1290, 'todo_mes'],
      ['Presente', 5000, 'so_este_mes'],
    ])
    expect(certosDoMes(dados, 'nubank', '2026-12', HOJE).map((c) => c.descricao)).toEqual(['PORTO', 'Spotify'])
    // Nada dos meses importados como "uma vez" vira certo em outubro (não conta duas vezes).
    expect(certosDoMes(dados, 'nubank', '2026-10', HOJE)).toEqual([])
  })

  it('importar de novo não duplica', () => {
    const dados = vazio()
    const meses = lerPlanilhaDeGastos(planilhaSintetica())
    const primeira = planejarImportacao(meses, dados, HOJE)
    let n = 0
    dados.gastos.push(...primeira.gastos.map((g) => completarGasto(g, `g${++n}`)))
    dados.recebidos.push(...primeira.recebidos.map((r) => ({ id: `r${++n}`, aba: 'nubank' as const, ...r })))
    for (const s of primeira.sugestoes) {
      const { recorrencia, gastos } = gravacaoDaSugestao(s, 'grupo')
      if (recorrencia) dados.recorrencias.push(completarRecorrencia(recorrencia, `r${++n}`))
      dados.gastos.push(...gastos.map((g) => completarGasto(g, `g${++n}`)))
    }

    const segunda = planejarImportacao(meses, dados, HOJE)
    expect(segunda.gastos).toEqual([])
    expect(segunda.duplicados).toBe(12)
    expect(segunda.recebidos).toEqual([])
    expect(segunda.sugestoes).toEqual([])
  })
})

describe('exportação .xlsx', () => {
  it('gera um arquivo que pode ser lido de volta, com dinheiro em reais e datas do Excel', () => {
    const arquivo = gerarXlsx([
      {
        nome: 'Gastos',
        colunas: ['Data', 'Descrição', 'Valor'],
        linhas: [
          [{ data: '2026-10-08' }, 'Tampa PS5 & <cia>', { centavos: 8438 }],
          [{ data: '2026-10-10' }, 'PORTO', { centavos: 36792 }],
          [{ data: '2026-10-11' }, 'Estorno', { centavos: -5 }],
        ],
      },
      { nome: 'Recebidos', colunas: ['Mês', 'Valor'], linhas: [['2026-10', { centavos: 180000 }]] },
    ])
    const [gastos, recebidos] = lerXlsx(arquivo)
    expect(gastos.nome).toBe('Gastos')
    expect(gastos.celulas.get('B1')).toBe('Descrição')
    expect(gastos.celulas.get('A2')).toBe(serialDaData('2026-10-08'))
    expect(gastos.celulas.get('B2')).toBe('Tampa PS5 & <cia>')
    expect(gastos.celulas.get('C2')).toBe(84.38)
    expect(gastos.celulas.get('C3')).toBe(367.92)
    expect(gastos.celulas.get('C4')).toBe(-0.05)
    expect(recebidos.celulas.get('B2')).toBe(1800)
  })
})
