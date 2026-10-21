// Leitura e escrita de .xlsx no próprio navegador, sem servidor. O .xlsx é um .zip com arquivos
// XML dentro; o zip fica com a biblioteca fflate e o XML é montado e lido aqui.

import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'

// ---------- Escrita ----------

export type Celula =
  | string
  | number
  | null
  | { data: string } // AAAA-MM-DD
  | { centavos: number }

export interface AbaXlsx {
  nome: string
  colunas: string[]
  linhas: Celula[][]
}

// Estilos (índices de cellXfs em styles.xml).
const ESTILO = { normal: 0, cabecalho: 1, data: 2, moeda: 3 }

const ESTILOS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/><numFmt numFmtId="165" formatCode="&quot;R$&quot; #,##0.00"/></numFmts>
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE9DDF7"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="4">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`

export function escaparXml(texto: string): string {
  return (
    texto
      // Caracteres de controle não são aceitos em XML.
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  )
}

export function letraColuna(indice: number): string {
  let n = indice + 1
  let letra = ''
  while (n > 0) {
    const resto = (n - 1) % 26
    letra = String.fromCharCode(65 + resto) + letra
    n = Math.floor((n - 1) / 26)
  }
  return letra
}

export function indiceColuna(letras: string): number {
  let n = 0
  for (const l of letras) n = n * 26 + (l.charCodeAt(0) - 64)
  return n - 1
}

/** Data no formato do Excel: dias desde 30/12/1899. */
export function serialDaData(iso: string): number {
  const [a, m, d] = iso.split('-').map(Number)
  return (Date.UTC(a, m - 1, d) - Date.UTC(1899, 11, 30)) / 86_400_000
}

export function dataDoSerial(serial: number): string {
  return new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 86_400_000).toISOString().slice(0, 10)
}

function texto(ref: string, valor: string, estilo = ESTILO.normal): string {
  return `<c r="${ref}" t="inlineStr"${estilo ? ` s="${estilo}"` : ''}><is><t xml:space="preserve">${escaparXml(valor)}</t></is></c>`
}

function numero(ref: string, valor: number, estilo = ESTILO.normal): string {
  return Number.isFinite(valor) ? `<c r="${ref}"${estilo ? ` s="${estilo}"` : ''}><v>${valor}</v></c>` : ''
}

function celulaXml(ref: string, c: Celula): string {
  if (c === null || c === '') return ''
  if (typeof c === 'string') return texto(ref, c)
  if (typeof c === 'number') return numero(ref, c)
  if ('data' in c) return numero(ref, serialDaData(c.data), ESTILO.data)
  // Centavos inteiros viram reais só na hora de escrever: 101905 → "1019.05".
  const sinal = c.centavos < 0 ? '-' : ''
  const abs = Math.abs(c.centavos)
  return `<c r="${ref}" s="${ESTILO.moeda}"><v>${sinal}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}</v></c>`
}

function larguraDaCelula(c: Celula): number {
  if (c === null) return 0
  if (typeof c === 'string') return c.length
  if (typeof c === 'number') return String(c).length
  return 'data' in c ? 10 : 14
}

function abaXml(aba: AbaXlsx): string {
  const larguras = aba.colunas.map((titulo, i) =>
    Math.min(50, Math.max(8, titulo.length + 2, ...aba.linhas.map((l) => larguraDaCelula(l[i] ?? null) + 2))),
  )
  const cols = larguras.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')
  const cabecalho = `<row r="1">${aba.colunas.map((t, i) => texto(`${letraColuna(i)}1`, t, ESTILO.cabecalho)).join('')}</row>`
  const linhas = aba.linhas
    .map((linha, l) => `<row r="${l + 2}">${linha.map((c, i) => celulaXml(`${letraColuna(i)}${l + 2}`, c)).join('')}</row>`)
    .join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${cols}</cols><sheetData>${cabecalho}${linhas}</sheetData></worksheet>`
}

/** Monta o arquivo .xlsx com uma aba para cada item da lista. */
export function gerarXlsx(abas: AbaXlsx[]): Uint8Array {
  const nomes = abas.map((a) => escaparXml(a.nome.replace(/[[\]:*?/\\]/g, ' ').slice(0, 31)))
  const arquivos: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${abas
      .map(
        (_, i) =>
          `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
      )
      .join('')}</Types>`),
    '_rels/.rels': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    'xl/workbook.xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${nomes
      .map((n, i) => `<sheet name="${n}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
      .join('')}</sheets></workbook>`),
    'xl/_rels/workbook.xml.rels': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${abas
      .map(
        (_, i) =>
          `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
      )
      .join('')}<Relationship Id="rId${abas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
    'xl/styles.xml': strToU8(ESTILOS),
  }
  abas.forEach((aba, i) => (arquivos[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(abaXml(aba))))
  return zipSync(arquivos)
}

// ---------- Leitura ----------

export type ValorLido = string | number

export interface AbaLida {
  nome: string
  /** Valor de cada célula pela referência ("B5"). Células vazias não aparecem. */
  celulas: Map<string, ValorLido>
}

function desescapar(texto: string): string {
  return texto
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

function atributos(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  for (const m of tag.matchAll(/([\w:]+)\s*=\s*"([^"]*)"/g)) attrs[m[1]] = desescapar(m[2])
  return attrs
}

/** Junta o texto de todos os <t> (inclusive os de texto formatado, em <r>). */
function textoDosT(xml: string): string {
  return [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => desescapar(m[1])).join('')
}

function caminhoNoZip(alvo: string): string {
  if (alvo.startsWith('/')) return alvo.slice(1)
  return `xl/${alvo}`.replace(/\/\.\//g, '/')
}

/** Lê todas as abas de um .xlsx. */
export function lerXlsx(bytes: Uint8Array): AbaLida[] {
  let arquivos: Record<string, Uint8Array>
  try {
    arquivos = unzipSync(bytes)
  } catch {
    throw new Error('Não foi possível abrir o arquivo. Ele é mesmo um .xlsx?')
  }
  const ler = (caminho: string) => (arquivos[caminho] ? strFromU8(arquivos[caminho]) : null)

  const workbook = ler('xl/workbook.xml')
  if (!workbook) throw new Error('Arquivo .xlsx inválido (sem xl/workbook.xml).')

  const rels = new Map<string, string>()
  for (const m of (ler('xl/_rels/workbook.xml.rels') ?? '').matchAll(/<Relationship\b[^>]*>/g)) {
    const a = atributos(m[0])
    rels.set(a.Id, a.Target)
  }

  const compartilhados = [...(ler('xl/sharedStrings.xml') ?? '').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
    textoDosT(m[1]),
  )

  return [...workbook.matchAll(/<sheet\b[^>]*>/g)].map((m) => {
    const a = atributos(m[0])
    const alvo = rels.get(a['r:id'])
    const xml = alvo ? ler(caminhoNoZip(alvo)) : null
    return { nome: a.name ?? '', celulas: xml ? lerCelulas(xml, compartilhados) : new Map() }
  })
}

function lerCelulas(xml: string, compartilhados: string[]): Map<string, ValorLido> {
  const celulas = new Map<string, ValorLido>()
  for (const m of xml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const a = atributos(m[1])
    const conteudo = m[2] ?? ''
    if (!a.r) continue
    const v = /<v>([\s\S]*?)<\/v>/.exec(conteudo)?.[1]
    let valor: ValorLido | null = null
    if (a.t === 's') valor = v != null ? (compartilhados[Number(v)] ?? '') : null
    else if (a.t === 'inlineStr') valor = textoDosT(conteudo)
    else if (a.t === 'str' || a.t === 'e') valor = v != null ? desescapar(v) : null
    else if (a.t === 'b') valor = v === '1' ? 1 : 0
    else if (v != null && v !== '') valor = Number(v)
    if (valor !== null && valor !== '') celulas.set(a.r, valor)
  }
  return celulas
}
