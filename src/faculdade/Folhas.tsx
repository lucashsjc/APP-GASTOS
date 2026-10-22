// Folhas (que sobem de baixo) da Faculdade: disciplinas, nota, falta e atividade.

import { useState } from 'react'
import { Folha } from '../componentes/Folha'
import { ItemDeslizavel } from '../componentes/ItemDeslizavel'
import { useEstado } from '../estado'
import { useFaculdade } from './estado'
import { formatarNota, lerNota, proximaCor } from './regras'
import { repoFaculdade } from './repo'
import type { Atividade, Disciplina, Falta, Nota } from './tipos'

function EscolhaDisciplina({
  valor,
  aoMudar,
  opcional,
}: {
  valor: string | null
  aoMudar: (id: string | null) => void
  opcional?: boolean
}) {
  const { dados } = useFaculdade()
  return (
    <div className="campo">
      <span>Disciplina</span>
      <div className="chips">
        {opcional && (
          <button type="button" className={`chip${valor === null ? ' ativo' : ''}`} onClick={() => aoMudar(null)}>
            Nenhuma
          </button>
        )}
        {dados.disciplinas.map((d) => (
          <button
            key={d.id}
            type="button"
            className={`chip${valor === d.id ? ' ativo' : ''}`}
            style={valor === d.id ? { borderColor: d.cor, background: `${d.cor}26` } : undefined}
            onClick={() => aoMudar(d.id)}
          >
            <i className="ponto" style={{ background: d.cor }} /> {d.nome}
          </button>
        ))}
      </div>
    </div>
  )
}

function Botao({ salvando, texto }: { salvando: boolean; texto: string }) {
  return (
    <button type="submit" className="botao-principal botao-faculdade" disabled={salvando}>
      {salvando ? 'Salvando…' : texto}
    </button>
  )
}

// ---------- Disciplinas ----------

export function FolhaDisciplinas({ aoFechar }: { aoFechar: () => void }) {
  const { dados, executar } = useFaculdade()
  const [editando, setEditando] = useState<Disciplina | 'nova' | null>(dados.disciplinas.length ? null : 'nova')

  if (editando) {
    return (
      <FormDisciplina
        disciplina={editando === 'nova' ? null : editando}
        aoVoltar={() => (dados.disciplinas.length ? setEditando(null) : aoFechar())}
      />
    )
  }

  return (
    <Folha titulo="Disciplinas" aoFechar={aoFechar}>
      <div className="form-gasto">
        <ul className="lista">
          {dados.disciplinas.map((d) => (
            <li key={d.id}>
              <ItemDeslizavel
                pergunta={`Apagar “${d.nome}” com as notas e faltas dela?`}
                aoEditar={() => setEditando(d)}
                aoApagar={() => executar(() => repoFaculdade.excluir('disciplinas', d.id))}
                aoTocar={() => setEditando(d)}
              >
                <div className="linha-gasto">
                  <i className="ponto ponto-grande" style={{ background: d.cor }} />
                  <span className="linha-texto">
                    <strong>{d.nome}</strong>
                    <small>
                      Média mínima {formatarNota(d.media_minima)}
                      {d.limite_faltas ? ` · até ${d.limite_faltas} faltas` : ''}
                    </small>
                  </span>
                </div>
              </ItemDeslizavel>
            </li>
          ))}
        </ul>
        <button type="button" className="botao-principal botao-faculdade" onClick={() => setEditando('nova')}>
          + Nova disciplina
        </button>
      </div>
    </Folha>
  )
}

function FormDisciplina({ disciplina, aoVoltar }: { disciplina: Disciplina | null; aoVoltar: () => void }) {
  const { dados, executar } = useFaculdade()
  const [nome, setNome] = useState(disciplina?.nome ?? '')
  const [media, setMedia] = useState(disciplina ? formatarNota(disciplina.media_minima) : '6')
  const [limite, setLimite] = useState(disciplina?.limite_faltas ? String(disciplina.limite_faltas) : '')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    const mediaMinima = lerNota(media)
    const limiteFaltas = limite.trim() === '' ? null : Number(limite)
    if (!nome.trim()) return setErro('Escreva o nome da disciplina.')
    if (mediaMinima === null) return setErro('Média mínima inválida (ex.: 6 ou 7,5).')
    if (limiteFaltas !== null && (!Number.isInteger(limiteFaltas) || limiteFaltas <= 0)) {
      return setErro('O limite de faltas é um número inteiro de aulas (ou deixe vazio).')
    }
    setSalvando(true)
    const campos = { nome: nome.trim(), media_minima: mediaMinima, limite_faltas: limiteFaltas }
    const ok = await executar(() =>
      disciplina
        ? repoFaculdade.atualizar('disciplinas', disciplina.id, campos)
        : repoFaculdade.criar('disciplinas', { ...campos, cor: proximaCor(dados.disciplinas) }),
    )
    setSalvando(false)
    if (ok) aoVoltar()
  }

  return (
    <Folha titulo={disciplina ? 'Editar disciplina' : 'Nova disciplina'} aoFechar={aoVoltar}>
      <form className="form-gasto" onSubmit={salvar} noValidate>
        <label className="campo">
          <span>Nome</span>
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Cálculo I" autoFocus />
        </label>
        <label className="campo">
          <span>Média mínima para passar</span>
          <input inputMode="decimal" value={media} onChange={(e) => setMedia(e.target.value)} />
        </label>
        <label className="campo">
          <span>Limite de faltas (em aulas)</span>
          <input
            inputMode="numeric"
            value={limite}
            onChange={(e) => setLimite(e.target.value.replace(/\D/g, ''))}
            placeholder="Ex.: 16 (deixe vazio se não souber)"
          />
        </label>
        <p className="nota">Normalmente é 25% das aulas do semestre. Ex.: 64 aulas → 16 faltas.</p>
        {erro && <p className="erro">{erro}</p>}
        <Botao salvando={salvando} texto={disciplina ? 'Salvar alterações' : 'Salvar disciplina'} />
      </form>
    </Folha>
  )
}

// ---------- Nota ----------

export function FolhaNota({
  nota,
  disciplinaInicial,
  aoFechar,
}: {
  nota?: Nota
  disciplinaInicial?: string
  aoFechar: () => void
}) {
  const { dados, executar } = useFaculdade()
  const { hoje } = useEstado()
  const [disciplina, setDisciplina] = useState<string | null>(
    nota?.disciplina_id ?? disciplinaInicial ?? dados.disciplinas[0]?.id ?? null,
  )
  const [descricao, setDescricao] = useState(nota?.descricao ?? '')
  const [valor, setValor] = useState(nota?.valor != null ? formatarNota(nota.valor) : '')
  // Avaliação que ainda não aconteceu: guarda sem nota, para o "quanto preciso tirar".
  const [futura, setFutura] = useState(nota ? nota.valor === null : false)
  const [peso, setPeso] = useState(nota ? formatarNota(nota.peso) : '1')
  const [data, setData] = useState(nota?.data ?? hoje)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    const v = lerNota(valor)
    const p = lerNota(peso)
    if (!disciplina) return setErro('Escolha a disciplina.')
    if (!futura && v === null) return setErro('Nota inválida (ex.: 7,5). Se ainda não saiu, marque "Ainda não saiu".')
    if (!descricao.trim()) return setErro('Escreva o que é a nota (ex.: P1, Trabalho).')
    if (p === null || p <= 0) return setErro('Peso inválido (ex.: 1 ou 2).')
    setSalvando(true)
    const campos = {
      disciplina_id: disciplina,
      descricao: descricao.trim(),
      valor: futura ? null : v,
      peso: p,
      data: data || null,
    }
    const ok = await executar(() =>
      nota ? repoFaculdade.atualizar('notas', nota.id, campos) : repoFaculdade.criar('notas', campos),
    )
    setSalvando(false)
    if (ok) aoFechar()
  }

  return (
    <Folha titulo={nota ? (futura ? 'Editar avaliação' : 'Editar nota') : futura ? 'Nova avaliação' : 'Nova nota'} aoFechar={aoFechar}>
      <form className="form-gasto" onSubmit={salvar} noValidate>
        {!futura && (
          <label className="campo-valor">
            <span>Nota</span>
            <div>
              <input
                inputMode="decimal"
                placeholder="0"
                value={valor}
                onChange={(e) => setValor(e.target.value.replace(/[^\d.,]/g, ''))}
                autoFocus={!nota}
                aria-label="Nota"
                className="input-nota"
              />
            </div>
          </label>
        )}
        <label className="alternar">
          <input type="checkbox" checked={futura} onChange={(e) => setFutura(e.target.checked)} />
          <span>
            Ainda não saiu
            <small>Cadastre a prova ou trabalho que vem (com o peso) para ver quanto precisa tirar.</small>
          </span>
        </label>
        <EscolhaDisciplina valor={disciplina} aoMudar={setDisciplina} />
        <label className="campo">
          <span>{futura ? 'Avaliação' : 'O que foi'}</span>
          <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: P1, Trabalho, Lista 2" />
        </label>
        <div className="chips">
          {['P1', 'P2', 'P3', 'Trabalho', 'Lista', 'Projeto'].map((s) => (
            <button key={s} type="button" className={`chip${descricao === s ? ' ativo' : ''}`} onClick={() => setDescricao(s)}>
              {s}
            </button>
          ))}
        </div>
        <div className="campos-lado">
          <label className="campo">
            <span>Peso</span>
            <input inputMode="decimal" value={peso} onChange={(e) => setPeso(e.target.value)} />
          </label>
          <label className="campo">
            <span>Data</span>
            <input type="date" value={data ?? ''} onChange={(e) => setData(e.target.value)} />
          </label>
        </div>
        {erro && <p className="erro">{erro}</p>}
        <Botao salvando={salvando} texto={nota ? 'Salvar alterações' : futura ? 'Salvar avaliação' : 'Salvar nota'} />
      </form>
    </Folha>
  )
}

// ---------- Falta ----------

export function FolhaFalta({
  falta,
  disciplinaInicial,
  aoFechar,
}: {
  falta?: Falta
  disciplinaInicial?: string
  aoFechar: () => void
}) {
  const { dados, executar } = useFaculdade()
  const { hoje } = useEstado()
  const [disciplina, setDisciplina] = useState<string | null>(
    falta?.disciplina_id ?? disciplinaInicial ?? dados.disciplinas[0]?.id ?? null,
  )
  const [data, setData] = useState(falta?.data ?? hoje)
  const [quantidade, setQuantidade] = useState(falta?.quantidade ?? 2)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!disciplina) return setErro('Escolha a disciplina.')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return setErro('Escolha a data.')
    setSalvando(true)
    const campos = { disciplina_id: disciplina, data, quantidade }
    const ok = await executar(() =>
      falta ? repoFaculdade.atualizar('faltas', falta.id, campos) : repoFaculdade.criar('faltas', campos),
    )
    setSalvando(false)
    if (ok) aoFechar()
  }

  return (
    <Folha titulo={falta ? 'Editar falta' : 'Nova falta'} aoFechar={aoFechar}>
      <form className="form-gasto" onSubmit={salvar} noValidate>
        <EscolhaDisciplina valor={disciplina} aoMudar={setDisciplina} />
        <div className="campo">
          <span>Aulas perdidas</span>
          <div className="contador">
            <button type="button" aria-label="Menos aulas" onClick={() => setQuantidade((q) => Math.max(1, q - 1))}>
              −
            </button>
            <strong>{quantidade}</strong>
            <button type="button" aria-label="Mais aulas" onClick={() => setQuantidade((q) => Math.min(20, q + 1))}>
              +
            </button>
          </div>
        </div>
        <label className="campo">
          <span>Data</span>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </label>
        {erro && <p className="erro">{erro}</p>}
        <Botao salvando={salvando} texto={falta ? 'Salvar alterações' : 'Salvar falta'} />
      </form>
    </Folha>
  )
}

// ---------- Atividade ----------

export function FolhaAtividade({ atividade, aoFechar }: { atividade?: Atividade; aoFechar: () => void }) {
  const { dados, executar } = useFaculdade()
  const { hoje } = useEstado()
  const [titulo, setTitulo] = useState(atividade?.titulo ?? '')
  const [disciplina, setDisciplina] = useState<string | null>(
    atividade ? atividade.disciplina_id : (dados.disciplinas[0]?.id ?? null),
  )
  const [entrega, setEntrega] = useState(atividade?.entrega ?? hoje)
  const [observacao, setObservacao] = useState(atividade?.observacao ?? '')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo.trim()) return setErro('Escreva o nome da atividade.')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entrega)) return setErro('Escolha a data de entrega.')
    setSalvando(true)
    const campos = { titulo: titulo.trim(), disciplina_id: disciplina, entrega, observacao: observacao.trim() }
    const ok = await executar(() =>
      atividade
        ? repoFaculdade.atualizar('atividades', atividade.id, campos)
        : repoFaculdade.criar('atividades', { ...campos, feita: false }),
    )
    setSalvando(false)
    if (ok) aoFechar()
  }

  return (
    <Folha titulo={atividade ? 'Editar atividade' : 'Nova atividade'} aoFechar={aoFechar}>
      <form className="form-gasto" onSubmit={salvar} noValidate>
        <label className="campo">
          <span>Atividade</span>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex.: Lista 3, Relatório, Prova"
            autoFocus={!atividade}
          />
        </label>
        <EscolhaDisciplina valor={disciplina} aoMudar={setDisciplina} opcional />
        <label className="campo">
          <span>Entrega</span>
          <input type="date" value={entrega} onChange={(e) => setEntrega(e.target.value)} />
        </label>
        <label className="campo">
          <span>Observação (opcional)</span>
          <input value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Ex.: exercícios 1 a 15" />
        </label>
        {erro && <p className="erro">{erro}</p>}
        <Botao salvando={salvando} texto={atividade ? 'Salvar alterações' : 'Salvar atividade'} />
      </form>
    </Folha>
  )
}
