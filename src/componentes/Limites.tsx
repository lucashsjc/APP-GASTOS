import { useState } from 'react'
import { repo } from '../data/repo'
import type { Aba } from '../data/types'
import { useEstado } from '../estado'
import { CATEGORIAS, categoria as dadosDaCategoria } from '../lib/categorias'
import { nomeDoMes } from '../lib/datas'
import { formatarReais, lerReais } from '../lib/dinheiro'
import { usoDosLimites } from '../lib/extras'
import { Folha } from './Folha'
import { IconeCategoria } from './icones'

/** Card "Limites do mês": uma barra por categoria com limite, verde, amarela (80%) ou vermelha (passou). */
export function CardLimites({ aba }: { aba: Aba }) {
  const { dados, hoje, mes } = useEstado()
  const [editando, setEditando] = useState(false)
  const usos = usoDosLimites(dados, aba, mes, hoje)

  return (
    <section className="card limites">
      <div className="limites-topo">
        <h2>Limites de {nomeDoMes(mes)}</h2>
        <button type="button" className="botao-texto" onClick={() => setEditando(true)}>
          {usos.length ? 'Editar' : 'Criar limite'}
        </button>
      </div>
      {usos.length === 0 ? (
        <p className="nota">Defina quanto quer gastar por categoria (ex.: Alimentação até R$ 200) e acompanhe a barra.</p>
      ) : (
        <ul className="limites-lista">
          {usos.map((u) => (
            <li key={u.limite.id} className={`limite limite-${u.situacao}`}>
              <div className="limite-linha">
                <span className="limite-nome">
                  <IconeCategoria nome={u.limite.categoria} tamanho={16} /> {u.limite.categoria}
                </span>
                <span className="limite-valores">
                  <b>{formatarReais(u.gasto)}</b> de {formatarReais(u.limite.valor_centavos)}
                </span>
              </div>
              <div className="limite-barra" aria-hidden="true">
                <span style={{ width: `${Math.min(100, u.fracao * 100)}%` }} />
              </div>
              <small>
                {u.situacao === 'passou'
                  ? `Passou ${formatarReais(-u.restante)} do limite`
                  : u.situacao === 'perto'
                    ? `Atenção: restam ${formatarReais(u.restante)}`
                    : `Restam ${formatarReais(u.restante)}`}
              </small>
            </li>
          ))}
        </ul>
      )}
      {editando && <FolhaLimites aba={aba} aoFechar={() => setEditando(false)} />}
    </section>
  )
}

/** Um campo de valor por categoria: preencher cria ou muda o limite; apagar o valor tira o limite. */
function FolhaLimites({ aba, aoFechar }: { aba: Aba; aoFechar: () => void }) {
  const { dados, executar } = useEstado()
  const atuais = (dados.limites ?? []).filter((l) => l.aba === aba)
  const [textos, setTextos] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      CATEGORIAS.map((c) => {
        const l = atuais.find((x) => x.categoria === c.nome)
        return [c.nome, l ? formatarReais(l.valor_centavos).replace('R$ ', '') : '']
      }),
    ),
  )
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    const mudancas: { categoria: string; valor: number | null }[] = []
    for (const c of CATEGORIAS) {
      const texto = textos[c.nome].trim()
      const valor = texto === '' ? null : lerReais(texto)
      if (texto !== '' && (valor === null || valor <= 0)) return setErro(`Valor inválido em ${c.nome}.`)
      const atual = atuais.find((l) => l.categoria === c.nome)
      if ((atual?.valor_centavos ?? null) !== valor) mudancas.push({ categoria: c.nome, valor })
    }
    setSalvando(true)
    const ok = await executar(async () => {
      for (const m of mudancas) {
        const atual = atuais.find((l) => l.categoria === m.categoria)
        if (m.valor === null) {
          if (atual) await repo.excluirLimite(atual.id)
        } else await repo.salvarLimite(aba, m.categoria, m.valor)
      }
    })
    setSalvando(false)
    if (ok) aoFechar()
  }

  return (
    <Folha titulo={`Limites do ${aba === 'nubank' ? 'Nubank' : 'Caju'}`} aoFechar={aoFechar}>
      <form className="form-gasto" onSubmit={salvar} noValidate>
        <p className="nota">Quanto você quer gastar por mês em cada categoria. Deixe em branco para não ter limite.</p>
        <ul className="limites-form">
          {CATEGORIAS.map((c) => (
            <li key={c.nome}>
              <span className="limite-nome">
                <i className="ponto" style={{ background: dadosDaCategoria(c.nome).cor }} /> {c.nome}
              </span>
              <label className="limite-campo">
                <span>R$</span>
                <input
                  inputMode="decimal"
                  placeholder="sem limite"
                  value={textos[c.nome]}
                  onChange={(e) => setTextos({ ...textos, [c.nome]: e.target.value.replace(/[^\d.,]/g, '') })}
                  aria-label={`Limite de ${c.nome}`}
                />
              </label>
            </li>
          ))}
        </ul>
        {erro && <p className="erro">{erro}</p>}
        <button type="submit" className={`botao-principal botao-${aba}`} disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar limites'}
        </button>
      </form>
    </Folha>
  )
}
