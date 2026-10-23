// Dados de exemplo do modo demonstração. São FICTÍCIOS, mas montados para bater com os números de
// conferência da descrição (seção 7): no mês atual, 17 gastos do Nubank somam R$ 1.019,05; dois
// meses antes, R$ 679,58; no mês anterior, R$ 975,12 (com Uber 10 vezes, R$ 160,81); e o próximo
// mês já tem R$ 485,10 certos.

import { gerarParcelas } from '../lib/calculos'
import { completarGasto } from './completar'
import { dataNoMes, diaDe, mesDe, somarMeses } from '../lib/datas'
import type { Aba, Dados, Forma, Gasto } from './types'

type Linha = [dia: number, descricao: string, centavos: number, categoria: string, forma?: Forma]

const ANTERIOR_2: Linha[] = [
  [2, 'Mercado', 8945, 'Mercado'],
  [6, 'Uber', 1874, 'Transporte'],
  [9, 'iFood', 4290, 'Alimentação'],
  [13, 'Gasolina', 5000, 'Transporte', 'debito'],
  [17, 'Farmácia', 2389, 'Saúde'],
  [24, 'Cinema', 5388, 'Lazer'],
]

const ANTERIOR_1: Linha[] = [
  [1, 'Uber', 1532, 'Transporte'],
  [3, 'Uber', 1789, 'Transporte'],
  [4, 'Mercado', 12480, 'Mercado'],
  [6, 'Uber', 1405, 'Transporte'],
  [9, 'Uber', 1698, 'Transporte'],
  [11, 'Presente da Ana', 8990, 'Presentes'],
  [12, 'Uber', 1250, 'Transporte'],
  [15, 'Uber', 2104, 'Transporte'],
  [18, 'Uber', 1377, 'Transporte'],
  [19, 'Tênis', 13999, 'Compras'],
  [22, 'Uber', 1666, 'Transporte'],
  [25, 'Uber', 1843, 'Transporte'],
  [28, 'Uber', 1417, 'Transporte'],
  [29, 'Lanche', 5890, 'Alimentação', 'debito'],
]

const ATUAL: Linha[] = [
  [1, 'Mercado', 9874, 'Mercado'],
  [2, 'Uber', 1690, 'Transporte'],
  [4, 'iFood', 3850, 'Alimentação'],
  [5, 'Uber', 2215, 'Transporte'],
  [7, 'Gasolina', 6000, 'Transporte', 'debito'],
  [9, 'Remédio', 3412, 'Saúde'],
  [11, 'Uber', 1530, 'Transporte'],
  [12, 'Livro', 5490, 'Compras'],
  [14, 'Lanche', 2750, 'Alimentação', 'debito'],
  [16, 'Uber', 1988, 'Transporte'],
  [17, 'Mercado', 7316, 'Mercado'],
  [19, 'Show', 5800, 'Lazer'],
  [20, 'Uber', 1480, 'Transporte'],
]

const CAJU: Linha[][] = [
  [
    [4, 'Restaurante', 3290, 'Alimentação'],
    [8, 'Mercado', 11870, 'Mercado'],
    [15, 'Padaria', 1845, 'Alimentação'],
    [21, 'Restaurante', 4150, 'Alimentação'],
    [27, 'Mercado', 15422, 'Mercado'],
  ],
  [
    [3, 'Restaurante', 3680, 'Alimentação'],
    [10, 'Mercado', 18950, 'Mercado'],
    [16, 'Padaria', 2210, 'Alimentação'],
    [23, 'Restaurante', 4590, 'Alimentação'],
    [28, 'Mercado', 14320, 'Mercado'],
  ],
  [
    [3, 'Padaria', 1960, 'Alimentação'],
    [7, 'Mercado', 16745, 'Mercado'],
    [10, 'Restaurante', 3990, 'Alimentação'],
    [14, 'Mercado', 9830, 'Mercado'],
    [18, 'Restaurante', 4420, 'Alimentação'],
  ],
]

/** Monta os dados de exemplo em volta do mês de `hoje` (AAAA-MM-DD, em São Paulo). */
export function dadosDeExemplo(hoje: string): Dados {
  const atual = mesDe(hoje)
  const inicio = somarMeses(atual, -2)
  let n = 0
  const id = () => `ex-${++n}`
  // No mês atual, nada fica com data depois de hoje.
  const data = (mes: string, dia: number) => dataNoMes(mes, mes === atual ? Math.min(dia, diaDe(hoje)) : dia)

  const gasto = (aba: Aba, mes: string, [dia, descricao, centavos, categoria, forma]: Linha): Gasto => ({
    id: id(),
    aba,
    forma: aba === 'nubank' ? (forma ?? 'credito') : null,
    descricao,
    valor_centavos: centavos,
    data: data(mes, dia),
    categoria,
    tipo: 'unico',
    recorrencia_id: null,
    grupo_id: null,
    parcela_numero: null,
    parcela_total: null,
    caiu_manual: null,
    pago: false,
    observacao: '',
    separado: false,
    dinheiro_a_parte: false,
  })

  const gastos: Gasto[] = [
    ...ANTERIOR_2.map((l) => gasto('nubank', inicio, l)),
    ...ANTERIOR_1.map((l) => gasto('nubank', somarMeses(atual, -1), l)),
    ...ATUAL.map((l) => gasto('nubank', atual, l)),
    ...CAJU.flatMap((linhas, i) => linhas.map((l) => gasto('caju', somarMeses(inicio, i), l))),
    ...gerarParcelas(
      {
        aba: 'nubank',
        forma: 'credito',
        descricao: 'Tampa PS5',
        categoria: 'Lazer',
        total_centavos: 16876,
        data: dataNoMes(atual, 1),
        parcelas: 2,
      },
      'ex-grupo-ps5',
    ).map((p) => completarGasto(p, id())),
  ]

  const recorrencia = (aba: Aba, descricao: string, centavos: number, dia: number, categoria: string) => ({
    id: id(),
    aba,
    forma: aba === 'nubank' ? ('credito' as Forma) : null,
    descricao,
    valor_centavos: centavos,
    dia,
    categoria,
    inicio,
    fim: null,
    observacao: '',
    separado: false,
    dinheiro_a_parte: false,
  })

  return {
    gastos,
    recorrencias: [
      recorrencia('nubank', 'PORTO', 36792, 10, 'Fixos'),
      recorrencia('nubank', 'Spotify', 1290, 15, 'Fixos'),
      recorrencia('nubank', 'iCloud', 1990, 20, 'Fixos'),
      recorrencia('caju', 'Clube iFood', 595, 25, 'Alimentação'),
    ],
    recebidos: [-2, -1, 0, 1].map((i) => ({
      id: id(),
      aba: 'nubank' as const,
      mes: somarMeses(atual, i),
      valor_centavos: 180000,
    })),
    depositos: [0, 1, 2].map((i) => ({
      id: id(),
      aba: 'caju' as const,
      data: dataNoMes(somarMeses(inicio, i), i === 2 ? 1 : 5),
      valor_centavos: 45000,
    })),
  }
}
