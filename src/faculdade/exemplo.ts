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
  // Dia da semana de hoje (1 = segunda ... 7 = domingo), para o exemplo ter aulas hoje.
  const [a, m, d] = hoje.split('-').map(Number)
  const semana = ((new Date(Date.UTC(a, m - 1, d)).getUTCDay() + 6) % 7) + 1
  return {
    disciplinas: [
      { id: 'd-calc', nome: 'Cálculo I', cor: '#cfe7f8', media_minima: 5, limite_faltas: 16, semestre: null },
      { id: 'd-prog', nome: 'Programação Web', cor: '#bfe6cf', media_minima: 5, limite_faltas: 16, semestre: null },
      { id: 'd-fis', nome: 'Física I', cor: '#f3d9a8', media_minima: 5, limite_faltas: 12, semestre: null },
      { id: 'd-alg', nome: 'Algoritmos', cor: '#dcd2f6', media_minima: 5, limite_faltas: 16, semestre: '2026/1' },
      { id: 'd-ga', nome: 'Geometria Analítica', cor: '#f1d0e6', media_minima: 5, limite_faltas: 16, semestre: '2026/1' },
    ],
    notas: [
      { id: 'h1', disciplina_id: 'd-alg', descricao: 'P1', valor: 8, peso: 1, data: '2026-04-10' },
      { id: 'h2', disciplina_id: 'd-alg', descricao: 'P2', valor: 7, peso: 1, data: '2026-06-10' },
      { id: 'h3', disciplina_id: 'd-ga', descricao: 'P1', valor: 4, peso: 1, data: '2026-04-12' },
      { id: 'h4', disciplina_id: 'd-ga', descricao: 'P2', valor: 6.5, peso: 1, data: '2026-06-12' },
      { id: 'n1', disciplina_id: 'd-calc', descricao: 'P1', valor: 5.5, peso: 1, data: dia(5) },
      { id: 'n7', disciplina_id: 'd-calc', descricao: 'P2', valor: null, peso: 1, data: somarDias(hoje, 15) },
      { id: 'n2', disciplina_id: 'd-calc', descricao: 'Lista 1', valor: 8, peso: 1, data: dia(20) },
      { id: 'n3', disciplina_id: 'd-prog', descricao: 'P1', valor: 9, peso: 1, data: dia(8) },
      { id: 'n8', disciplina_id: 'd-prog', descricao: 'P2', valor: 7, peso: 1, data: dia(27) },
      { id: 'n4', disciplina_id: 'd-prog', descricao: 'Projeto', valor: 8.5, peso: 1, data: dia(15) },
      { id: 'n5', disciplina_id: 'd-fis', descricao: 'P1', valor: 1.5, peso: 1, data: dia(24) },
      { id: 'n6', disciplina_id: 'd-fis', descricao: 'P2', valor: null, peso: 1, data: somarDias(hoje, 4) },
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
      { id: 'a5', disciplina_id: 'd-prog', titulo: 'Exercício de formulários', entrega: somarDias(hoje, -6), feita: true, observacao: '' },
    ],
    pontos_extras: [{ id: 'x1', nome: 'SEAU e ACI', pontos: 3, bimestre: 2 }],
    aulas: [
      { id: 'au1', disciplina_id: 'd-calc', dia_semana: semana, quantidade: 2, inicio: '19:00' },
      { id: 'au2', disciplina_id: 'd-fis', dia_semana: semana, quantidade: 2, inicio: '20:40' },
      { id: 'au3', disciplina_id: 'd-prog', dia_semana: (semana % 7) + 1, quantidade: 4, inicio: '19:00' },
    ],
  }
}
