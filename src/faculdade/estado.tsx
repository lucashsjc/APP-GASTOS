import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useEstado } from '../estado'
import { repoFaculdade } from './repo'
import type { DadosFaculdade } from './tipos'

interface EstadoFaculdade {
  dados: DadosFaculdade
  carregando: boolean
  erro: string | null
  /** Roda uma alteração e recarrega. Devolve false se deu erro (a mensagem aparece na tela). */
  executar: (acao: () => Promise<unknown>) => Promise<boolean>
}

const VAZIO: DadosFaculdade = { disciplinas: [], notas: [], faltas: [], atividades: [] }
const Contexto = createContext<EstadoFaculdade | null>(null)

/** Carrega os dados da Faculdade ao entrar na área (fica em volta das rotas /faculdade). */
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

  return <Contexto.Provider value={{ dados, carregando, erro, executar }}>{children}</Contexto.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFaculdade(): EstadoFaculdade {
  const estado = useContext(Contexto)
  if (!estado) throw new Error('useFaculdade fora do ProvedorFaculdade')
  return estado
}
