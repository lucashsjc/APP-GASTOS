import { useState } from 'react'
import { Link } from 'react-router-dom'
import { etiquetaCerto, useAcoesCerto } from '../componentes/acoesCerto'
import { FolhaGasto, type ModoGasto } from '../componentes/FolhaGasto'
import { FolhaValor } from '../componentes/FolhaValor'
import { IconeLapis, IconeProximo, IconeSeta, Logo } from '../componentes/icones'
import { ItemDeslizavel } from '../componentes/ItemDeslizavel'
import { LinhaGasto } from '../componentes/LinhaGasto'
import { Topo } from '../componentes/Topo'
import { Valor } from '../componentes/Valor'
import { repo } from '../data/repo'
import { definirPago } from '../data/acoes'
import type { Aba, Gasto } from '../data/types'
import { useEstado } from '../estado'
import { cardCaju, certosDoMes, outrosDoMes, resumoNubank, resumoPagamento, type Certo } from '../lib/calculos'
import { dataCurta, dataNoMes, diaDe, mesDe, nomeDoMes } from '../lib/datas'
import { formatarReais } from '../lib/dinheiro'

const NOMES: Record<Aba, string> = { nubank: 'Nubank', caju: 'Caju' }

function porcento(parte: number, todo: number): string {
  if (todo <= 0) return parte > 0 ? '100%' : '0%'
  return `${Math.min(100, Math.max(0, (parte / todo) * 100))}%`
}

export default function PaginaAba({ aba }: { aba: Aba }) {
  const { dados, hoje, mes, executar, carregando } = useEstado()
  const [folha, setFolha] = useState<ModoGasto | null>(null)
  const [folhaValor, setFolhaValor] = useState<'recebido' | 'deposito' | null>(null)

  const certos = certosDoMes(dados, aba, mes, hoje)
  const outros = outrosDoMes(dados, aba, mes)
  // Tudo o que foi gasto no mês, do mais recente para o mais antigo; os gastos à parte ficam separados.
  const itens: (Certo | Gasto)[] = [...certos, ...outros].sort((a, b) => b.data.localeCompare(a.data))
  const normais = itens.filter((i) => !i.separado)
  const aParte = itens.filter((i) => i.separado)
  const totalDoMes = normais.reduce((s, i) => s + i.valor_centavos, 0)
  const totalAParte = aParte.reduce((s, i) => s + i.valor_centavos, 0)

  const acoesCerto = useAcoesCerto(aba, setFolha)
  const linha = (item: Certo | Gasto) =>
    'chave' in item ? (
      <li key={item.chave}>
        <ItemDeslizavel
          pergunta={acoesCerto.pergunta(item)}
          rotuloApagar={acoesCerto.rotuloApagar(item)}
          aoEditar={() => acoesCerto.editar(item)}
          aoApagar={() => acoesCerto.apagar(item)}
          aoTocar={() => acoesCerto.editar(item)}
        >
          <LinhaGasto
            {...item}
            forma={aba === 'nubank' ? item.forma : null}
            detalhe={`${dataCurta(item.data)} · ${etiquetaCerto(item)}`}
            aoAlternarPago={() => executar(() => definirPago(item, !item.pago))}
          />
        </ItemDeslizavel>
      </li>
    ) : (
      <li key={item.id}>
        <ItemDeslizavel
          pergunta={`Apagar “${item.descricao}” (${formatarReais(item.valor_centavos)})?`}
          aoEditar={() => setFolha({ aba, gasto: item })}
          aoApagar={() => executar(() => repo.excluirGastos([item.id]))}
          aoTocar={() => setFolha({ aba, gasto: item })}
        >
          <LinhaGasto
            {...item}
            forma={aba === 'nubank' ? item.forma : null}
            aoAlternarPago={() => executar(() => definirPago(item, !item.pago))}
          />
        </ItemDeslizavel>
      </li>
    )

  const depositos = aba === 'caju' ? dados.depositos.filter((d) => mesDe(d.data) === mes) : []
  const recebido = dados.recebidos.find((r) => r.mes === mes)?.valor_centavos ?? 0

  return (
    <div className={`pagina pagina-${aba}`}>
      <Topo aba={aba} titulo={NOMES[aba]} aoAdicionar={() => setFolha({ aba, origem: 'topo' })} />

      {aba === 'nubank' ? (
        <CardNubank aoEditarRecebido={() => setFolhaValor('recebido')} />
      ) : (
        <CardCajuPrincipal aoDepositar={() => setFolhaValor('deposito')} />
      )}

      <CardPagamentos certos={certos} outros={outros} />

      <section className="secao">
        <h2>
          Gastos de {nomeDoMes(mes)} <span>{formatarReais(totalDoMes)}</span>
        </h2>
        {carregando ? (
          <p className="vazio">Carregando…</p>
        ) : normais.length === 0 ? (
          <p className="vazio">Nenhum gasto em {nomeDoMes(mes)}. Toque no + lá em cima para registrar o que comprou.</p>
        ) : (
          <ul className="lista">{normais.map(linha)}</ul>
        )}
        {itens.length > 0 && <p className="dica">Deslize um gasto para a esquerda para editar ou apagar.</p>}
      </section>

      {aParte.length > 0 && (
        <section className="secao secao-a-parte">
          <h2>
            À parte <span>{formatarReais(totalAParte)}</span>
          </h2>
          <ul className="lista">{aParte.map(linha)}</ul>
          <p className="dica">Não somam com os gastos do mês, mas descontam do livre para gastar.</p>
        </section>
      )}

      <Link to={`/${aba}/certos`} className="card link-fixos">
        <span>
          <strong>Fixos e parcelas</strong>
          <small>Gastos de todo mês (PORTO, Spotify…) e compras parceladas, que entram sozinhos em cada mês.</small>
        </span>
        <IconeProximo tamanho={18} />
      </Link>

      {aba === 'caju' && depositos.length > 0 && (
        <section className="secao">
          <h2>Depósitos do mês</h2>
          <ul className="lista">
            {depositos
              .sort((a, b) => b.data.localeCompare(a.data))
              .map((d) => (
                <li key={d.id}>
                  <ItemDeslizavel
                    pergunta={`Apagar o depósito de ${formatarReais(d.valor_centavos)}?`}
                    aoApagar={() => executar(() => repo.excluirDeposito(d.id))}
                  >
                    <LinhaGasto descricao="Depósito" categoria="Outros" valor_centavos={d.valor_centavos} data={d.data}
                      positivo
                      icone={{ simbolo: '💰', cor: '#3ccf8e' }}
                    />
                  </ItemDeslizavel>
                </li>
              ))}
          </ul>
        </section>
      )}

      {folha && <FolhaGasto modo={folha} aoFechar={() => setFolha(null)} />}
      {folhaValor === 'recebido' && (
        <FolhaValor
          titulo={`Recebido em ${nomeDoMes(mes)}`}
          inicial={recebido}
          textoBotao="Salvar recebido"
          classeBotao="botao-nubank"
          aceitaZero
          aoSalvar={(valor) => executar(() => repo.salvarRecebido(mes, valor))}
          aoFechar={() => setFolhaValor(null)}
        />
      )}
      {folhaValor === 'deposito' && (
        <FolhaValor
          titulo="Depósito no Caju"
          dataInicial={mes === mesDe(hoje) ? hoje : dataNoMes(mes, diaDe(hoje))}
          textoBotao="Registrar depósito"
          classeBotao="botao-caju"
          aoSalvar={(valor, data) => executar(() => repo.criarDeposito({ aba: 'caju', data, valor_centavos: valor }))}
          aoFechar={() => setFolhaValor(null)}
        />
      )}
    </div>
  )
}

function CardNubank({ aoEditarRecebido }: { aoEditarRecebido: () => void }) {
  const { dados, hoje, mes } = useEstado()
  const r = resumoNubank(dados, mes, hoje)
  return (
    <section className="card-principal card-nubank">
      <div className="card-principal-topo">
        <Logo aba="nubank" />
        <span>Livre para gastar</span>
      </div>
      <Valor centavos={r.livre} className={r.livre < 0 ? 'negativo' : ''} />
      <div className="barra barra-clara" aria-hidden="true">
        <span style={{ width: porcento(r.certos.total + r.outros, r.recebido) }} />
        {r.aParte > 0 && <span className="barra-outros" style={{ width: porcento(r.aParte, r.recebido) }} />}
      </div>
      <div className="card-principal-legenda">
        <span>Gasto no mês {formatarReais(r.certos.total + r.outros)}</span>
        <span>
          {r.aParte > 0
            ? `À parte ${formatarReais(r.aParte)}`
            : r.recebido > 0
              ? `${Math.round(((r.certos.total + r.outros) / r.recebido) * 100)}% do recebido`
              : ''}
        </span>
      </div>
      <div className="card-principal-rodape">
        <button type="button" className="recebido" onClick={aoEditarRecebido}>
          <small>Recebido</small>
          <strong>
            {formatarReais(r.recebido)} <IconeLapis tamanho={13} />
          </strong>
        </button>
        <div className="formas">
          <small>Crédito {formatarReais(r.credito)}</small>
          <small>Débito {formatarReais(r.debito)}</small>
        </div>
      </div>
      <Link to="/nubank/para-onde" className="link-card">
        Para onde foi o dinheiro <IconeSeta tamanho={16} />
      </Link>
    </section>
  )
}

function CardCajuPrincipal({ aoDepositar }: { aoDepositar: () => void }) {
  const { dados, hoje, mes } = useEstado()
  const c = cardCaju(dados, mes, hoje)
  const rotulo =
    c.modo === 'atual'
      ? 'Saldo no cartão'
      : c.modo === 'passado'
        ? `Saldo no fim de ${nomeDoMes(mes)}`
        : `Saldo previsto no fim de ${nomeDoMes(mes)}`
  return (
    <section className="card-principal card-caju">
      <div className="card-principal-topo">
        <Logo aba="caju" />
        <span>{rotulo}</span>
      </div>
      <Valor centavos={c.saldo} className={c.saldo < 0 ? 'negativo' : ''} />
      {c.modo === 'atual' && (
        <p className="aviso-por-dia">
          {c.porDia === null ? (
            <strong>Saldo esgotado</strong>
          ) : (
            <>
              Até o fim de {nomeDoMes(mes)} ({c.diasRestantes} {c.diasRestantes === 1 ? 'dia' : 'dias'}): dá para
              gastar <strong>{formatarReais(c.porDia)}</strong> por dia
            </>
          )}
        </p>
      )}
      {c.modo === 'futuro' && <p className="aviso-por-dia">Saldo de hoje menos os fixos e parcelas do Caju até lá.</p>}
      <div className="card-principal-rodape">
        <button type="button" className="botao-claro" onClick={aoDepositar}>
          + Registrar depósito
        </button>
        <Link to="/caju/para-onde" className="link-card">
          Para onde foi <IconeSeta tamanho={16} />
        </Link>
      </div>
    </section>
  )
}

/** Quanto do mês já está pago e quanto falta, com o atalho para marcar tudo como pago. */
function CardPagamentos({ certos, outros }: { certos: Certo[]; outros: Gasto[] }) {
  const { executar, avisar } = useEstado()
  const [confirmando, setConfirmando] = useState(false)
  const itens = [...certos, ...outros]
  if (!itens.length) return null
  const r = resumoPagamento(itens)
  const pendentes = itens.filter((i) => !i.pago)

  const marcarTudo = async () => {
    setConfirmando(false)
    const ok = await executar(async () => {
      for (const item of pendentes) await definirPago(item, true)
    })
    if (ok) avisar(`${pendentes.length} ${pendentes.length === 1 ? 'gasto marcado' : 'gastos marcados'} como pago.`)
  }

  return (
    <section className="card card-pagamentos">
      <div className="card-pagamentos-linha">
        <span>
          <small>Pago</small>
          <strong className="positivo">{formatarReais(r.pago)}</strong>
        </span>
        <span>
          <small>Não pago</small>
          <strong className={r.naoPago > 0 ? 'negativo-texto' : undefined}>{formatarReais(r.naoPago)}</strong>
        </span>
        {pendentes.length > 0 && !confirmando && (
          <button type="button" className="botao-secundario" onClick={() => setConfirmando(true)}>
            Marcar tudo como pago
          </button>
        )}
      </div>
      {confirmando && (
        <div className="confirmar-pagamento">
          <span>
            Marcar {pendentes.length} {pendentes.length === 1 ? 'gasto' : 'gastos'} deste mês como pago?
          </span>
          <div>
            <button type="button" className="botao-texto" onClick={() => setConfirmando(false)}>
              Não
            </button>
            <button type="button" className="botao-confirmar" onClick={marcarTudo}>
              Marcar
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
