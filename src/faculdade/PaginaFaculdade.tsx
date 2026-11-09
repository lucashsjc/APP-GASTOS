import { useState } from 'react'
import { IconeAnterior, IconeCheck, IconeLivros, IconeMais, IconeProximo } from '../componentes/icones'
import { ItemDeslizavel } from '../componentes/ItemDeslizavel'
import { BotaoMenu } from '../componentes/MenuLateral'
import { useEstado } from '../estado'
import { dataCurta, diaDe, mesDe, somarMeses, tituloDoMes } from '../lib/datas'
import { useFaculdade } from './estado'
import { FolhaAtividade, FolhaDisciplinas, FolhaFalta, FolhaNota, FolhaPontoExtra } from './Folhas'
import {
  BIMESTRES,
  diasAte,
  eventosCalendario,
  extrasDoBimestre,
  formatarNota,
  lerNota,
  nomeProva,
  outrasNotas,
  prazoAtividade,
  provaDoBimestre,
  resumoBimestre,
  proximosEventos,
  resumoFaltas,
  semanasDoMes,
  type Bimestre,
  type EventoCalendario,
  type NumeroProva,
} from './regras'
import { repoFaculdade } from './repo'
import type { Atividade, Disciplina, Falta, Nota, PontoExtra } from './tipos'

export type Secao = 'notas' | 'faltas' | 'calendario'

const TITULOS: Record<Secao, string> = { notas: 'Notas por matéria', faltas: 'Faltas', calendario: 'Calendário' }

type FolhaAberta =
  | { tipo: 'disciplinas' }
  | { tipo: 'nota'; nota?: Nota; disciplina?: string; data?: string; prova?: boolean }
  | { tipo: 'falta'; falta?: Falta; disciplina?: string }
  | { tipo: 'atividade'; atividade?: Atividade; data?: string }
  | { tipo: 'extra'; extra?: PontoExtra }

export default function PaginaFaculdade({ secao }: { secao: Secao }) {
  const { dados, carregando, erro } = useFaculdade()
  const { hoje } = useEstado()
  const [folha, setFolha] = useState<FolhaAberta | null>(null)
  const fechar = () => setFolha(null)
  // A matéria aberta em Notas e o dia escolhido no calendário ficam entre as trocas de aba.
  const [materia, setMateria] = useState<string | null>(null)
  const materiaAberta = dados.disciplinas.find((d) => d.id === materia) ?? dados.disciplinas[0] ?? null
  const [dia, setDia] = useState(hoje)

  const adicionar = () => {
    if (!dados.disciplinas.length) return setFolha({ tipo: 'disciplinas' })
    if (secao === 'notas') return setFolha({ tipo: 'nota', disciplina: materiaAberta?.id })
    if (secao === 'faltas') return setFolha({ tipo: 'falta' })
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
      ) : !dados.disciplinas.length ? (
        <section className="card em-breve">
          <strong>Comece pelas disciplinas</strong>
          <p>Cadastre as disciplinas do semestre, com a média para passar e o limite de faltas.</p>
          <button type="button" className="botao-principal botao-faculdade" onClick={() => setFolha({ tipo: 'disciplinas' })}>
            Cadastrar disciplinas
          </button>
        </section>
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
      <PontosExtras abrir={abrir} />
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
        {BIMESTRES.map((b) => (
          <BlocoBimestre key={b} d={d} notas={notas} bimestre={b} />
        ))}
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
          <p className="vazio">Nenhuma. As provas P1 e P2 ficam nos bimestres acima.</p>
        )}
        <button type="button" className="botao-secundario" onClick={() => abrir({ tipo: 'nota', disciplina: d.id })}>
          + Outra nota de {d.nome}
        </button>
      </section>
    </>
  )
}

/** A média do bimestre mais recente com as duas provas feitas (para a pílula da matéria). */
function situacaoAtual(notas: Nota[], d: Disciplina, pontos: PontoExtra[]) {
  for (const b of [...BIMESTRES].reverse()) {
    const r = resumoBimestre(
      provaDoBimestre(notas, 1, b)?.valor ?? null,
      provaDoBimestre(notas, 2, b)?.valor ?? null,
      d.media_minima,
      extrasDoBimestre(pontos, b),
    )
    if (r.tipo === 'fechado') return r
  }
  return null
}

function BlocoBimestre({ d, notas, bimestre }: { d: Disciplina; notas: Nota[]; bimestre: Bimestre }) {
  const { dados } = useFaculdade()
  const p1 = provaDoBimestre(notas, 1, bimestre)
  const p2 = provaDoBimestre(notas, 2, bimestre)
  const extras = extrasDoBimestre(dados.pontos_extras, bimestre)
  const r = resumoBimestre(p1?.valor ?? null, p2?.valor ?? null, d.media_minima, extras)
  const nomesExtras = dados.pontos_extras.filter((x) => x.bimestre === bimestre).map((x) => x.nome).join(', ')
  return (
    <div className="bimestre">
      <div className="bimestre-topo">
        <strong>{bimestre}º bimestre</strong>
        {extras > 0 && (
          <span className="selo-extra">
            +{formatarNota(extras)} {nomesExtras}
          </span>
        )}
      </div>
      <div className="bimestre-provas">
        <CampoProva d={d} numero={1} bimestre={bimestre} nota={p1} />
        <CampoProva d={d} numero={2} bimestre={bimestre} nota={p2} />
        <div className={`bimestre-media${r.tipo === 'fechado' ? (r.passou ? ' passou' : ' nao-passou') : ''}`}>
          <small>Média</small>
          <strong>{r.tipo === 'fechado' ? formatarNota(r.media) : '—'}</strong>
        </div>
      </div>
      <p className={`bimestre-resultado bimestre-${r.tipo}${r.tipo === 'fechado' ? (r.passou ? '-passou' : '-nao') : ''}`}>
        {r.tipo === 'vazio'
          ? `Coloque a nota da P1 para ver quanto precisa na P2 (média ${formatarNota(d.media_minima)}).`
          : r.tipo === 'precisa'
            ? <>Precisa tirar <b>{formatarNota(r.valor)}</b> na P{r.naProva} para passar{extras > 0 ? ` (já contando os +${formatarNota(extras)})` : ''}.</>
            : r.tipo === 'garantido'
              ? `Já passou: mesmo tirando 0 na P${r.naProva}, fecha a média.`
              : r.tipo === 'impossivel'
                ? `Nem com ${r.maximo} na P${r.naProva} chega na média ${formatarNota(d.media_minima)}.`
                : r.passou
                  ? `Passou no ${bimestre}º bimestre com ${formatarNota(r.media)}.`
                  : `Fechou com ${formatarNota(r.media)}, abaixo da média ${formatarNota(d.media_minima)}.`}
      </p>
    </div>
  )
}

/** Campo da nota de uma prova: grava ao sair do campo (ou no Enter). Vazio apaga a nota. */
function CampoProva({ d, numero, bimestre, nota }: { d: Disciplina; numero: NumeroProva; bimestre: Bimestre; nota?: Nota }) {
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
    await executar(() =>
      nota
        ? repoFaculdade.atualizar('notas', nota.id, { valor })
        : repoFaculdade.criar('notas', { disciplina_id: d.id, descricao: nomeProva(numero, bimestre), valor, peso: 1, data: null }),
    )
  }

  return (
    <label className="campo-prova">
      <span>P{numero}</span>
      <input
        inputMode="decimal"
        placeholder="—"
        value={texto}
        onChange={(e) => setTexto(e.target.value.replace(/[^\d.,]/g, ''))}
        onBlur={gravar}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        }}
        aria-label={`Nota da P${numero} do ${bimestre}º bimestre de ${d.nome}`}
      />
      {nota?.data && <small>{dataCurta(nota.data)}</small>}
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
            <small>Na média do {x.bimestre}º bimestre, em todas as matérias</small>
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
