// Tipos da área Faculdade. Notas são números de 0 a 10 (aceita até 100, para escalas diferentes);
// datas como texto AAAA-MM-DD, no fuso de São Paulo.

export interface Disciplina {
  id: string
  nome: string
  /** Cor da disciplina na tela (hex). */
  cor: string
  /** Média mínima para passar (ex.: 6). */
  media_minima: number
  /** Máximo de faltas permitidas (em aulas), ou null se não souber. */
  limite_faltas: number | null
}

export interface Nota {
  id: string
  disciplina_id: string
  /** Ex.: "P1", "Trabalho". */
  descricao: string
  valor: number
  peso: number
  data: string | null
}

export interface Falta {
  id: string
  disciplina_id: string
  data: string
  /** Quantas aulas foram perdidas nesse dia. */
  quantidade: number
}

export interface Atividade {
  id: string
  disciplina_id: string | null
  titulo: string
  /** Data de entrega. */
  entrega: string
  feita: boolean
  observacao: string
}

export type NovaDisciplina = Omit<Disciplina, 'id'>
export type NovaNota = Omit<Nota, 'id'>
export type NovaFalta = Omit<Falta, 'id'>
export type NovaAtividade = Omit<Atividade, 'id'>

export interface DadosFaculdade {
  disciplinas: Disciplina[]
  notas: Nota[]
  faltas: Falta[]
  atividades: Atividade[]
}
