import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { repo } from './data/repo'
import type { Dados } from './data/types'
import { hojeSP, mesDe } from './lib/datas'

interface Estado {
  dados: Dados
  carregando: boolean
  erro: string | null
  /** Hoje em São Paulo (AAAA-MM-DD). */
  hoje: string
  /** Mês escolhido no seletor (AAAA-MM), o mesmo nas duas abas. */
  mes: string
  setMes: (mes: string) => void
  /** Roda uma alteração e recarrega os dados. Devolve false se deu erro (a mensagem aparece na tela). */
  executar: (acao: () => Promise<unknown>) => Promise<boolean>
  recarregar: () => Promise<void>
  aviso: string | null
  avisar: (texto: string) => void
}

const VAZIO: Dados = { gastos: [], recorrencias: [], recebidos: [], depositos: [] }

const Contexto = createContext<Estado | null>(null)

export function ProvedorDeDados({ children }: { children: ReactNode }) {
  const [dados, setDados] = useState<Dados>(VAZIO)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [hoje, setHoje] = useState(() => hojeSP())
  const [mes, setMes] = useState(() => mesDe(hojeSP()))
  const [aviso, setAviso] = useState<string | null>(null)
  const hojeRef = useRef(hoje)

  const recarregar = useCallback(async () => {
    try {
      setDados(await repo.carregar())
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

  // O app instalado fica aberto por dias: ao voltar para ele, confere se o dia mudou.
  useEffect(() => {
    const aoVoltar = () => {
      if (document.visibilityState !== 'visible') return
      const antes = hojeRef.current
      const agora = hojeSP()
      if (agora !== antes) {
        hojeRef.current = agora
        setHoje(agora)
        // Quem estava olhando o mês atual continua no mês atual.
        setMes((m) => (m === mesDe(antes) ? mesDe(agora) : m))
      }
      recarregar()
    }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => document.removeEventListener('visibilitychange', aoVoltar)
  }, [recarregar])

  const avisar = useCallback((texto: string) => {
    setAviso(texto)
    window.setTimeout(() => setAviso((atual) => (atual === texto ? null : atual)), 4000)
  }, [])

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

  return (
    <Contexto.Provider value={{ dados, carregando, erro, hoje, mes, setMes, executar, recarregar, aviso, avisar }}>
      {children}
    </Contexto.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useEstado(): Estado {
  const estado = useContext(Contexto)
  if (!estado) throw new Error('useEstado fora do ProvedorDeDados')
  return estado
}
