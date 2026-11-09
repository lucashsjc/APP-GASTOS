import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useEstado } from '../estado'
import { repoFaculdade } from './repo'
import { semestreAtual } from './regras'
import type { DadosFaculdade } from './tipos'

interface EstadoFaculdade {
  /** Só o semestre atual (as disciplinas encerradas e o que é delas ficam de fora). */
  dados: DadosFaculdade
  /** Tudo, com os semestres encerrados (para o histórico). */
  todos: DadosFaculdade
  carregando: boolean
  erro: string | null
  /** Roda uma alteração e recarrega. Devolve false se deu erro (a mensagem aparece na tela). */
  executar: (acao: () => Promise<unknown>) => Promise<boolean>
}

const VAZIO: DadosFaculdade = { disciplinas: [], notas: [], faltas: [], atividades: [], pontos_extras: [], aulas: [] }
const Contexto = createContext<EstadoFaculdade | null>(null)

/** Dados da Faculdade, usados na própria área e na tela Hoje. */
export function ProvedorFaculdade({ children }: { children: ReactNode }) {
  const { avisar } = useEstado()
  const [dados, setDados] = useState<DadosFaculdade>(VAZIO)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const recarregar = useCallback(async () => {
    try {
      setDados(await repoFaculdade.carregar())
      setErro(null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  const executar = useCallback(
    async (acao: () => Promise<unknown>) => {
      try {
        await acao()
        return true
      } catch (e) {
        avisar(`Não deu certo: ${e instanceof Error ? e.message : String(e)}`)
        return false
      } finally {
        await recarregar()
      }
    },
    [avisar, recarregar],
  )

  const atual = useMemo(() => semestreAtual(dados), [dados])

  return <Contexto.Provider value={{ dados: atual, todos: dados, carregando, erro, executar }}>{children}</Contexto.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFaculdade(): EstadoFaculdade {
  const estado = useContext(Contexto)
  if (!estado) throw new Error('useFaculdade fora do ProvedorFaculdade')
  return estado
}
