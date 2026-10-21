import { describe, expect, it } from 'vitest'
import { dadosDeExemplo } from '../data/exemplo'
import type { Dados, Gasto, Recorrencia } from '../data/types'
import { gastosDoMes, maisFrequente } from './analise'
import {
  cardCaju,
  certosDoMes,
  datasDasParcelas,
  dividirParcelas,
  gerarParcelas,
  jaCaiu,
  outrosDoMes,
  planejarEdicaoRecorrencia,
  planejarEncerramento,
  porDiaCaju,
  resumirCertos,
  resumoNubank,
  saldoCajuEm,
} from './calculos'
import { diasRestantesNoMes, hojeSP } from './datas'
import { formatarReais, lerReais, partesDoValor, reaisParaCentavos, somar } from './dinheiro'

const HOJE = '2026-10-21'

function vazio(): Dados {
  return { gastos: [], recorrencias: [], recebidos: [], depositos: [] }
}

let seq = 0
function gasto(dados: Partial<Gasto>): Gasto {
  return {
    id: `g${++seq}`,
    aba: 'nubank',
    forma: 'credito',
    descricao: 'Teste',
    valor_centavos: 1000,
    data: HOJE,
    categoria: 'Outros',
    tipo: 'unico',
    recorrencia_id: null,
    grupo_id: null,
    parcela_numero: null,
    parcela_total: null,
    caiu_manual: null,
    ...dados,
  }
}

function recorrencia(dados: Partial<Recorrencia>): Recorrencia {
  return {
    id: `r${++seq}`,
    aba: 'nubank',
    forma: 'credito',
    descricao: 'Spotify',
    valor_centavos: 1290,
    dia: 15,
    categoria: 'Fixos',
    inicio: '2026-08',
    fim: null,
    ...dados,
  }
}

function totalDoMes(dados: Dados, mes: string) {
  const certos = certosDoMes(dados, 'nubank', mes, HOJE)
  const outros = outrosDoMes(dados, 'nubank', mes)
  return { quantidade: certos.length + outros.length, total: somar([...certos, ...outros].map((g) => g.valor_centavos)) }
}

describe('conferência com a planilha (dados de exemplo, outubro/2026)', () => {
  const dados = dadosDeExemplo(HOJE)

  it('outubro: 17 gastos somam R$ 1.019,05', () => {
    expect(totalDoMes(dados, '2026-10')).toEqual({ quantidade: 17, total: 101905 })
    expect(formatarReais(101905)).toBe('R$ 1.019,05')
  })

  it('agosto soma R$ 679,58 e setembro R$ 975,12', () => {
    expect(totalDoMes(dados, '2026-08').total).toBe(67958)
    expect(totalDoMes(dados, '2026-09').total).toBe(97512)
  })

  it('em setembro, Uber aparece 10 vezes, somando R$ 160,81', () => {
    expect(maisFrequente(gastosDoMes(dados, 'nubank', '2026-09', HOJE))).toEqual({
      descricao: 'Uber',
      vezes: 10,
      total: 16081,
    })
  })

  it('novembro já tem R$ 485,10 certos (PORTO + Tampa PS5 2/2 + Spotify + iCloud)', () => {
    const certos = certosDoMes(dados, 'nubank', '2026-11', HOJE)
    expect(resumirCertos(certos).total).toBe(48510)
    expect(certos.map((c) => [c.descricao, c.valor_centavos]).sort()).toEqual(
      [
        ['PORTO', 36792],
        ['Tampa PS5', 8438],
        ['Spotify', 1290],
        ['iCloud', 1990],
      ].sort(),
    )
    const tampa = certos.find((c) => c.descricao === 'Tampa PS5')!
    expect([tampa.parcela_numero, tampa.parcela_total]).toEqual([2, 2])
    // Novembro ainda não começou: nada caiu.
    expect(resumirCertos(certos).jaCaiu).toBe(0)
    // E nada de parcelas ou "todo mês" nos outros gastos.
    expect(outrosDoMes(dados, 'nubank', '2026-11')).toEqual([])
  })

  it('um gasto do Caju nunca aparece no Nubank, e o contrário', () => {
    for (const mes of ['2026-08', '2026-09', '2026-10', '2026-11']) {
      expect(outrosDoMes(dados, 'nubank', mes).every((g) => g.aba === 'nubank')).toBe(true)
      expect(outrosDoMes(dados, 'caju', mes).every((g) => g.aba === 'caju')).toBe(true)
      expect(certosDoMes(dados, 'caju', mes, HOJE).every((g) => g.aba === 'caju')).toBe(true)
      expect(certosDoMes(dados, 'nubank', mes, HOJE).every((g) => g.aba === 'nubank')).toBe(true)
    }
  })
})

describe('livre do Nubank', () => {
  it('livre = recebido − certos do mês − outros gastos, com crédito e débito juntos', () => {
    const dados = vazio()
    dados.recebidos.push({ id: 'x', aba: 'nubank', mes: '2026-10', valor_centavos: 180000 })
    dados.recorrencias.push(recorrencia({ valor_centavos: 36792, dia: 10 }))
    dados.recorrencias.push(recorrencia({ valor_centavos: 1990, dia: 25 }))
    dados.gastos.push(gasto({ valor_centavos: 2000, data: '2026-10-05' }))
    dados.gastos.push(gasto({ valor_centavos: 3050, data: '2026-10-07', forma: 'debito' }))
    // Outro mês e outra aba não entram.
    dados.gastos.push(gasto({ valor_centavos: 99999, data: '2026-09-30' }))
    dados.gastos.push(gasto({ valor_centavos: 99999, data: '2026-10-08', aba: 'caju', forma: null }))

    const r = resumoNubank(dados, '2026-10', HOJE)
    expect(r.certos).toEqual({ total: 38782, jaCaiu: 36792, vaiCair: 1990 })
    expect(r.outros).toBe(5050)
    expect(r.livre).toBe(180000 - 38782 - 5050)
    expect(r.debito).toBe(3050)
    expect(r.credito).toBe(38782 + 2000)
  })

  it('pode ficar negativo', () => {
    const dados = vazio()
    dados.recebidos.push({ id: 'x', aba: 'nubank', mes: '2026-10', valor_centavos: 1000 })
    dados.gastos.push(gasto({ valor_centavos: 1500, data: '2026-10-02' }))
    expect(resumoNubank(dados, '2026-10', HOJE).livre).toBe(-500)
  })

  it('sem recebido no mês, o livre é negativo pelo que já foi gasto', () => {
    const dados = vazio()
    dados.gastos.push(gasto({ valor_centavos: 700, data: '2026-10-02' }))
    expect(resumoNubank(dados, '2026-10', HOJE).livre).toBe(-700)
  })
})

describe('já caiu / vai cair', () => {
  it('cai na data ou antes; depois de hoje, vai cair', () => {
    expect(jaCaiu('2026-10-20', HOJE)).toBe(true)
    expect(jaCaiu('2026-10-21', HOJE)).toBe(true)
    expect(jaCaiu('2026-10-22', HOJE)).toBe(false)
  })

  it('marcado à mão como caído conta como já caiu', () => {
    expect(jaCaiu('2026-10-30', HOJE, true)).toBe(true)
    const dados = vazio()
    dados.gastos.push(gasto({ tipo: 'certo_unico', data: '2026-10-30', caiu_manual: true, valor_centavos: 500 }))
    dados.gastos.push(gasto({ tipo: 'certo_unico', data: '2026-10-29', valor_centavos: 300 }))
    expect(resumirCertos(certosDoMes(dados, 'nubank', '2026-10', HOJE))).toEqual({ total: 800, jaCaiu: 500, vaiCair: 300 })
  })

  it('ajuste à mão de um "todo mês" substitui a ocorrência daquele mês', () => {
    const dados = vazio()
    const r = recorrencia({ dia: 28 })
    dados.recorrencias.push(r)
    dados.gastos.push(
      gasto({ tipo: 'certo_unico', recorrencia_id: r.id, data: '2026-10-28', caiu_manual: true, valor_centavos: 1290 }),
    )
    const certos = certosDoMes(dados, 'nubank', '2026-10', HOJE)
    expect(certos).toHaveLength(1)
    expect(certos[0].caiu).toBe(true)
    expect(certos[0].grupo).toBe('todo_mes')
    // Nos outros meses, segue calculado normalmente.
    expect(certosDoMes(dados, 'nubank', '2026-11', HOJE)[0].caiu).toBe(false)
  })
})

describe('parcelas', () => {
  it('divide igualmente, com a sobra de centavos na 1ª parcela', () => {
    expect(dividirParcelas(16876, 2)).toEqual([8438, 8438])
    expect(dividirParcelas(10000, 3)).toEqual([3334, 3333, 3333])
    expect(dividirParcelas(100, 6)).toEqual([20, 16, 16, 16, 16, 16])
    expect(somar(dividirParcelas(12345, 7))).toBe(12345)
  })

  it('rejeita valores e quantidades inválidos', () => {
    expect(() => dividirParcelas(0, 2)).toThrow()
    expect(() => dividirParcelas(10.5, 2)).toThrow()
    expect(() => dividirParcelas(1000, 0)).toThrow()
  })

  it('cai no mesmo dia todo mês, ou no último dia em meses curtos', () => {
    expect(datasDasParcelas('2026-01-31', 4)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30'])
    expect(datasDasParcelas('2027-12-30', 3)).toEqual(['2027-12-30', '2028-01-30', '2028-02-29'])
    expect(datasDasParcelas('2026-10-08', 2)).toEqual(['2026-10-08', '2026-11-08'])
  })

  it('gera as parcelas ligadas pela mesma compra', () => {
    const parcelas = gerarParcelas(
      {
        aba: 'caju',
        forma: 'credito',
        descricao: 'Fone',
        categoria: 'Compras',
        total_centavos: 10001,
        data: '2026-10-31',
        parcelas: 2,
      },
      'grupo-1',
    )
    expect(parcelas.map((p) => [p.data, p.valor_centavos, p.parcela_numero, p.parcela_total])).toEqual([
      ['2026-10-31', 5001, 1, 2],
      ['2026-11-30', 5000, 2, 2],
    ])
    expect(parcelas.every((p) => p.grupo_id === 'grupo-1' && p.tipo === 'parcela')).toBe(true)
    // No Caju não existe crédito/débito.
    expect(parcelas.every((p) => p.forma === null)).toBe(true)
  })
})

describe('todo mês', () => {
  it('cai no mesmo dia a partir do mês de início, até ser encerrado', () => {
    const dados = vazio()
    dados.recorrencias.push(recorrencia({ dia: 31, inicio: '2026-09', fim: '2027-02' }))
    const datas = (mes: string) => certosDoMes(dados, 'nubank', mes, HOJE).map((c) => c.data)
    expect(datas('2026-08')).toEqual([])
    expect(datas('2026-09')).toEqual(['2026-09-30'])
    expect(datas('2026-10')).toEqual(['2026-10-31'])
    expect(datas('2027-02')).toEqual(['2027-02-28'])
    expect(datas('2027-03')).toEqual([])
  })

  it('editar o valor vale do mês atual em diante; os meses passados não mudam', () => {
    const dados = vazio()
    const r = recorrencia({ valor_centavos: 1290, inicio: '2026-06' })
    dados.recorrencias.push(r)

    const plano = planejarEdicaoRecorrencia(dados, r, { valor_centavos: 2190 }, '2026-10')
    expect(plano.atualizar).toEqual({ fim: '2026-09' })
    expect(plano.criar).toMatchObject({ valor_centavos: 2190, inicio: '2026-10', fim: null, descricao: 'Spotify' })

    // Aplica o plano e confere mês a mês.
    r.fim = plano.atualizar!.fim!
    dados.recorrencias.push({ id: 'nova', ...plano.criar! })
    const valor = (mes: string) => certosDoMes(dados, 'nubank', mes, HOJE).map((c) => c.valor_centavos)
    expect(valor('2026-06')).toEqual([1290])
    expect(valor('2026-09')).toEqual([1290])
    expect(valor('2026-10')).toEqual([2190])
    expect(valor('2027-01')).toEqual([2190])
  })

  it('se começou neste mês ou depois, a edição muda a própria recorrência', () => {
    const dados = vazio()
    const r = recorrencia({ inicio: '2026-10' })
    const plano = planejarEdicaoRecorrencia(dados, r, { valor_centavos: 990 }, '2026-10')
    expect(plano).toEqual({ atualizar: { valor_centavos: 990 }, criar: null, excluirAjustes: [], excluir: false })
  })

  it('a edição apaga os ajustes à mão que deixam de valer', () => {
    const dados = vazio()
    const r = recorrencia({ inicio: '2026-06' })
    dados.recorrencias.push(r)
    const antigo = gasto({ tipo: 'certo_unico', recorrencia_id: r.id, data: '2026-09-15' })
    const novo = gasto({ tipo: 'certo_unico', recorrencia_id: r.id, data: '2026-10-15' })
    dados.gastos.push(antigo, novo)
    expect(planejarEdicaoRecorrencia(dados, r, { valor_centavos: 1 }, '2026-10').excluirAjustes).toEqual([novo.id])
  })

  it('encerrar mantém os meses que já valeram', () => {
    const dados = vazio()
    const r = recorrencia({ inicio: '2026-06' })
    expect(planejarEncerramento(dados, r, '2026-10').atualizar).toEqual({ fim: '2026-10' })
    expect(planejarEncerramento(dados, r, '2026-05').excluir).toBe(true)
  })

  it('não edita um "todo mês" que já foi encerrado', () => {
    const r = recorrencia({ inicio: '2026-01', fim: '2026-05' })
    expect(() => planejarEdicaoRecorrencia(vazio(), r, { valor_centavos: 1 }, '2026-10')).toThrow()
  })
})

describe('saldo do Caju', () => {
  function caju(): Dados {
    const dados = vazio()
    dados.depositos.push({ id: 'd1', aba: 'caju', data: '2026-09-05', valor_centavos: 50000 })
    dados.depositos.push({ id: 'd2', aba: 'caju', data: '2026-10-03', valor_centavos: 50000 })
    dados.depositos.push({ id: 'd3', aba: 'caju', data: '2026-11-04', valor_centavos: 50000 })
    dados.gastos.push(gasto({ aba: 'caju', forma: null, data: '2026-09-10', valor_centavos: 30000 }))
    dados.gastos.push(gasto({ aba: 'caju', forma: null, data: '2026-10-10', valor_centavos: 25000 }))
    dados.gastos.push(gasto({ aba: 'caju', forma: null, data: '2026-10-25', valor_centavos: 9999 }))
    dados.recorrencias.push(recorrencia({ aba: 'caju', forma: null, valor_centavos: 1000, dia: 20, inicio: '2026-09' }))
    return dados
  }

  it('acumula entre os meses: depósitos até hoje − gastos já caídos até hoje', () => {
    // Setembro: 50000 − 30000 − 1000 = 19000. Outubro até dia 21: + 50000 − 25000 − 1000.
    expect(saldoCajuEm(caju(), HOJE, HOJE)).toBe(43000)
  })

  it('não conta depósitos nem gastos futuros', () => {
    const dados = caju()
    // O gasto do dia 25 e o depósito de novembro ainda não entram.
    expect(saldoCajuEm(dados, HOJE, HOJE)).toBe(43000)
  })

  it('gasto marcado à mão como caído já sai do saldo', () => {
    const dados = caju()
    dados.gastos.push(gasto({ aba: 'caju', forma: null, tipo: 'certo_unico', data: '2026-10-28', caiu_manual: true, valor_centavos: 3000 }))
    expect(saldoCajuEm(dados, HOJE, HOJE)).toBe(40000)
  })

  it('mês passado: saldo no fim daquele mês', () => {
    expect(cardCaju(caju(), '2026-09', HOJE)).toEqual({ modo: 'passado', saldo: 19000 })
  })

  it('mês futuro: saldo de hoje − certos do Caju previstos até aquele mês', () => {
    // Certos do Caju ainda por cair: todo mês de 10,00 em novembro e em dezembro.
    // (O gasto avulso do dia 25 não é certo, então não entra na previsão.)
    expect(cardCaju(caju(), '2026-11', HOJE)).toEqual({ modo: 'futuro', saldo: 42000 })
    expect(cardCaju(caju(), '2026-12', HOJE)).toEqual({ modo: 'futuro', saldo: 41000 })
  })

  it('mês atual: mostra quanto dá por dia', () => {
    expect(cardCaju(caju(), '2026-10', HOJE)).toEqual({ modo: 'atual', saldo: 43000, porDia: 3909, diasRestantes: 11 })
  })
})

describe('por dia do Caju', () => {
  it('conta hoje nos dias que faltam', () => {
    expect(diasRestantesNoMes('2026-10-21')).toBe(11)
    expect(diasRestantesNoMes('2026-10-31')).toBe(1)
    expect(diasRestantesNoMes('2026-02-01')).toBe(28)
    expect(diasRestantesNoMes('2028-02-01')).toBe(29)
  })

  it('saldo ÷ dias restantes, arredondado para baixo em centavos', () => {
    expect(porDiaCaju(11000, '2026-10-21')).toBe(1000)
    expect(porDiaCaju(10000, '2026-10-21')).toBe(909)
    expect(porDiaCaju(500, '2026-10-31')).toBe(500)
  })

  it('saldo zero ou negativo: saldo esgotado', () => {
    expect(porDiaCaju(0, HOJE)).toBeNull()
    expect(porDiaCaju(-100, HOJE)).toBeNull()
  })
})

describe('fuso de São Paulo', () => {
  it('"hoje" segue America/Sao_Paulo, não o UTC', () => {
    // 02:30 UTC de 22/10 ainda é 23:30 de 21/10 em São Paulo (UTC−3).
    expect(hojeSP(new Date('2026-10-22T02:30:00Z'))).toBe('2026-10-21')
    expect(hojeSP(new Date('2026-10-22T03:00:00Z'))).toBe('2026-10-22')
    // Virada do ano.
    expect(hojeSP(new Date('2027-01-01T01:00:00Z'))).toBe('2026-12-31')
  })

  it('um gasto feito às 23h30 de 31/10 em São Paulo fica em outubro', () => {
    const data = hojeSP(new Date('2026-11-01T02:30:00Z'))
    const dados = vazio()
    dados.gastos.push(gasto({ data, valor_centavos: 100 }))
    expect(outrosDoMes(dados, 'nubank', '2026-10')).toHaveLength(1)
    expect(outrosDoMes(dados, 'nubank', '2026-11')).toHaveLength(0)
  })
})

describe('dinheiro em centavos inteiros', () => {
  it('mostra no formato brasileiro', () => {
    expect(formatarReais(101905)).toBe('R$ 1.019,05')
    expect(formatarReais(5)).toBe('R$ 0,05')
    expect(formatarReais(123456789)).toBe('R$ 1.234.567,89')
    expect(formatarReais(-1230)).toBe('−R$ 12,30')
    expect(partesDoValor(48510)).toEqual({ sinal: '', inteiro: '485', centavos: '10' })
  })

  it('lê valores digitados sem ponto flutuante', () => {
    expect(lerReais('1.019,05')).toBe(101905)
    expect(lerReais('84,38')).toBe(8438)
    expect(lerReais('12')).toBe(1200)
    expect(lerReais('R$ 7,5')).toBe(750)
    expect(lerReais('0,10')).toBe(10)
    expect(lerReais('abc')).toBeNull()
    expect(lerReais('1,234')).toBeNull()
  })

  it('converte reais da planilha sem erro de arredondamento', () => {
    // 0,1 + 0,2 em ponto flutuante dá 0,30000000000000004.
    expect(reaisParaCentavos(0.1 + 0.2)).toBe(30)
    expect(reaisParaCentavos(367.92)).toBe(36792)
    expect(reaisParaCentavos(1.005)).toBe(101)
  })

  it('recusa valores não inteiros', () => {
    expect(() => formatarReais(10.5)).toThrow()
  })

  it('todos os valores dos dados de exemplo são inteiros', () => {
    const dados = dadosDeExemplo(HOJE)
    const valores = [...dados.gastos, ...dados.recorrencias, ...dados.recebidos, ...dados.depositos].map(
      (x) => x.valor_centavos,
    )
    expect(valores.every(Number.isInteger)).toBe(true)
  })
})
