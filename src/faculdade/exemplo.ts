// Dados de exemplo (fictícios) da área Faculdade, para o modo demonstração.

import { dataNoMes, diaDe, mesDe, somarMeses } from '../lib/datas'
import type { DadosFaculdade } from './tipos'

function somarDias(data: string, dias: number): string {
  const [a, m, d] = data.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10)
}

export function exemploFaculdade(hoje: string): DadosFaculdade {
  const mesPassado = somarMeses(mesDe(hoje), -1)
  const dia = (n: number) => dataNoMes(mesPassado, Math.min(n, 28))
  return {
    disciplinas: [
      { id: 'd-calc', nome: 'Cálculo I', cor: '#4ea8f5', media_minima: 6, limite_faltas: 16 },
      { id: 'd-prog', nome: 'Programação Web', cor: '#3ccf8e', media_minima: 6, limite_faltas: 16 },
      { id: 'd-fis', nome: 'Física I', cor: '#f5b942', media_minima: 6, limite_faltas: 12 },
    ],
    notas: [
      { id: 'n1', disciplina_id: 'd-calc', descricao: 'P1', valor: 5.5, peso: 1, data: dia(20) },
      { id: 'n2', disciplina_id: 'd-calc', descricao: 'Lista 1', valor: 8, peso: 1, data: dia(10) },
      { id: 'n3', disciplina_id: 'd-prog', descricao: 'P1', valor: 9, peso: 2, data: dia(22) },
      { id: 'n4', disciplina_id: 'd-prog', descricao: 'Projeto', valor: 8.5, peso: 1, data: dia(15) },
      { id: 'n5', disciplina_id: 'd-fis', descricao: 'P1', valor: 4.5, peso: 1, data: dia(24) },
      { id: 'n6', disciplina_id: 'd-fis', descricao: 'P2', valor: null, peso: 2, data: null },
    ],
    faltas: [
      { id: 'f1', disciplina_id: 'd-calc', data: dia(3), quantidade: 2 },
      { id: 'f2', disciplina_id: 'd-calc', data: dia(17), quantidade: 2 },
      { id: 'f3', disciplina_id: 'd-fis', data: dia(8), quantidade: 2 },
      { id: 'f4', disciplina_id: 'd-fis', data: dia(15), quantidade: 2 },
      { id: 'f5', disciplina_id: 'd-fis', data: dataNoMes(mesDe(hoje), Math.max(1, diaDe(hoje) - 2)), quantidade: 2 },
      { id: 'f6', disciplina_id: 'd-fis', data: dataNoMes(mesDe(hoje), Math.max(1, diaDe(hoje) - 1)), quantidade: 3 },
    ],
    atividades: [
      { id: 'a1', disciplina_id: 'd-fis', titulo: 'Relatório do laboratório', entrega: somarDias(hoje, -1), feita: false, observacao: '' },
      { id: 'a2', disciplina_id: 'd-calc', titulo: 'Lista 3 de derivadas', entrega: hoje, feita: false, observacao: 'Exercícios 1 a 15' },
      { id: 'a3', disciplina_id: 'd-prog', titulo: 'Entrega do projeto (parte 2)', entrega: somarDias(hoje, 5), feita: false, observacao: '' },
      { id: 'a4', disciplina_id: 'd-calc', titulo: 'P2', entrega: somarDias(hoje, 15), feita: false, observacao: 'Capítulos 3 e 4' },
      { id: 'a5', disciplina_id: 'd-prog', titulo: 'Exercício de formulários', entrega: somarDias(hoje, -6), feita: true, observacao: '' },
    ],
  }
}
