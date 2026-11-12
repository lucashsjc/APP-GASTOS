import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Folha } from '../componentes/Folha'
import { IconeAnterior, IconePorquinho, IconeProximo } from '../componentes/icones'
import { ItemDeslizavel } from '../componentes/ItemDeslizavel'
import { Valor } from '../componentes/Valor'
import { repo } from '../data/repo'
import type { Guardado } from '../data/types'
import { useEstado } from '../estado'
import { resumoCofrinho } from '../lib/cofrinho'
import { mesDe, nomeDoMes, somarMeses, tituloDoMes } from '../lib/datas'
import { formatarReais, lerReais } from '../lib/dinheiro'

type Folhas = { tipo: 'guardar' | 'retirar'; mes?: string; valor?: number } | 'meta' | null

/** O porquinho: quanto tem guardado, a meta do mês e as sobras de meses passados para guardar. */
export default function Cofrinho() {
  const { dados, hoje, executar } = useEstado()
  const navegar = useNavigate()
  const [folha, setFolha] = useState<Folhas>(null)
  const r = resumoCofrinho(dados, hoje)
  const mesAtual = mesDe(hoje)
  const fracaoMeta = r.meta ? Math.min(1, Math.max(0, r.noMes / r.meta)) : 0

  return (
    <div className="pagina pagina-cofrinho">
      <header className="topo">
        <div className="topo-linha">
          <button type="button" className="voltar" onClick={() => navegar(-1)}>
            <IconeAnterior tamanho={18} /> Voltar
          </button>
        </div>
        <h1>Cofrinho</h1>
      </header>

      <section className="card-principal card-nubank cofrinho-total">
        <div className="card-principal-topo">
          <span className="cofrinho-selo" aria-hidden="true">
            <IconePorquinho tamanho={22} />
          </span>
          <span>Guardado</span>
        </div>
        <Valor centavos={r.total} />
        <p className="cofrinho-nota">Não entra no livre para gastar do Nubank.</p>
        <div className="cofrinho-botoes">
          <button type="button" className="botao-principal botao-nubank" onClick={() => setFolha({ tipo: 'guardar' })}>
            Guardar
          </button>
          <button
            type="button"
            className="botao-secundario"
            onClick={() => setFolha({ tipo: 'retirar' })}
            disabled={r.total <= 0}
          >
            Retirar
          </button>
        </div>
      </section>

      <section className="card cofrinho-meta">
        <div className="limites-topo">
          <h2>Guardar todo mês</h2>
          <button type="button" className="botao-texto" onClick={() => setFolha('meta')}>
            {r.meta ? 'Mudar' : 'Definir'}
          </button>
        </div>
        {r.meta ? (
          <>
            <div className="limite-linha">
              <span>{nomeDoMes(mesAtual)}</span>
              <span className="limite-valores">
                <b>{formatarReais(Math.max(0, r.noMes))}</b> de {formatarReais(r.meta)}
              </span>
            </div>
            <div className={`limite-barra ${fracaoMeta >= 1 ? 'completa' : ''}`} aria-hidden="true">
              <span style={{ width: `${fracaoMeta * 100}%` }} />
            </div>
            {r.noMes < r.meta ? (
              <button
                type="button"
                className="botao-texto cofrinho-falta"
                onClick={() => setFolha({ tipo: 'guardar', mes: mesAtual, valor: r.meta! - Math.max(0, r.noMes) })}
              >
                Guardar os {formatarReais(r.meta - Math.max(0, r.noMes))} que faltam
              </button>
            ) : (
              <small className="cofrinho-ok">Meta do mês cumprida 🎉</small>
            )}
          </>
        ) : (
          <p className="nota">Defina quanto quer guardar por mês. O que você guardar sai do livre para gastar.</p>
        )}
      </section>

      <Link to="/compras-futuras" className="card link-fixos">
        <span>
          <strong>Compras futuras</strong>
          <small>A lista do que você quer comprar, e se já dá com o livre ou com o cofrinho.</small>
        </span>
        <IconeProximo tamanho={18} />
      </Link>

      {r.sobras.length > 0 && (
        <section className="card">
          <h2 className="resumo-titulo">Sobrou nos meses passados</h2>
          <p className="nota">
            Se esse dinheiro já está na caixinha do Nubank, mande para o cofrinho: ele para de aparecer como livre naquele
            mês.
          </p>
          <ul className="cofrinho-sobras">
            {r.sobras.map((s) => (
              <li key={s.mes}>
                <span>
                  <strong>{tituloDoMes(s.mes)}</strong>
                  <small>{formatarReais(s.valor)} livre</small>
                </span>
                <button type="button" className="botao-lancar" onClick={() => setFolha({ tipo: 'guardar', mes: s.mes, valor: s.valor })}>
                  Guardar
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {r.historico.length > 0 && (
        <section className="secao">
          <h2>Histórico</h2>
          {r.historico.map((h) => (
            <div key={h.mes} className="cofrinho-mes">
              <h3>
                {tituloDoMes(h.mes)}
                <span className={h.liquido >= 0 ? 'positivo' : 'negativo-texto'}>
                  {h.liquido >= 0 ? '+' : '−'}
                  {formatarReais(Math.abs(h.liquido))}
                </span>
              </h3>
              <ul className="lista">
                {h.movimentos.map((g) => (
                  <li key={g.id}>
                    <ItemDeslizavel
                      pergunta={`Apagar ${g.tipo === 'guardar' ? 'o guardado' : 'a retirada'} de ${formatarReais(g.valor_centavos)}?`}
                      aoApagar={() => executar(() => repo.excluirGuardado(g.id))}
                    >
                      <LinhaMovimento g={g} />
                    </ItemDeslizavel>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="dica">Deslize para a esquerda para apagar.</p>
        </section>
      )}

      {folha === 'meta' && <FolhaMeta aoFechar={() => setFolha(null)} />}
      {folha && folha !== 'meta' && (
        <FolhaGuardar tipo={folha.tipo} mesInicial={folha.mes} valorInicial={folha.valor} aoFechar={() => setFolha(null)} />
      )}
    </div>
  )
}

function LinhaMovimento({ g }: { g: Guardado }) {
  return (
    <div className="linha-gasto">
      <span className="linha-icone" aria-hidden="true">
        <IconePorquinho />
      </span>
      <span className="linha-texto">
        <strong>{g.descricao || (g.tipo === 'guardar' ? 'Guardado' : 'Retirado')}</strong>
        <small>{g.tipo === 'guardar' ? 'Saiu do livre do mês' : 'Voltou para o livre do mês'}</small>
      </span>
      <span className="linha-valor">
        <strong className={g.tipo === 'guardar' ? 'positivo' : undefined}>
          {g.tipo === 'guardar' ? '+' : '−'}
          {formatarReais(g.valor_centavos)}
        </strong>
      </span>
    </div>
  )
}

const reais = (centavos: number) => formatarReais(centavos).replace('R$ ', '')

function FolhaGuardar({
  tipo,
  mesInicial,
  valorInicial,
  aoFechar,
}: {
  tipo: 'guardar' | 'retirar'
  mesInicial?: string
  valorInicial?: number
  aoFechar: () => void
}) {
  const { hoje, executar, avisar } = useEstado()
  const atual = mesDe(hoje)
  const [texto, setTexto] = useState(valorInicial ? reais(valorInicial) : '')
  const [mes, setMes] = useState(mesInicial ?? atual)
  const [descricao, setDescricao] = useState(mesInicial && mesInicial !== atual ? `Sobra de ${nomeDoMes(mesInicial)}` : '')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const meses = Array.from({ length: 13 }, (_, i) => somarMeses(atual, -i))

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    const valor = lerReais(texto)
    if (!valor || valor <= 0) return setErro('Digite um valor válido.')
    setSalvando(true)
    const ok = await executar(() => repo.criarGuardado({ mes, valor_centavos: valor, tipo, descricao: descricao.trim() }))
    setSalvando(false)
    if (ok) {
      avisar(
        tipo === 'guardar'
          ? `${formatarReais(valor)} no cofrinho. Saiu do livre de ${nomeDoMes(mes)}.`
          : `${formatarReais(valor)} saíram do cofrinho para o livre de ${nomeDoMes(mes)}.`,
      )
      aoFechar()
    }
  }

  return (
    <Folha titulo={tipo === 'guardar' ? 'Guardar no cofrinho' : 'Retirar do cofrinho'} aoFechar={aoFechar}>
      <form className="form-gasto" onSubmit={salvar} noValidate>
        <label className="campo-valor">
          <span>Valor</span>
          <div>
            <span className="campo-valor-moeda">R$</span>
            <input
              inputMode="decimal"
              placeholder="0,00"
              value={texto}
              onChange={(e) => setTexto(e.target.value.replace(/[^\d.,]/g, ''))}
              autoFocus
              aria-label="Valor"
            />
          </div>
        </label>
        <label className="campo">
          <span>{tipo === 'guardar' ? 'Sai do livre de' : 'Volta para o livre de'}</span>
          <select value={mes} onChange={(e) => setMes(e.target.value)}>
            {meses.map((m) => (
              <option key={m} value={m}>
                {tituloDoMes(m, atual)}
              </option>
            ))}
          </select>
        </label>
        <label className="campo">
          <span>Descrição (opcional)</span>
          <input
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder={tipo === 'guardar' ? 'Ex.: caixinha, reserva' : 'Ex.: viagem, emergência'}
          />
        </label>
        {erro && <p className="erro">{erro}</p>}
        <button type="submit" className="botao-principal botao-nubank" disabled={salvando}>
          {salvando ? 'Salvando…' : tipo === 'guardar' ? 'Guardar' : 'Retirar'}
        </button>
      </form>
    </Folha>
  )
}

function FolhaMeta({ aoFechar }: { aoFechar: () => void }) {
  const { dados, executar } = useEstado()
  const [texto, setTexto] = useState(dados.metaGuardar ? reais(dados.metaGuardar) : '')
  const [erro, setErro] = useState<string | null>(null)

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    const valor = texto.trim() === '' ? null : lerReais(texto)
    if (valor !== null && valor <= 0) return setErro('Digite um valor válido, ou deixe em branco para tirar a meta.')
    if (await executar(() => repo.salvarMetaGuardar(valor))) aoFechar()
  }

  return (
    <Folha titulo="Guardar todo mês" aoFechar={aoFechar}>
      <form className="form-gasto" onSubmit={salvar} noValidate>
        <label className="campo-valor">
          <span>Quanto guardar por mês</span>
          <div>
            <span className="campo-valor-moeda">R$</span>
            <input
              inputMode="decimal"
              placeholder="0,00"
              value={texto}
              onChange={(e) => setTexto(e.target.value.replace(/[^\d.,]/g, ''))}
              autoFocus
              aria-label="Meta por mês"
            />
          </div>
        </label>
        <p className="nota">Deixe em branco para não ter meta.</p>
        {erro && <p className="erro">{erro}</p>}
        <button type="submit" className="botao-principal botao-nubank">
          Salvar meta
        </button>
      </form>
    </Folha>
  )
}
