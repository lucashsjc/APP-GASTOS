import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { IconeAnterior, IconeCalendario, IconeCheck, IconeFaltas, IconeLivros, IconeMais, IconeNotas, IconeProximo } from '../componentes/icones'
import { ItemDeslizavel } from '../componentes/ItemDeslizavel'
import { BotaoMenu } from '../componentes/MenuLateral'
import { useEstado } from '../estado'
import { dataCurta, diaDe, mesDe, somarMeses, tituloDoMes } from '../lib/datas'
import { useFaculdade } from './estado'
import { FolhaAtividade, FolhaDisciplinas, FolhaFalta, FolhaHorario, FolhaNota, FolhaPontoExtra } from './Folhas'
import {
  aulasDaDisciplinaNoDia,
  aulasDoDia,
  diaDaSemana,
  diasAte,
  NOMES_DIAS,
  eventosCalendario,
  extrasDoBimestre,
  formatarNota,
  lerNota,
  nomeDoSemestre,
  outrasNotas,
  provasProximas,
  prazoAtividade,
  provaDoSemestre,
  resumoSemestre,
  proximosEventos,
  resumoFaltas,
  semanasDoMes,
  type EventoCalendario,
  type NumeroProva,
} from './regras'
import { repoFaculdade } from './repo'
import type { Atividade, Disciplina, Falta, Nota, PontoExtra } from './tipos'

export type Secao = 'inicio' | 'notas' | 'faltas' | 'calendario'

const TITULOS: Record<Secao, string> = { inicio: 'Início', notas: 'Notas por matéria', faltas: 'Faltas', calendario: 'Calendário' }

type FolhaAberta =
  | { tipo: 'disciplinas' }
  | { tipo: 'nota'; nota?: Nota; disciplina?: string; data?: string; prova?: boolean }
  | { tipo: 'falta'; falta?: Falta; disciplina?: string }
  | { tipo: 'atividade'; atividade?: Atividade; data?: string }
  | { tipo: 'extra'; extra?: PontoExtra }
  | { tipo: 'horario' }

export default function PaginaFaculdade({ secao }: { secao: Secao }) {
  const { dados, carregando, erro } = useFaculdade()
  const { hoje } = useEstado()
  const [folha, setFolha] = useState<FolhaAberta | null>(null)
  const fechar = () => setFolha(null)
  // A matéria aberta em Notas e o dia escolhido no calendário ficam entre as trocas de aba.
  // A matéria pode vir do Início (?materia=id), ao tocar numa matéria da lista.
  const [busca] = useSearchParams()
  const [materia, setMateria] = useState<string | null>(busca.get('materia'))
  const materiaAberta = dados.disciplinas.find((d) => d.id === materia) ?? dados.disciplinas[0] ?? null
  const [dia, setDia] = useState(hoje)

  const adicionar = () => {
    if (!dados.disciplinas.length) return setFolha({ tipo: 'disciplinas' })
    if (secao === 'notas') return setFolha({ tipo: 'nota', disciplina: materiaAberta?.id })
    if (secao === 'faltas' || secao === 'inicio') return setFolha({ tipo: secao === 'inicio' ? 'nota' : 'falta' })
    setFolha({ tipo: 'nota', prova: true, data: dia })
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
        {secao !== 'inicio' && (
          <div className="topo-linha">
            <h2 className="subtitulo">{TITULOS[secao]}</h2>
            <button type="button" className="botao-mais botao-faculdade" onClick={adicionar} aria-label="Adicionar">
              <IconeMais tamanho={20} />
            </button>
          </div>
        )}
      </header>

      {erro ? (
        <section className="card aviso">
          <strong>Não foi possível abrir a Faculdade</strong>
          <p>{erro}</p>
        </section>
      ) : carregando ? (
        <p className="vazio">Carregando…</p>
      ) : !dados.disciplinas.length ? (
        <section className="card em-breve">
          <strong>Comece pelas disciplinas</strong>
          <p>Cadastre as disciplinas do semestre, com a média para passar e o limite de faltas.</p>
          <button type="button" className="botao-principal botao-faculdade" onClick={() => setFolha({ tipo: 'disciplinas' })}>
            Cadastrar disciplinas
          </button>
        </section>
      ) : secao === 'inicio' ? (
        <SecaoInicio abrir={setFolha} />
      ) : secao === 'notas' ? (
        materiaAberta && <SecaoNotas abrir={setFolha} aberta={materiaAberta} aoEscolher={setMateria} />
      ) : secao === 'faltas' ? (
        <SecaoFaltas abrir={setFolha} />
      ) : (
        <SecaoCalendario abrir={setFolha} dia={dia} aoEscolherDia={setDia} />
      )}

      {folha?.tipo === 'disciplinas' && <FolhaDisciplinas aoFechar={fechar} />}
      {folha?.tipo === 'nota' && (
        <FolhaNota nota={folha.nota} disciplinaInicial={folha.disciplina} dataInicial={folha.data} prova={folha.prova} aoFechar={fechar} />
      )}
      {folha?.tipo === 'falta' && <FolhaFalta falta={folha.falta} disciplinaInicial={folha.disciplina} aoFechar={fechar} />}
      {folha?.tipo === 'atividade' && <FolhaAtividade atividade={folha.atividade} dataInicial={folha.data} aoFechar={fechar} />}
      {folha?.tipo === 'extra' && <FolhaPontoExtra extra={folha.extra} aoFechar={fechar} />}
      {folha?.tipo === 'horario' && <FolhaHorario aoFechar={fechar} />}
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

// ---------- Início ----------

type SituacaoMateria = { texto: string; nivel: 'bom' | 'atencao' | 'ruim' | 'neutro' }

/** O que mais importa da matéria agora: as faltas estourando, a média ou quanto precisa na prova que falta. */
function situacaoDaMateria(d: Disciplina, notas: Nota[], faltas: Falta[], pontos: PontoExtra[]): SituacaoMateria {
  const f = resumoFaltas(faltas, d.limite_faltas)
  if (f.nivel === 'estourou') return { texto: 'Passou do limite de faltas', nivel: 'ruim' }
  const r = resumoDaMateria(notas, d, pontos)
  if (r.tipo === 'fechado') return r.passou ? { texto: `Média ${formatarNota(r.media)} · passou`, nivel: 'bom' } : { texto: `Média ${formatarNota(r.media)} · abaixo de ${formatarNota(d.media_minima)}`, nivel: 'ruim' }
  if (r.tipo === 'impossivel') return { texto: `Não dá mais para passar na P${r.naProva}`, nivel: 'ruim' }
  if (r.tipo === 'garantido') return { texto: `Já passou, mesmo com 0 na P${r.naProva}`, nivel: 'bom' }
  if (r.tipo === 'precisa') return { texto: `Precisa de ${formatarNota(r.valor)} na P${r.naProva}`, nivel: r.valor > 7 ? 'atencao' : 'neutro' }
  if (f.nivel === 'atencao') return { texto: `Só pode faltar mais ${f.restantes}`, nivel: 'atencao' }
  return { texto: 'Sem notas ainda', nivel: 'neutro' }
}

/** Início da Faculdade: o semestre, os atalhos, as aulas de hoje, o que vem por aí e as matérias. */
function SecaoInicio({ abrir }: { abrir: (f: FolhaAberta) => void }) {
  const { dados, executar } = useFaculdade()
  const { hoje, avisar } = useEstado()
  const navegar = useNavigate()
  const proxima = provasProximas(dados, hoje, 120)[0]
  const proximos = proximosEventos(eventosCalendario(dados), hoje).slice(0, 4)
  const hojeAulas = aulasDoDia(dados.aulas, hoje)
  const faltouHoje = (id: string) => dados.faltas.some((f) => f.disciplina_id === id && f.data === hoje)

  const faltarHoje = async (d: Disciplina) => {
    const quantidade = aulasDaDisciplinaNoDia(dados.aulas, d.id, hoje) || 2
    const ok = await executar(() => repoFaculdade.criar('faltas', { disciplina_id: d.id, data: hoje, quantidade }))
    if (ok) avisar(`Falta registrada em ${d.nome} (${quantidade} ${quantidade === 1 ? 'aula' : 'aulas'}).`)
  }

  return (
    <div className="tela-carteira faculdade-inicio">
      <div className="carteira-fundo" aria-hidden="true" />

      <div className="carteira-saldo">
        <small>Semestre {nomeDoSemestre(hoje)}</small>
        {proxima ? (
          <>
            <strong className="faculdade-destaque">{proxima.dias === 0 ? 'Prova hoje' : proxima.dias === 1 ? 'Prova amanhã' : `Prova em ${proxima.dias} dias`}</strong>
            <span className="faculdade-sub">
              {proxima.nota.descricao}
              {proxima.disciplina && ` · ${proxima.disciplina.nome}`}
              {proxima.precisa !== null && ` · precisa de ${formatarNota(proxima.precisa)}`}
            </span>
          </>
        ) : (
          <>
            <strong className="faculdade-destaque">{dados.disciplinas.length} matérias</strong>
            <span className="faculdade-sub">Nenhuma prova marcada por enquanto.</span>
          </>
        )}
      </div>

      <nav className="carteira-acoes" aria-label="Ações">
        <button type="button" className="carteira-acao principal" onClick={() => abrir({ tipo: 'nota' })}>
          <span>
            <IconeNotas tamanho={20} />
          </span>
          Nota
        </button>
        <button type="button" className="carteira-acao" onClick={() => abrir({ tipo: 'falta' })}>
          <span>
            <IconeFaltas tamanho={20} />
          </span>
          Falta
        </button>
        <button type="button" className="carteira-acao" onClick={() => abrir({ tipo: 'nota', prova: true, data: hoje })}>
          <span>
            <IconeCalendario tamanho={20} />
          </span>
          Prova
        </button>
        <button type="button" className="carteira-acao" onClick={() => abrir({ tipo: 'atividade', data: hoje })}>
          <span>
            <IconeMais tamanho={20} />
          </span>
          Entrega
        </button>
      </nav>

      <section className="card carteira-gastos">
        <div className="carteira-gastos-topo">
          <h2>Aulas de hoje</h2>
          <button type="button" className="botao-texto" onClick={() => abrir({ tipo: 'horario' })}>
            {dados.aulas.length ? 'Horário' : 'Montar horário'}
          </button>
        </div>
        {!dados.aulas.length ? (
          <p className="vazio">Monte o horário da semana para ver aqui as aulas do dia.</p>
        ) : !hojeAulas.length ? (
          <p className="vazio">Sem aulas hoje ({NOMES_DIAS[diaDaSemana(hoje) - 1].toLowerCase()}).</p>
        ) : (
          <ul>
            {hojeAulas.map((a) => {
              const d = dados.disciplinas.find((x) => x.id === a.disciplina_id)
              if (!d) return null
              return (
                <li key={a.id} className="carteira-gasto">
                  <i className="ponto ponto-grande" style={{ background: d.cor }} />
                  <span className="carteira-gasto-texto">
                    <strong>{d.nome}</strong>
                    <small>
                      {a.inicio ? `${a.inicio} · ` : ''}
                      {a.quantidade} {a.quantidade === 1 ? 'aula' : 'aulas'}
                    </small>
                  </span>
                  {faltouHoje(d.id) ? (
                    <span className="prazo prazo-atrasada">Faltou</span>
                  ) : (
                    <button type="button" className="botao-faltei" onClick={() => faltarHoje(d)}>
                      Faltei
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="card carteira-gastos">
        <div className="carteira-gastos-topo">
          <h2>Próximas provas e entregas</h2>
          <Link to="/faculdade/calendario">Ver tudo</Link>
        </div>
        {proximos.length ? (
          <ul className="lista">
            {proximos.map((e) => (
              <LinhaEvento key={chave(e)} e={e} abrir={abrir} />
            ))}
          </ul>
        ) : (
          <p className="vazio">Nada marcado. Use Prova ou Entrega lá em cima.</p>
        )}
      </section>

      <section className="card carteira-gastos">
        <div className="carteira-gastos-topo">
          <h2>Matérias</h2>
          <button type="button" className="botao-texto" onClick={() => abrir({ tipo: 'disciplinas' })}>
            Editar
          </button>
        </div>
        <ul>
          {dados.disciplinas.map((d) => {
            const notas = dados.notas.filter((n) => n.disciplina_id === d.id)
            const faltas = dados.faltas.filter((f) => f.disciplina_id === d.id)
            const f = resumoFaltas(faltas, d.limite_faltas)
            const s = situacaoDaMateria(d, notas, faltas, dados.pontos_extras)
            return (
              <li key={d.id}>
                <button type="button" className="carteira-gasto" onClick={() => navegar(`/faculdade/notas?materia=${d.id}`)}>
                  <i className="ponto ponto-grande" style={{ background: d.cor }} />
                  <span className="carteira-gasto-texto">
                    <strong>{d.nome}</strong>
                    <small className={`situacao-${s.nivel}`}>{s.texto}</small>
                  </span>
                  <span className="carteira-gasto-valor">
                    <strong className={f.nivel === 'estourou' ? 'negativo-texto' : f.nivel === 'atencao' ? 'atencao-texto' : undefined}>
                      {f.total}
                      {f.limite !== null && <small>/{f.limite}</small>}
                    </strong>
                    <small>faltas</small>
                  </span>
                  <IconeProximo tamanho={16} />
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <PontosExtras abrir={abrir} />
    </div>
  )
}

// ---------- Notas ----------

function SecaoNotas({
  abrir,
  aberta,
  aoEscolher,
}: {
  abrir: (f: FolhaAberta) => void
  aberta: Disciplina
  aoEscolher: (id: string) => void
}) {
  const { dados, executar } = useFaculdade()
  const notasDe = (id: string) => dados.notas.filter((n) => n.disciplina_id === id)
  const d = aberta
  const notas = notasDe(d.id)
  const outras = outrasNotas(notas).sort((a, b) => (a.data ?? '').localeCompare(b.data ?? ''))
  return (
    <>
      <div className="pilulas-materias" role="tablist" aria-label="Matérias">
        {dados.disciplinas.map((x) => {
          const atual = situacaoAtual(notasDe(x.id), x, dados.pontos_extras)
          return (
            <button
              key={x.id}
              type="button"
              role="tab"
              aria-selected={x.id === d.id}
              className={`chip${x.id === d.id ? ' ativo' : ''}`}
              onClick={() => aoEscolher(x.id)}
            >
              <i className="ponto" style={{ background: x.cor }} /> {x.nome}
              {atual && <b className={`media-chip media-${atual.passou ? 'acima' : 'abaixo'}`}>{formatarNota(atual.media)}</b>}
            </button>
          )
        })}
      </div>
      <section className="card card-disciplina">
        <CabecalhoDisciplina d={d}>
          <span className="media">
            <small>Média para passar</small>
            {formatarNota(d.media_minima)}
          </span>
        </CabecalhoDisciplina>
        <BlocoSemestre d={d} notas={notas} />
      </section>

      <section className="secao">
        <h2>
          Outras notas <span>trabalhos, listas…</span>
        </h2>
        {outras.length > 0 ? (
          <ul className="lista">
            {outras.map((n) => (
              <li key={n.id}>
                <ItemDeslizavel
                  pergunta={`Apagar “${n.descricao}”?`}
                  aoEditar={() => abrir({ tipo: 'nota', nota: n })}
                  aoApagar={() => executar(() => repoFaculdade.excluir('notas', n.id))}
                  aoTocar={() => abrir({ tipo: 'nota', nota: n })}
                >
                  <div className="linha-simples">
                    <span>
                      <strong>{n.descricao}</strong>
                      <small>{n.data ? dataCurta(n.data) : 'sem data'}</small>
                    </span>
                    {n.valor === null ? (
                      <span className="prazo">ainda não saiu</span>
                    ) : (
                      <strong>{formatarNota(n.valor)}</strong>
                    )}
                  </div>
                </ItemDeslizavel>
              </li>
            ))}
          </ul>
        ) : (
          <p className="vazio">Nenhuma. A P1 e a P2 ficam no card acima.</p>
        )}
        <button type="button" className="botao-secundario" onClick={() => abrir({ tipo: 'nota', disciplina: d.id })}>
          + Outra nota de {d.nome}
        </button>
      </section>
    </>
  )
}

function resumoDaMateria(notas: Nota[], d: Disciplina, pontos: PontoExtra[]) {
  return resumoSemestre(
    provaDoSemestre(notas, 1)?.valor ?? null,
    provaDoSemestre(notas, 2)?.valor ?? null,
    d.media_minima,
    extrasDoBimestre(pontos, 1),
    extrasDoBimestre(pontos, 2),
  )
}

/** A média do semestre, quando as duas provas já têm nota (para a pílula da matéria). */
function situacaoAtual(notas: Nota[], d: Disciplina, pontos: PontoExtra[]) {
  const r = resumoDaMateria(notas, d, pontos)
  return r.tipo === 'fechado' ? r : null
}

function BlocoSemestre({ d, notas }: { d: Disciplina; notas: Nota[] }) {
  const { dados } = useFaculdade()
  const p1 = provaDoSemestre(notas, 1)
  const p2 = provaDoSemestre(notas, 2)
  const r = resumoDaMateria(notas, d, dados.pontos_extras)
  // A P1 é a prova do 1º bimestre e a P2, a do 2º: cada uma recebe os pontos extras do seu bimestre.
  const extras = (n: NumeroProva) => extrasDoBimestre(dados.pontos_extras, n)
  const comExtras = r.tipo === 'precisa' && extras(r.naProva) > 0
  return (
    <div className="bimestre">
      <div className="bimestre-provas">
        <CampoProva d={d} numero={1} nota={p1} extras={extras(1)} />
        <CampoProva d={d} numero={2} nota={p2} extras={extras(2)} />
        <div className={`bimestre-media${r.tipo === 'fechado' ? (r.passou ? ' passou' : ' nao-passou') : ''}`}>
          <small>Média</small>
          <strong>{r.tipo === 'fechado' ? formatarNota(r.media) : '—'}</strong>
        </div>
      </div>
      <p className={`bimestre-resultado bimestre-${r.tipo}${r.tipo === 'fechado' ? (r.passou ? '-passou' : '-nao') : ''}`}>
        {r.tipo === 'vazio' ? (
          `Coloque a nota da P1 para ver quanto precisa na P2 (média ${formatarNota(d.media_minima)}).`
        ) : r.tipo === 'precisa' ? (
          <>
            Precisa tirar <b>{formatarNota(r.valor)}</b> na P{r.naProva} para passar
            {comExtras ? ` (já contando os +${formatarNota(extras(r.naProva))})` : ''}.
          </>
        ) : r.tipo === 'garantido' ? (
          `Já passou: mesmo tirando 0 na P${r.naProva}, fecha a média.`
        ) : r.tipo === 'impossivel' ? (
          `Nem com ${r.maximo} na P${r.naProva} chega na média ${formatarNota(d.media_minima)}.`
        ) : r.passou ? (
          `Passou com média ${formatarNota(r.media)}.`
        ) : (
          `Fechou com ${formatarNota(r.media)}, abaixo da média ${formatarNota(d.media_minima)}.`
        )}
      </p>
    </div>
  )
}

/** Campo da nota de uma prova: grava ao sair do campo (ou no Enter). Vazio apaga a nota. */
function CampoProva({ d, numero, nota, extras }: { d: Disciplina; numero: NumeroProva; nota?: Nota; extras: number }) {
  const { executar } = useFaculdade()
  const { avisar } = useEstado()
  const atual = nota?.valor != null ? formatarNota(nota.valor) : ''
  const [texto, setTexto] = useState(atual)
  const [antes, setAntes] = useState(atual)
  // Quando a nota muda por fora (outra tela, recarga), o campo acompanha.
  if (atual !== antes) {
    setAntes(atual)
    setTexto(atual)
  }

  const gravar = async () => {
    const limpo = texto.trim()
    if (limpo === atual) return
    if (limpo === '') {
      if (!nota) return
      // A prova marcada no calendário continua lá, só sem nota.
      await executar(() =>
        nota.data ? repoFaculdade.atualizar('notas', nota.id, { valor: null }) : repoFaculdade.excluir('notas', nota.id),
      )
      return
    }
    const valor = lerNota(limpo)
    if (valor === null || valor > (d.media_minima > 10 ? 100 : 10)) {
      avisar('Nota inválida (ex.: 7,5).')
      setTexto(atual)
      return
    }
    // Grava com o nome simples (P1 ou P2), corrigindo os nomes antigos com bimestre.
    const descricao = `P${numero}`
    await executar(() =>
      nota
        ? repoFaculdade.atualizar('notas', nota.id, { valor, descricao })
        : repoFaculdade.criar('notas', { disciplina_id: d.id, descricao, valor, peso: 1, data: null }),
    )
  }

  return (
    <label className="campo-prova">
      <span>
        P{numero} <em>{numero}º bim</em>
      </span>
      <input
        inputMode="decimal"
        placeholder="—"
        value={texto}
        onChange={(e) => setTexto(e.target.value.replace(/[^\d.,]/g, ''))}
        onBlur={gravar}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        }}
        aria-label={`Nota da P${numero} de ${d.nome}`}
      />
      {extras > 0 ? (
        <small className="campo-prova-extra">+{formatarNota(extras)} extra</small>
      ) : (
        nota?.data && <small>{dataCurta(nota.data)}</small>
      )}
    </label>
  )
}

/** Pontos que valem em todas as matérias (SEAU, ACI...), em destaque no topo das notas. */
function PontosExtras({ abrir }: { abrir: (f: FolhaAberta) => void }) {
  const { dados } = useFaculdade()
  if (!dados.pontos_extras.length) {
    return (
      <button type="button" className="card link-extra" onClick={() => abrir({ tipo: 'extra' })}>
        + Pontos extras (SEAU, ACI…) que valem em todas as matérias
      </button>
    )
  }
  return (
    <section className="card destaque-extra">
      {dados.pontos_extras.map((x) => (
        <button key={x.id} type="button" className="destaque-extra-linha" onClick={() => abrir({ tipo: 'extra', extra: x })}>
          <span className="destaque-extra-pontos">+{formatarNota(x.pontos)}</span>
          <span>
            <strong>{x.nome}</strong>
            <small>Somam na P{x.bimestre} ({x.bimestre}º bimestre) de todas as matérias</small>
          </span>
        </button>
      ))}
      <button type="button" className="botao-texto" onClick={() => abrir({ tipo: 'extra' })}>
        + Outro ponto extra
      </button>
    </section>
  )
}

// ---------- Faltas ----------

function SecaoFaltas({ abrir }: { abrir: (f: FolhaAberta) => void }) {
  const { dados, executar } = useFaculdade()
  const { hoje, avisar } = useEstado()
  const [aberta, setAberta] = useState<string | null>(null)

  const faltarHoje = async (d: Disciplina, ultima?: Falta) => {
    // Usa as aulas do horário de hoje; sem horário, repete a última falta (ou 2).
    const quantidade = aulasDaDisciplinaNoDia(dados.aulas, d.id, hoje) || ultima?.quantidade || 2
    const ok = await executar(() => repoFaculdade.criar('faltas', { disciplina_id: d.id, data: hoje, quantidade }))
    if (ok) avisar(`Falta registrada em ${d.nome} (${quantidade} ${quantidade === 1 ? 'aula' : 'aulas'}).`)
  }
  const hojeAulas = aulasDoDia(dados.aulas, hoje)
  const faltouHoje = (id: string) => dados.faltas.some((f) => f.disciplina_id === id && f.data === hoje)

  return (
    <div className="lista-disciplinas">
      <section className="card aulas-hoje">
        <div className="aulas-hoje-topo">
          <strong>Aulas de hoje</strong>
          <button type="button" className="botao-texto" onClick={() => abrir({ tipo: 'horario' })}>
            {dados.aulas.length ? 'Editar horário' : 'Montar horário'}
          </button>
        </div>
        {!dados.aulas.length ? (
          <p className="vazio">Monte o horário da semana: o "Faltei hoje" passa a saber quantas aulas você perdeu.</p>
        ) : !hojeAulas.length ? (
          <p className="vazio">Sem aulas hoje ({NOMES_DIAS[diaDaSemana(hoje) - 1].toLowerCase()}).</p>
        ) : (
          <ul className="lista">
            {hojeAulas.map((a) => {
              const d = dados.disciplinas.find((x) => x.id === a.disciplina_id)
              if (!d) return null
              const ja = faltouHoje(d.id)
              return (
                <li key={a.id} className="aula-linha">
                  <i className="ponto ponto-grande" style={{ background: d.cor }} />
                  <span className="linha-texto">
                    <strong>{d.nome}</strong>
                    <small>
                      {a.inicio ? `${a.inicio} · ` : ''}
                      {a.quantidade} {a.quantidade === 1 ? 'aula' : 'aulas'}
                    </small>
                  </span>
                  {ja ? (
                    <span className="prazo prazo-atrasada">Faltou</span>
                  ) : (
                    <button type="button" className="botao-faltei" onClick={() => faltarHoje(d)}>
                      Faltei
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
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
              <button type="button" className="secao-alternar" onClick={() => setAberta(aberta === d.id ? null : d.id)}>
                {aberta === d.id ? 'Esconder os dias' : `Ver os dias (${faltas.length})`} {aberta === d.id ? '▴' : '▾'}
              </button>
            )}
            {faltas.length > 0 && aberta === d.id && (
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

// ---------- Calendário ----------

const DIAS_SEMANA = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']

function SecaoCalendario({
  abrir,
  dia,
  aoEscolherDia,
}: {
  abrir: (f: FolhaAberta) => void
  dia: string
  aoEscolherDia: (dia: string) => void
}) {
  const { dados } = useFaculdade()
  const { hoje } = useEstado()
  const [mes, setMes] = useState(mesDe(dia))
  const eventos = eventosCalendario(dados)
  const porDia = new Map<string, EventoCalendario[]>()
  for (const e of eventos) porDia.set(e.data, [...(porDia.get(e.data) ?? []), e])
  const doDia = porDia.get(dia) ?? []
  const proximos = proximosEventos(eventos, hoje).filter((e) => e.data !== dia).slice(0, 8)

  const mudarMes = (n: number) => {
    const novo = somarMeses(mes, n)
    setMes(novo)
    aoEscolherDia(novo === mesDe(hoje) ? hoje : `${novo}-01`)
  }

  return (
    <>
      <section className="card calendario">
        <div className="calendario-topo">
          <button type="button" className="botao-icone" aria-label="Mês anterior" onClick={() => mudarMes(-1)}>
            <IconeAnterior tamanho={18} />
          </button>
          <strong>{tituloDoMes(mes, mesDe(hoje))}</strong>
          <button type="button" className="botao-icone" aria-label="Próximo mês" onClick={() => mudarMes(1)}>
            <IconeProximo tamanho={18} />
          </button>
        </div>
        <div className="calendario-grade" role="grid">
          {DIAS_SEMANA.map((s, i) => (
            <span key={i} className="calendario-semana">
              {s}
            </span>
          ))}
          {semanasDoMes(mes)
            .flat()
            .map((d, i) => {
              if (!d) return <span key={i} />
              const ev = porDia.get(d) ?? []
              const temProva = ev.some((e) => e.tipo === 'prova')
              const temEntrega = ev.some((e) => e.tipo === 'entrega')
              return (
                <button
                  key={d}
                  type="button"
                  className={`calendario-dia${d === dia ? ' escolhido' : ''}${d === hoje ? ' hoje' : ''}${temProva ? ' com-prova' : ''}`}
                  aria-label={`${dataCurta(d)}${temProva ? ', tem prova' : ''}${temEntrega ? ', tem entrega' : ''}`}
                  aria-pressed={d === dia}
                  onClick={() => aoEscolherDia(d)}
                >
                  {diaDe(d)}
                  <span className="calendario-marcas">
                    {temProva && <i className="marca-prova" />}
                    {temEntrega && <i className="marca-entrega" />}
                  </span>
                </button>
              )
            })}
        </div>
        <div className="calendario-legenda">
          <span>
            <i className="marca-prova" /> Prova
          </span>
          <span>
            <i className="marca-entrega" /> Entrega
          </span>
        </div>
      </section>

      <section className="secao">
        <h2>
          {dia === hoje ? 'Hoje' : dataCurta(dia)} <span>{doDia.length ? `${doDia.length} no dia` : 'nada no dia'}</span>
        </h2>
        {doDia.length > 0 && <ul className="lista">{doDia.map((e) => <LinhaEvento key={chave(e)} e={e} abrir={abrir} />)}</ul>}
        <div className="botoes-disciplina">
          <button type="button" className="botao-secundario" onClick={() => abrir({ tipo: 'nota', prova: true, data: dia })}>
            + Prova
          </button>
          <button type="button" className="botao-secundario" onClick={() => abrir({ tipo: 'atividade', data: dia })}>
            + Entrega
          </button>
        </div>
      </section>

      {proximos.length > 0 && (
        <section className="secao">
          <h2>Próximas provas e entregas</h2>
          <ul className="lista">{proximos.map((e) => <LinhaEvento key={chave(e)} e={e} abrir={abrir} />)}</ul>
        </section>
      )}
      <p className="dica">Toque num dia para ver o que tem. Na prova, toque nela quando a nota sair para preencher.</p>
    </>
  )
}

const chave = (e: EventoCalendario) => (e.tipo === 'prova' ? `p:${e.nota.id}` : `e:${e.atividade.id}`)

function quando(hoje: string, data: string): string {
  const dias = diasAte(hoje, data)
  if (dias === 0) return 'Hoje'
  if (dias === 1) return 'Amanhã'
  if (dias > 1 && dias <= 30) return `Em ${dias} dias`
  return dataCurta(data)
}

function LinhaEvento({ e, abrir }: { e: EventoCalendario; abrir: (f: FolhaAberta) => void }) {
  const { executar } = useFaculdade()
  const { hoje } = useEstado()
  const d = e.disciplina

  if (e.tipo === 'prova') {
    const n = e.nota
    return (
      <li>
        <ItemDeslizavel
          pergunta={`Apagar a prova “${n.descricao}”${d ? ` de ${d.nome}` : ''}?`}
          aoEditar={() => abrir({ tipo: 'nota', nota: n })}
          aoApagar={() => executar(() => repoFaculdade.excluir('notas', n.id))}
          aoTocar={() => abrir({ tipo: 'nota', nota: n })}
        >
          <div className="linha-atividade">
            <span className="etiqueta-prova">Prova</span>
            <span className="linha-texto">
              <strong>
                {n.descricao}
                {d && ` · ${d.nome}`}
              </strong>
              <small>
                {dataCurta(n.data!)}
                {n.peso !== 1 && ` · peso ${formatarNota(n.peso)}`}
              </small>
            </span>
            {n.valor === null ? (
              <span className={`prazo prazo-${diasAte(hoje, n.data!) <= 7 ? 'perto' : 'longe'}`}>{quando(hoje, n.data!)}</span>
            ) : (
              <strong className={d && n.valor < d.media_minima ? 'negativo-texto' : 'positivo'}>{formatarNota(n.valor)}</strong>
            )}
          </div>
        </ItemDeslizavel>
      </li>
    )
  }

  const a = e.atividade
  const prazo = prazoAtividade(a, hoje)
  return (
    <li>
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
            onClick={(ev) => {
              ev.stopPropagation()
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
