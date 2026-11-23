import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Folha } from '../componentes/Folha'
import { IconeMais } from '../componentes/icones'
import { BotaoMenu } from '../componentes/MenuLateral'
import { repo } from '../data/repo'
import type { NovoProjetoUnivap, ProjetoUnivap, StatusProjeto } from '../data/types'
import { useEstado } from '../estado'
import { useFaculdade } from '../faculdade/estado'
import { dataCurta, diasEntre } from '../lib/datas'

const STATUS: { id: StatusProjeto; nome: string }[] = [
  { id: 'a_fazer', nome: 'A fazer' },
  { id: 'andamento', nome: 'Em andamento' },
  { id: 'entregue', nome: 'Entregue' },
]

const PROXIMO: Record<StatusProjeto, StatusProjeto> = { a_fazer: 'andamento', andamento: 'entregue', entregue: 'a_fazer' }

function prazo(p: ProjetoUnivap, hoje: string): { texto: string; nivel: 'ok' | 'perto' | 'atrasado' | 'feito' } | null {
  if (p.status === 'entregue') return { texto: p.entrega ? `Entregue · ${dataCurta(p.entrega)}` : 'Entregue', nivel: 'feito' }
  if (!p.entrega) return null
  const dias = diasEntre(hoje, p.entrega)
  if (dias < 0) return { texto: `Atrasado (${dataCurta(p.entrega)})`, nivel: 'atrasado' }
  if (dias === 0) return { texto: 'Entrega hoje', nivel: 'perto' }
  if (dias === 1) return { texto: 'Entrega amanhã', nivel: 'perto' }
  return { texto: `Entrega em ${dias} dias · ${dataCurta(p.entrega)}`, nivel: dias <= 7 ? 'perto' : 'ok' }
}

/** Projetos da UNIVAP: a lista com a situação de cada um e a data de entrega. */
export default function ProjetosUnivap() {
  const { dados, hoje, executar, carregando } = useEstado()
  const [filtro, setFiltro] = useState<StatusProjeto | 'todos'>('todos')
  const [folha, setFolha] = useState<{ projeto?: ProjetoUnivap } | null>(null)
  const projetos = dados.projetos ?? []
  // Os que ainda não foram entregues primeiro, pela data de entrega; os entregues no fim.
  const ordenados = [...projetos].sort(
    (a, b) =>
      Number(a.status === 'entregue') - Number(b.status === 'entregue') ||
      (a.entrega ?? '9999').localeCompare(b.entrega ?? '9999'),
  )
  const lista = filtro === 'todos' ? ordenados : ordenados.filter((p) => p.status === filtro)
  const contar = (s: StatusProjeto) => projetos.filter((p) => p.status === s).length

  return (
    <div className="pagina pagina-univap">
      <header className="topo">
        <div className="topo-linha">
          <div className="topo-com-menu">
            <BotaoMenu />
            <h1>Projetos UNIVAP</h1>
          </div>
          <button type="button" className="botao-mais" onClick={() => setFolha({})} aria-label="Novo projeto">
            <IconeMais tamanho={20} />
          </button>
        </div>
        <div className="univap-resumo">
          {STATUS.map((s) => (
            <div key={s.id}>
              <strong>{contar(s.id)}</strong>
              <small>{s.nome}</small>
            </div>
          ))}
        </div>
        <nav className="pilulas-faculdade" aria-label="Filtro">
          {([{ id: 'todos', nome: 'Todos' }, ...STATUS] as { id: StatusProjeto | 'todos'; nome: string }[]).map((s) => (
            <button key={s.id} type="button" className={`chip${filtro === s.id ? ' ativo' : ''}`} onClick={() => setFiltro(s.id)}>
              {s.nome}
            </button>
          ))}
        </nav>
      </header>

      <Link to="/univap/stockpy" className="card cartao-app">
        <span className="cartao-app-icone" aria-hidden="true">
          📦
        </span>
        <span className="cartao-app-texto">
          <strong>StockPy</strong>
          <small>Desafio 2 · Algoritmos e Programação · abrir o app</small>
        </span>
        <span className="cartao-app-abrir">Abrir</span>
      </Link>

      {carregando ? (
        <p className="vazio">Carregando…</p>
      ) : lista.length === 0 ? (
        <p className="vazio">
          {projetos.length === 0 ? 'Nenhum projeto ainda. Toque no + para colocar o primeiro.' : 'Nenhum projeto nesta situação.'}
        </p>
      ) : (
        <ul className="lista-materias">
          {lista.map((p) => {
            const pz = prazo(p, hoje)
            return (
              <li key={p.id}>
                <div className={`card cartao-projeto status-${p.status}`}>
                  <button type="button" className="cartao-projeto-corpo" onClick={() => setFolha({ projeto: p })}>
                    <strong>{p.nome}</strong>
                    <small>{[p.materia, p.grupo && `Grupo: ${p.grupo}`].filter(Boolean).join(' · ') || 'Toque para completar'}</small>
                    {pz && <span className={`projeto-prazo prazo-${pz.nivel}`}>{pz.texto}</span>}
                    {p.observacao && <small className="projeto-obs">{p.observacao}</small>}
                  </button>
                  <button
                    type="button"
                    className={`projeto-status status-${p.status}`}
                    onClick={() => executar(() => repo.salvarProjeto({ ...semId(p), status: PROXIMO[p.status] }, p.id))}
                    title="Tocar muda a situação"
                  >
                    {STATUS.find((s) => s.id === p.status)!.nome}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {projetos.length > 0 && <p className="dica">Toque na situação para avançar (a fazer → em andamento → entregue).</p>}

      {folha && <FolhaProjeto projeto={folha.projeto} aoFechar={() => setFolha(null)} />}
    </div>
  )
}

function semId(p: ProjetoUnivap): NovoProjetoUnivap {
  const { id: _id, ...resto } = p
  void _id
  return resto
}

function FolhaProjeto({ projeto, aoFechar }: { projeto?: ProjetoUnivap; aoFechar: () => void }) {
  const { executar } = useEstado()
  const { dados: faculdade } = useFaculdade()
  const [nome, setNome] = useState(projeto?.nome ?? '')
  const [materia, setMateria] = useState(projeto?.materia ?? '')
  const [grupo, setGrupo] = useState(projeto?.grupo ?? '')
  const [status, setStatus] = useState<StatusProjeto>(projeto?.status ?? 'a_fazer')
  const [entrega, setEntrega] = useState(projeto?.entrega ?? '')
  const [observacao, setObservacao] = useState(projeto?.observacao ?? '')
  const [erro, setErro] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) return setErro('Coloque o nome do projeto.')
    setSalvando(true)
    const campos: NovoProjetoUnivap = {
      nome: nome.trim(),
      materia: materia.trim(),
      grupo: grupo.trim(),
      status,
      entrega: /^\d{4}-\d{2}-\d{2}$/.test(entrega) ? entrega : null,
      observacao: observacao.trim(),
    }
    const ok = await executar(() => repo.salvarProjeto(campos, projeto?.id))
    setSalvando(false)
    if (ok) aoFechar()
  }

  const apagar = async () => {
    if (!projeto) return
    if (await executar(() => repo.excluirProjeto(projeto.id))) aoFechar()
  }

  return (
    <Folha titulo={projeto ? 'Editar projeto' : 'Novo projeto'} aoFechar={aoFechar}>
      <form className="form-gasto" onSubmit={salvar} noValidate>
        <label className="campo">
          <span>Nome do projeto</span>
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Sistema de biblioteca" autoFocus={!projeto} />
        </label>
        <label className="campo">
          <span>Matéria</span>
          <input value={materia} onChange={(e) => setMateria(e.target.value)} placeholder="Ex.: Programação Web" />
        </label>
        {faculdade.disciplinas.length > 0 && (
          <div className="chips" aria-label="Matérias">
            {faculdade.disciplinas.map((d) => (
              <button key={d.id} type="button" className={`chip${materia === d.nome ? ' ativo' : ''}`} onClick={() => setMateria(d.nome)}>
                {d.nome}
              </button>
            ))}
          </div>
        )}
        <label className="campo">
          <span>Grupo</span>
          <input value={grupo} onChange={(e) => setGrupo(e.target.value)} placeholder="Ex.: Lucas, Ana, Pedro" />
        </label>
        <div className="campo">
          <span>Situação</span>
          <div className="segmentado pequeno" role="radiogroup" aria-label="Situação">
            {STATUS.map((s) => (
              <button key={s.id} type="button" role="radio" aria-checked={status === s.id} className={status === s.id ? 'ativo' : ''} onClick={() => setStatus(s.id)}>
                {s.nome}
              </button>
            ))}
          </div>
        </div>
        <label className="campo">
          <span>Data de entrega (opcional)</span>
          <input type="date" value={entrega} onChange={(e) => setEntrega(e.target.value)} />
        </label>
        <label className="campo">
          <span>Anotação (opcional)</span>
          <input value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Ex.: eu fico com o front" />
        </label>
        {erro && <p className="erro">{erro}</p>}
        <button type="submit" className="botao-principal" disabled={salvando}>
          {salvando ? 'Salvando…' : projeto ? 'Salvar alterações' : 'Salvar projeto'}
        </button>
        {projeto &&
          (confirmando ? (
            <div className="confirmar-apagar">
              <span>Apagar “{projeto.nome}”?</span>
              <div>
                <button type="button" className="botao-texto" onClick={() => setConfirmando(false)}>
                  Não
                </button>
                <button type="button" className="botao-perigo" onClick={apagar}>
                  Apagar
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="botao-texto botao-apagar-falta" onClick={() => setConfirmando(true)}>
              Apagar projeto
            </button>
          ))}
      </form>
    </Folha>
  )
}
