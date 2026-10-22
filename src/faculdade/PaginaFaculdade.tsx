import { useState } from 'react'
import { IconeCheck, IconeLivros, IconeMais } from '../componentes/icones'
import { ItemDeslizavel } from '../componentes/ItemDeslizavel'
import { BotaoMenu } from '../componentes/MenuLateral'
import { useEstado } from '../estado'
import { dataCurta } from '../lib/datas'
import { useFaculdade } from './estado'
import { FolhaAtividade, FolhaDisciplinas, FolhaFalta, FolhaNota } from './Folhas'
import { formatarNota, mediaPonderada, notaNecessaria, ordenarAtividades, prazoAtividade, resumoFaltas, situacaoNota } from './regras'
import { repoFaculdade } from './repo'
import type { Atividade, Disciplina, Falta, Nota } from './tipos'

export type Secao = 'notas' | 'faltas' | 'atividades'

const TITULOS: Record<Secao, string> = { notas: 'Notas', faltas: 'Faltas', atividades: 'Atividades' }

type FolhaAberta =
  | { tipo: 'disciplinas' }
  | { tipo: 'nota'; nota?: Nota; disciplina?: string }
  | { tipo: 'falta'; falta?: Falta; disciplina?: string }
  | { tipo: 'atividade'; atividade?: Atividade }

export default function PaginaFaculdade({ secao }: { secao: Secao }) {
  const { dados, carregando, erro } = useFaculdade()
  const [folha, setFolha] = useState<FolhaAberta | null>(null)
  const fechar = () => setFolha(null)

  const adicionar = () => {
    if (!dados.disciplinas.length && secao !== 'atividades') return setFolha({ tipo: 'disciplinas' })
    setFolha(secao === 'notas' ? { tipo: 'nota' } : secao === 'faltas' ? { tipo: 'falta' } : { tipo: 'atividade' })
  }

  return (
    <div className="pagina pagina-faculdade">
      <header className="topo">
        <div className="topo-linha">
          <div className="topo-com-menu">
            <BotaoMenu />
            <h1>Faculdade</h1>
          </div>
          <button
            type="button"
            className="botao-icone"
            aria-label="Disciplinas"
            title="Disciplinas"
            onClick={() => setFolha({ tipo: 'disciplinas' })}
          >
            <IconeLivros />
          </button>
        </div>
        <div className="topo-linha">
          <h2 className="subtitulo">{TITULOS[secao]}</h2>
          <button type="button" className="botao-mais botao-faculdade" onClick={adicionar} aria-label="Adicionar">
            <IconeMais tamanho={20} />
          </button>
        </div>
      </header>

      {erro ? (
        <section className="card aviso">
          <strong>Não foi possível abrir a Faculdade</strong>
          <p>{erro}</p>
        </section>
      ) : carregando ? (
        <p className="vazio">Carregando…</p>
      ) : !dados.disciplinas.length && secao !== 'atividades' ? (
        <section className="card em-breve">
          <strong>Comece pelas disciplinas</strong>
          <p>Cadastre as disciplinas do semestre, com a média para passar e o limite de faltas.</p>
          <button type="button" className="botao-principal botao-faculdade" onClick={() => setFolha({ tipo: 'disciplinas' })}>
            Cadastrar disciplinas
          </button>
        </section>
      ) : secao === 'notas' ? (
        <SecaoNotas abrir={setFolha} />
      ) : secao === 'faltas' ? (
        <SecaoFaltas abrir={setFolha} />
      ) : (
        <SecaoAtividades abrir={setFolha} />
      )}

      {folha?.tipo === 'disciplinas' && <FolhaDisciplinas aoFechar={fechar} />}
      {folha?.tipo === 'nota' && <FolhaNota nota={folha.nota} disciplinaInicial={folha.disciplina} aoFechar={fechar} />}
      {folha?.tipo === 'falta' && <FolhaFalta falta={folha.falta} disciplinaInicial={folha.disciplina} aoFechar={fechar} />}
      {folha?.tipo === 'atividade' && <FolhaAtividade atividade={folha.atividade} aoFechar={fechar} />}
    </div>
  )
}

function CabecalhoDisciplina({ d, children }: { d: Disciplina; children?: React.ReactNode }) {
  return (
    <div className="disciplina-topo">
      <i className="ponto ponto-grande" style={{ background: d.cor }} />
      <strong>{d.nome}</strong>
      {children}
    </div>
  )
}

// ---------- Notas ----------

function SecaoNotas({ abrir }: { abrir: (f: FolhaAberta) => void }) {
  const { dados, executar } = useFaculdade()
  return (
    <div className="lista-disciplinas">
      {dados.disciplinas.map((d) => {
        const notas = dados.notas
          .filter((n) => n.disciplina_id === d.id)
          // As que já saíram por data; as que ainda vão acontecer no fim.
          .sort((a, b) => Number(a.valor === null) - Number(b.valor === null) || (a.data ?? '').localeCompare(b.data ?? ''))
        const media = mediaPonderada(notas)
        const situacao = situacaoNota(media, d.media_minima)
        return (
          <section key={d.id} className="card card-disciplina">
            <CabecalhoDisciplina d={d}>
              <span className={`media media-${situacao}`}>
                <small>Média</small>
                {media === null ? '—' : formatarNota(media)}
              </span>
            </CabecalhoDisciplina>
            <p className="disciplina-legenda">
              {situacao === 'sem_notas'
                ? `Nenhuma nota ainda · média mínima ${formatarNota(d.media_minima)}`
                : situacao === 'acima'
                  ? `Acima da média mínima (${formatarNota(d.media_minima)})`
                  : `Abaixo da média mínima (${formatarNota(d.media_minima)})`}
            </p>
            <QuantoPreciso notas={notas} minima={d.media_minima} />
            {notas.length > 0 && (
              <ul className="lista lista-interna">
                {notas.map((n) => (
                  <li key={n.id}>
                    <ItemDeslizavel
                      pergunta={
                        n.valor === null
                          ? `Apagar a avaliação “${n.descricao}”?`
                          : `Apagar a nota “${n.descricao}” (${formatarNota(n.valor)})?`
                      }
                      aoEditar={() => abrir({ tipo: 'nota', nota: n })}
                      aoApagar={() => executar(() => repoFaculdade.excluir('notas', n.id))}
                      aoTocar={() => abrir({ tipo: 'nota', nota: n })}
                    >
                      <div className="linha-simples">
                        <span>
                          <strong>{n.descricao}</strong>
                          <small>
                            {n.data ? dataCurta(n.data) : 'sem data'}
                            {n.peso !== 1 && ` · peso ${formatarNota(n.peso)}`}
                          </small>
                        </span>
                        {n.valor === null ? (
                          <span className="prazo">ainda não saiu</span>
                        ) : (
                          <strong className={n.valor >= d.media_minima ? 'positivo' : 'negativo-texto'}>
                            {formatarNota(n.valor)}
                          </strong>
                        )}
                      </div>
                    </ItemDeslizavel>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" className="botao-secundario" onClick={() => abrir({ tipo: 'nota', disciplina: d.id })}>
              + Nota
            </button>
          </section>
        )
      })}
    </div>
  )
}

function QuantoPreciso({ notas, minima }: { notas: Nota[]; minima: number }) {
  const r = notaNecessaria(notas, minima)
  if (r.tipo === 'ok') return null
  const texto =
    r.tipo === 'garantido'
      ? 'A média mínima já está garantida, mesmo tirando zero no que falta.'
      : r.tipo === 'impossivel'
        ? `Nem com ${r.maximo} no que falta dá para chegar em ${formatarNota(minima)}.`
        : r.nasFuturas.length === 0
          ? `Na próxima avaliação (peso 1), precisa tirar ${formatarNota(r.valor)}.`
          : r.nasFuturas.length === 1
            ? `Precisa tirar ${formatarNota(r.valor)} na ${r.nasFuturas[0]}.`
            : `Precisa de média ${formatarNota(r.valor)} em ${r.nasFuturas.join(', ')}.`
  return (
    <p className={`quanto-preciso quanto-${r.tipo}`}>
      <strong>Quanto preciso tirar</strong>
      {texto}
    </p>
  )
}

// ---------- Faltas ----------

function SecaoFaltas({ abrir }: { abrir: (f: FolhaAberta) => void }) {
  const { dados, executar } = useFaculdade()
  const { hoje, avisar } = useEstado()

  const faltarHoje = async (d: Disciplina, ultima?: Falta) => {
    // Repete a quantidade da última falta (ex.: 2 aulas seguidas); sem histórico, 2.
    const quantidade = ultima?.quantidade ?? 2
    const ok = await executar(() => repoFaculdade.criar('faltas', { disciplina_id: d.id, data: hoje, quantidade }))
    if (ok) avisar(`Falta registrada em ${d.nome} (${quantidade} ${quantidade === 1 ? 'aula' : 'aulas'}).`)
  }

  return (
    <div className="lista-disciplinas">
      {dados.disciplinas.map((d) => {
        const faltas = dados.faltas.filter((f) => f.disciplina_id === d.id).sort((a, b) => b.data.localeCompare(a.data))
        const r = resumoFaltas(faltas, d.limite_faltas)
        return (
          <section key={d.id} className="card card-disciplina">
            <CabecalhoDisciplina d={d}>
              <span className={`media faltas-${r.nivel}`}>
                <small>Faltas</small>
                <span>
                  {r.total}
                  {r.limite !== null && <em>/{r.limite}</em>}
                </span>
              </span>
            </CabecalhoDisciplina>
            {r.limite !== null && (
              <div className="barra" aria-hidden="true">
                <span className={`barra-faltas-${r.nivel}`} style={{ width: `${r.proporcao * 100}%` }} />
              </div>
            )}
            <p className="disciplina-legenda">
              {r.nivel === 'sem_limite'
                ? 'Sem limite cadastrado (edite a disciplina para colocar).'
                : r.nivel === 'estourou'
                  ? `Passou do limite em ${r.total - r.limite!} ${r.total - r.limite! === 1 ? 'aula' : 'aulas'}.`
                  : r.restantes === 0
                    ? 'Chegou no limite: não pode faltar mais.'
                    : `Ainda pode faltar ${r.restantes} ${r.restantes === 1 ? 'aula' : 'aulas'}.`}
            </p>
            {faltas.length > 0 && (
              <ul className="lista lista-interna">
                {faltas.map((f) => (
                  <li key={f.id}>
                    <ItemDeslizavel
                      pergunta={`Apagar a falta de ${dataCurta(f.data)}?`}
                      aoEditar={() => abrir({ tipo: 'falta', falta: f })}
                      aoApagar={() => executar(() => repoFaculdade.excluir('faltas', f.id))}
                      aoTocar={() => abrir({ tipo: 'falta', falta: f })}
                    >
                      <div className="linha-simples">
                        <span>
                          <strong>{dataCurta(f.data, f.data.slice(0, 4) !== hoje.slice(0, 4))}</strong>
                        </span>
                        <span className="texto-secundario">
                          {f.quantidade} {f.quantidade === 1 ? 'aula' : 'aulas'}
                        </span>
                      </div>
                    </ItemDeslizavel>
                  </li>
                ))}
              </ul>
            )}
            <div className="botoes-disciplina">
              <button type="button" className="botao-secundario" onClick={() => faltarHoje(d, faltas[0])}>
                + Faltei hoje
              </button>
              <button type="button" className="botao-secundario" onClick={() => abrir({ tipo: 'falta', disciplina: d.id })}>
                Outro dia
              </button>
            </div>
          </section>
        )
      })}
    </div>
  )
}

// ---------- Atividades ----------

function SecaoAtividades({ abrir }: { abrir: (f: FolhaAberta) => void }) {
  const { dados, executar } = useFaculdade()
  const { hoje } = useEstado()
  const [verFeitas, setVerFeitas] = useState(false)
  const { pendentes, feitas } = ordenarAtividades(dados.atividades)

  const linha = (a: Atividade) => {
    const d = dados.disciplinas.find((x) => x.id === a.disciplina_id)
    const prazo = prazoAtividade(a, hoje)
    return (
      <li key={a.id}>
        <ItemDeslizavel
          pergunta={`Apagar “${a.titulo}”?`}
          aoEditar={() => abrir({ tipo: 'atividade', atividade: a })}
          aoApagar={() => executar(() => repoFaculdade.excluir('atividades', a.id))}
          aoTocar={() => abrir({ tipo: 'atividade', atividade: a })}
        >
          <div className={`linha-atividade${a.feita ? ' feita' : ''}`}>
            <button
              type="button"
              className="marcar"
              aria-label={a.feita ? 'Marcar como não entregue' : 'Marcar como entregue'}
              onClick={(e) => {
                e.stopPropagation()
                executar(() => repoFaculdade.atualizar('atividades', a.id, { feita: !a.feita }))
              }}
            >
              {a.feita && <IconeCheck tamanho={14} />}
            </button>
            <span className="linha-texto">
              <strong>{a.titulo}</strong>
              <small>
                {d && (
                  <>
                    <i className="ponto" style={{ background: d.cor }} /> {d.nome}
                  </>
                )}
                {a.observacao && `${d ? ' · ' : ''}${a.observacao}`}
              </small>
            </span>
            <span className={`prazo prazo-${prazo.nivel}`}>{prazo.texto}</span>
          </div>
        </ItemDeslizavel>
      </li>
    )
  }

  return (
    <>
      <section className="secao">
        <h2>
          Pendentes <span>{pendentes.length}</span>
        </h2>
        {pendentes.length ? (
          <ul className="lista">{pendentes.map(linha)}</ul>
        ) : (
          <p className="vazio">Nada pendente. Toque no + para anotar uma atividade.</p>
        )}
      </section>
      {feitas.length > 0 && (
        <section className="secao">
          <button type="button" className="secao-alternar" onClick={() => setVerFeitas((v) => !v)}>
            Entregues ({feitas.length}) {verFeitas ? '▴' : '▾'}
          </button>
          {verFeitas && <ul className="lista">{feitas.map(linha)}</ul>}
        </section>
      )}
      <p className="dica">Toque no círculo para marcar como entregue. Deslize para editar ou apagar.</p>
    </>
  )
}
