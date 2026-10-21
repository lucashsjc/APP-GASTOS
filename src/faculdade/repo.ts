// Dados da Faculdade: Supabase ou, sem ele, localStorage (modo demonstração), como na parte de gastos.

import { supabase, supabaseConfigurado } from '../data/supabaseRepo'
import { hojeSP } from '../lib/datas'
import { exemploFaculdade } from './exemplo'
import type {
  Atividade,
  DadosFaculdade,
  Disciplina,
  Falta,
  NovaAtividade,
  NovaDisciplina,
  NovaFalta,
  NovaNota,
  Nota,
} from './tipos'

type Tabela = 'disciplinas' | 'notas' | 'faltas' | 'atividades'
type Novo<T extends Tabela> = T extends 'disciplinas'
  ? NovaDisciplina
  : T extends 'notas'
    ? NovaNota
    : T extends 'faltas'
      ? NovaFalta
      : NovaAtividade

export interface RepoFaculdade {
  carregar(): Promise<DadosFaculdade>
  criar<T extends Tabela>(tabela: T, dados: Novo<T>): Promise<void>
  atualizar<T extends Tabela>(tabela: T, id: string, dados: Partial<Novo<T>>): Promise<void>
  excluir(tabela: Tabela, id: string): Promise<void>
}

const COLUNAS: Record<Tabela, string> = {
  disciplinas: 'id, nome, cor, media_minima, limite_faltas',
  notas: 'id, disciplina_id, descricao, valor, peso, data',
  faltas: 'id, disciplina_id, data, quantidade',
  atividades: 'id, disciplina_id, titulo, entrega, feita, observacao',
}

function erro(e: { code?: string; message: string } | null) {
  if (!e) return
  // Tabela que não existe: o SQL da Faculdade ainda não foi rodado.
  if (e.code === 'PGRST205' || e.code === '42P01') {
    throw new Error('As tabelas da Faculdade ainda não existem. Rode o supabase/003_faculdade.sql no Supabase.')
  }
  throw new Error(e.message)
}

function criarRepoSupabase(): RepoFaculdade {
  const db = supabase!
  const ler = async <T,>(tabela: Tabela) => {
    const { data, error } = await db.from(tabela).select(COLUNAS[tabela]).order('id')
    erro(error)
    return (data ?? []) as unknown as T[]
  }
  return {
    async carregar() {
      const [disciplinas, notas, faltas, atividades] = await Promise.all([
        ler<Disciplina>('disciplinas'),
        ler<Nota>('notas'),
        ler<Falta>('faltas'),
        ler<Atividade>('atividades'),
      ])
      // O Postgres devolve "numeric" como texto.
      return {
        disciplinas: disciplinas.map((d) => ({ ...d, media_minima: Number(d.media_minima) })),
        notas: notas.map((n) => ({ ...n, valor: Number(n.valor), peso: Number(n.peso) })),
        faltas,
        atividades,
      }
    },
    async criar(tabela, dados) {
      const { error } = await db.from(tabela).insert(dados as Record<string, unknown>)
      erro(error)
    },
    async atualizar(tabela, id, dados) {
      const { error } = await db.from(tabela).update(dados as Record<string, unknown>).eq('id', id)
      erro(error)
    },
    async excluir(tabela, id) {
      const { error } = await db.from(tabela).delete().eq('id', id)
      erro(error)
    },
  }
}

const CHAVE = 'faculdade-demo'

function lerLocal(): DadosFaculdade {
  try {
    const salvo = localStorage.getItem(CHAVE)
    if (salvo) return JSON.parse(salvo)
  } catch {
    // sem armazenamento: usa os dados de exemplo
  }
  const exemplo = exemploFaculdade(hojeSP())
  gravarLocal(exemplo)
  return exemplo
}

function gravarLocal(dados: DadosFaculdade) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(dados))
  } catch {
    // modo demonstração: ignorar falha de armazenamento
  }
}

function criarRepoLocal(): RepoFaculdade {
  const alterar = (fn: (d: DadosFaculdade) => void) => {
    const dados = lerLocal()
    fn(dados)
    gravarLocal(dados)
  }
  return {
    async carregar() {
      return lerLocal()
    },
    async criar(tabela, dados) {
      alterar((d) => (d[tabela] as unknown[]).push({ ...dados, id: crypto.randomUUID() }))
    },
    async atualizar(tabela, id, dados) {
      alterar((d) => {
        const lista = d[tabela] as { id: string }[]
        d[tabela] = lista.map((x) => (x.id === id ? { ...x, ...dados } : x)) as never
      })
    },
    async excluir(tabela, id) {
      alterar((d) => {
        d[tabela] = (d[tabela] as { id: string }[]).filter((x) => x.id !== id) as never
        // Como no banco: apagar a disciplina apaga as notas e faltas; atividades ficam sem disciplina.
        if (tabela === 'disciplinas') {
          d.notas = d.notas.filter((n) => n.disciplina_id !== id)
          d.faltas = d.faltas.filter((f) => f.disciplina_id !== id)
          d.atividades = d.atividades.map((a) => (a.disciplina_id === id ? { ...a, disciplina_id: null } : a))
        }
      })
    },
  }
}

export const repoFaculdade: RepoFaculdade = supabaseConfigurado ? criarRepoSupabase() : criarRepoLocal()
