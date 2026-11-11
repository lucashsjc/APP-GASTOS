import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { useEffect, useRef, useState } from 'react'
import { FolhaGasto, type ModoGasto } from '../componentes/FolhaGasto'
import { modoDemonstracao } from '../data/repo'
import { supabase } from '../data/supabaseRepo'
import type { Aba } from '../data/types'
import { useEstado } from '../estado'
import { contextoParaIA, limparGastosLidos, type GastoLido } from '../lib/assistente'
import { dataCurta } from '../lib/datas'
import { formatarReais } from '../lib/dinheiro'

interface Mensagem {
  papel: 'usuario' | 'assistente'
  texto: string
}

const SUGESTOES = [
  'Quanto gastei com iFood este mês?',
  'Posso comprar um tênis de R$ 300?',
  'Onde estou gastando mais?',
  'Quanto ainda tenho no Caju por dia?',
]

/** Chama a função "assistente" do Supabase com o login do app. */
async function chamar(corpo: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (!supabase) throw new Error('No modo demonstração o assistente não funciona: ele precisa da sua conta.')
  const { data, error } = await supabase.functions.invoke('assistente', { body: corpo })
  if (error) {
    // O erro da função vem no corpo da resposta ({ erro: "..." }).
    const resposta = (error as { context?: Response }).context
    let mensagem = ''
    try {
      mensagem = resposta ? String(((await resposta.json()) as { erro?: string }).erro ?? '') : ''
    } catch {
      // corpo sem JSON
    }
    if (!mensagem && resposta?.status === 404) mensagem = 'A função "assistente" ainda não foi publicada no Supabase.'
    throw new Error(mensagem || 'O assistente não respondeu. Confira a internet e tente de novo.')
  }
  return data as Record<string, unknown>
}

/** Diminui a foto (no máximo 1600 px) e devolve em JPEG base64, para mandar rápido. */
async function prepararImagem(arquivo: File): Promise<{ tipo: string; base64: string }> {
  const bitmap = await createImageBitmap(arquivo)
  const escala = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
  const tela = document.createElement('canvas')
  tela.width = Math.round(bitmap.width * escala)
  tela.height = Math.round(bitmap.height * escala)
  tela.getContext('2d')!.drawImage(bitmap, 0, 0, tela.width, tela.height)
  const url = tela.toDataURL('image/jpeg', 0.85)
  return { tipo: 'image/jpeg', base64: url.slice(url.indexOf(',') + 1) }
}

function Markdown({ texto }: { texto: string }) {
  const html = DOMPurify.sanitize(marked.parse(texto, { async: false, breaks: true }))
  return <div className="bolha-texto" dangerouslySetInnerHTML={{ __html: html }} />
}

export default function PaginaAssistente() {
  const { dados, hoje } = useEstado()
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [texto, setTexto] = useState('')
  const [pensando, setPensando] = useState<null | 'chat' | 'foto'>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [lidos, setLidos] = useState<(GastoLido & { aba: Aba; lancado: boolean })[] | null>(null)
  const [folha, setFolha] = useState<{ modo: ModoGasto; indice: number } | null>(null)
  const fim = useRef<HTMLDivElement>(null)
  const foto = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [mensagens, pensando, lidos])

  const perguntar = async (pergunta: string) => {
    const p = pergunta.trim()
    if (!p || pensando) return
    const nova = [...mensagens, { papel: 'usuario' as const, texto: p }]
    setMensagens(nova)
    setTexto('')
    setErro(null)
    setPensando('chat')
    try {
      const r = await chamar({ modo: 'chat', contexto: contextoParaIA(dados, hoje), mensagens: nova })
      setMensagens([...nova, { papel: 'assistente', texto: String(r.resposta ?? '') }])
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
      setMensagens(mensagens)
      setTexto(p)
    } finally {
      setPensando(null)
    }
  }

  const lerFoto = async (arquivo: File | undefined) => {
    if (!arquivo || pensando) return
    setErro(null)
    setLidos(null)
    setPensando('foto')
    try {
      const imagem = await prepararImagem(arquivo)
      const r = await chamar({ modo: 'foto', hoje, imagem })
      const gastos = limparGastosLidos(r.gastos)
      if (gastos.length === 0) setErro('Não achei nenhuma compra nessa imagem. Tente uma foto mais nítida.')
      setLidos(gastos.map((g) => ({ ...g, aba: g.aba || 'nubank', lancado: false })))
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setPensando(null)
      if (foto.current) foto.current.value = ''
    }
  }

  const lancar = (indice: number) => {
    const g = lidos![indice]
    setFolha({
      indice,
      modo: {
        aba: g.aba,
        origem: 'topo',
        sugestao: {
          valor_centavos: g.valor_centavos,
          parcelas: 1,
          descricao: g.descricao,
          data: g.data || undefined,
          hora: g.hora || undefined,
          carteira: g.aba === 'caju' && g.carteira ? g.carteira : null,
        },
      },
    })
  }

  return (
    <div className="pagina pagina-assistente">
      <header className="assistente-topo">
        <span className="assistente-selo" aria-hidden="true">
          ✦
        </span>
        <div>
          <h1>Assistente</h1>
          <p>Pergunte sobre seus gastos ou mande a foto de um comprovante.</p>
        </div>
      </header>

      {modoDemonstracao && <p className="nota">No modo demonstração o assistente não funciona: ele usa a sua conta.</p>}

      <div className="conversa">
        {mensagens.length === 0 && !lidos && (
          <div className="sugestoes">
            {SUGESTOES.map((s) => (
              <button key={s} type="button" className="sugestao" onClick={() => perguntar(s)} disabled={!!pensando}>
                {s}
              </button>
            ))}
          </div>
        )}
        {mensagens.map((m, i) => (
          <div key={i} className={`bolha bolha-${m.papel}`}>
            {m.papel === 'assistente' ? <Markdown texto={m.texto} /> : <div className="bolha-texto">{m.texto}</div>}
          </div>
        ))}
        {pensando && (
          <div className="bolha bolha-assistente pensando" aria-live="polite">
            <span />
            <span />
            <span />
            <small>{pensando === 'foto' ? 'Lendo a imagem…' : 'Pensando…'}</small>
          </div>
        )}
        {lidos && lidos.length > 0 && (
          <section className="card lidos">
            <h2>Achei {lidos.length === 1 ? '1 compra' : `${lidos.length} compras`}</h2>
            <ul>
              {lidos.map((g, i) => (
                <li key={i} className={g.lancado ? 'lancado' : undefined}>
                  <div className="lido-info">
                    <strong>{g.descricao}</strong>
                    <small>
                      {[g.data && dataCurta(g.data), g.hora, g.aba === 'caju' && g.carteira && (g.carteira === 'refeicao' ? 'Refeição' : 'Mobilidade')]
                        .filter(Boolean)
                        .join(' · ') || 'sem data'}
                    </small>
                  </div>
                  <span className="lido-valor">{formatarReais(g.valor_centavos)}</span>
                  <div className="lido-acoes">
                    <div className="segmentado pequeno" role="group" aria-label="Cartão">
                      {(['nubank', 'caju'] as Aba[]).map((a) => (
                        <button
                          key={a}
                          type="button"
                          className={g.aba === a ? 'ativo' : undefined}
                          disabled={g.lancado}
                          onClick={() => setLidos(lidos.map((x, j) => (j === i ? { ...x, aba: a } : x)))}
                        >
                          {a === 'nubank' ? 'Nubank' : 'Caju'}
                        </button>
                      ))}
                    </div>
                    <button type="button" className="botao-lancar" disabled={g.lancado} onClick={() => lancar(i)}>
                      {g.lancado ? 'Lançado ✓' : 'Lançar'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
        {erro && <p className="erro">{erro}</p>}
        <div ref={fim} />
      </div>

      <form
        className="caixa-pergunta"
        onSubmit={(e) => {
          e.preventDefault()
          perguntar(texto)
        }}
      >
        <button type="button" className="botao-foto" onClick={() => foto.current?.click()} disabled={!!pensando} aria-label="Ler foto de comprovante">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
        </button>
        <input ref={foto} type="file" accept="image/*" hidden onChange={(e) => lerFoto(e.target.files?.[0])} />
        <input
          className="campo-pergunta"
          placeholder="Pergunte algo…"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          enterKeyHint="send"
          aria-label="Pergunta"
        />
        <button type="submit" className="botao-enviar" disabled={!texto.trim() || !!pensando} aria-label="Enviar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </form>

      {folha && (
        <FolhaGasto
          modo={folha.modo}
          aoFechar={() => setFolha(null)}
          aoSalvar={() => setLidos((l) => l && l.map((x, j) => (j === folha.indice ? { ...x, lancado: true } : x)))}
        />
      )}
    </div>
  )
}
