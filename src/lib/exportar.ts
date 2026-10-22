// Cópia de segurança: todos os dados num .xlsx, uma aba para cada tabela.

import type { Dados } from '../data/types'
import type { AbaXlsx } from './xlsx'

const ABA = { nubank: 'Nubank', caju: 'Caju' }
const FORMA = { credito: 'Crédito', debito: 'Débito' }
const TIPO = { unico: 'Uma vez', certo_unico: 'Certo do mês', parcela: 'Parcela' }

export function montarExportacao(dados: Dados): AbaXlsx[] {
  return [
    {
      nome: 'Gastos',
      colunas: ['Data', 'Cartão', 'Descrição', 'Valor', 'Categoria', 'Tipo', 'Forma', 'Parcela', 'Caiu (à mão)', 'Pago'],
      linhas: [...dados.gastos]
        .sort((a, b) => a.data.localeCompare(b.data))
        .map((g) => [
          { data: g.data },
          ABA[g.aba],
          g.descricao,
          { centavos: g.valor_centavos },
          g.categoria,
          TIPO[g.tipo],
          g.forma ? FORMA[g.forma] : '',
          g.parcela_numero ? `${g.parcela_numero} de ${g.parcela_total}` : '',
          g.caiu_manual ? 'Sim' : '',
          g.pago ? 'Pago' : 'Não pago',
        ]),
    },
    {
      nome: 'Todo mês',
      colunas: ['Cartão', 'Descrição', 'Valor', 'Dia', 'Categoria', 'Forma', 'Início', 'Fim'],
      linhas: dados.recorrencias.map((r) => [
        ABA[r.aba],
        r.descricao,
        { centavos: r.valor_centavos },
        r.dia,
        r.categoria,
        r.forma ? FORMA[r.forma] : '',
        r.inicio,
        r.fim ?? '',
      ]),
    },
    {
      nome: 'Recebidos (Nubank)',
      colunas: ['Mês', 'Valor'],
      linhas: [...dados.recebidos]
        .sort((a, b) => a.mes.localeCompare(b.mes))
        .map((r) => [r.mes, { centavos: r.valor_centavos }]),
    },
    {
      nome: 'Depósitos (Caju)',
      colunas: ['Data', 'Valor'],
      linhas: [...dados.depositos]
        .sort((a, b) => a.data.localeCompare(b.data))
        .map((d) => [{ data: d.data }, { centavos: d.valor_centavos }]),
    },
  ]
}
