import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FolhaGasto } from '../componentes/FolhaGasto'
import { IconeAnterior, IconeBusca } from '../componentes/icones'
import { LinhaGasto } from '../componentes/LinhaGasto'
import type { Aba, Gasto } from '../data/types'
import { useEstado } from '../estado'
import { dataCurta, mesDe, nomeDoMes } from '../lib/datas'
import { formatarReais } from '../lib/dinheiro'
import { buscar } from '../lib/extras'

/** Busca em todos os meses: digita "uber" e vê cada gasto, o total e quanto foi em cada mês. */
export default function Busca() {
  const { dados } = useEstado()
  const navegar = useNavigate()
  const [termo, setTermo] = useState('')
  const [aba, setAba] = useState<Aba | null>(null)
  const [editando, setEditando] = useState<Gasto | null>(null)
  const r = buscar(dados, termo, aba ?? undefined)
  const procurou = termo.trim().length >= 2

  return (
    <div className="pagina pagina-busca">
      <header className="topo">
        <div className="topo-linha">
          <button type="button" className="voltar" onClick={() => navegar(-1)}>
            <IconeAnterior tamanho={18} /> Voltar
          </button>
        </div>
        <h1>Buscar gastos</h1>
      </header>

      <label className="campo-busca">
        <IconeBusca tamanho={18} />
        <input
          type="search"
          placeholder="uber, ifood, mercado…"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          autoFocus
          enterKeyHint="search"
          aria-label="Buscar"
        />
      </label>
      <div className="segmentado" role="group" aria-label="Cartão">
        {([null, 'nubank', 'caju'] as (Aba | null)[]).map((a) => (
          <button key={a ?? 'todos'} type="button" className={aba === a ? 'ativo' : undefined} onClick={() => setAba(a)}>
            {a === null ? 'Todos' : a === 'nubank' ? 'Nubank' : 'Caju'}
          </button>
        ))}
      </div>

      {!procurou ? (
        <p className="vazio">Digite pelo menos 2 letras. A busca olha o nome, a categoria e a observação, em todos os meses.</p>
      ) : r.gastos.length === 0 && r.recorrencias.length === 0 ? (
        <p className="vazio">Nada encontrado para “{termo.trim()}”.</p>
      ) : (
        <>
          <section className="card-principal card-resumo">
            <span className="resumo-rotulo">“{termo.trim()}” em todos os meses</span>
            <strong className="busca-total">{formatarReais(r.total)}</strong>
            <span className="resumo-sub">
              {r.gastos.length} {r.gastos.length === 1 ? 'gasto' : 'gastos'} em {r.porMes.length}{' '}
              {r.porMes.length === 1 ? 'mês' : 'meses'}
              {r.porMes.length > 1 && ` · média de ${formatarReais(Math.round(r.total / r.porMes.length))} por mês`}
            </span>
          </section>

          {r.recorrencias.length > 0 && (
            <section className="card">
              <h2 className="resumo-titulo">Todo mês</h2>
              <ul className="resumo-subiram">
                {r.recorrencias.map((x) => (
                  <li key={x.id}>
                    <Link to={`/${x.aba}/certos`}>
                      {x.descricao} · dia {x.dia}
                      {x.fim ? ` (até ${nomeDoMes(x.fim)})` : ''}
                    </Link>
                    <b>{formatarReais(x.valor_centavos)}</b>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {r.porMes.map((m) => (
            <section key={m.mes} className="secao">
              <h2>
                {nomeDoMes(m.mes)} {m.mes.slice(0, 4)} <span>{formatarReais(m.total)}</span>
              </h2>
              <ul className="lista">
                {m.gastos.map((g) => (
                  <li key={g.id} onClick={() => setEditando(g)}>
                    <LinhaGasto
                      {...g}
                      forma={g.aba === 'nubank' ? g.forma : null}
                      hora={null}
                      detalhe={[
                        g.aba === 'nubank' ? 'Nubank' : 'Caju',
                        dataCurta(g.data),
                        g.hora,
                        g.parcela_numero && `parcela ${g.parcela_numero}/${g.parcela_total}`,
                        g.mes_conta && g.mes_conta !== mesDe(g.data) && `conta em ${nomeDoMes(g.mes_conta)}`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
      {editando && <FolhaGasto modo={{ aba: editando.aba, gasto: editando }} aoFechar={() => setEditando(null)} />}
    </div>
  )
}
