import { useState } from 'react'
import { Link } from 'react-router-dom'
import { etiquetaCerto, useAcoesCerto } from '../componentes/acoesCerto'
import { FolhaGasto, type ModoGasto } from '../componentes/FolhaGasto'
import { FolhaDeposito } from '../componentes/FolhaDeposito'
import { FolhaValor } from '../componentes/FolhaValor'
import { IconeAnterior, IconeAssinatura, IconeBusca, IconeCategoria, IconeLapis, IconeLimite, IconeProximo, IconeResumo, Logo } from '../componentes/icones'
import { SeletorMes } from '../componentes/SeletorMes'
import { ItemDeslizavel } from '../componentes/ItemDeslizavel'
import { LinhaGasto } from '../componentes/LinhaGasto'
import { CardLimites, FolhaLimites } from '../componentes/Limites'
import { CardTelemetria } from '../componentes/Telemetria'
import { Topo } from '../componentes/Topo'
import { Valor } from '../componentes/Valor'
import { repo } from '../data/repo'
import { definirPago } from '../data/acoes'
import type { Aba, Gasto } from '../data/types'
import { useEstado } from '../estado'
import {
  CARTEIRAS,
  cardCaju,
  carteiraDe,
  certosDoMes,
  depositosDoMes,
  outrosDoMes,
  resumoNubank,
  resumoPagamento,
  type Certo,
} from '../lib/calculos'
import { dataCurta, dataNoMes, diaDe, mesDe, nomeDoMes } from '../lib/datas'
import { formatarReais } from '../lib/dinheiro'

const NOMES: Record<Aba, string> = { nubank: 'Nubank', caju: 'Caju' }

function porcento(parte: number, todo: number): string {
  if (todo <= 0) return parte > 0 ? '100%' : '0%'
  return `${Math.min(100, Math.max(0, (parte / todo) * 100))}%`
}

/**
 * A aba do cartão em dois jeitos: a tela simples (o que ainda tem, por carteira no Caju, e os gastos) e,
 * pelo botão "Detalhes", a tela com tudo: cartão completo, ritmo, atalhos, limites e pagamentos.
 */
export default function PaginaAba({ aba, detalhado = false }: { aba: Aba; detalhado?: boolean }) {
  const { dados, hoje, mes, executar, carregando } = useEstado()
  const [folha, setFolha] = useState<ModoGasto | null>(null)
  const [folhaValor, setFolhaValor] = useState<'recebido' | 'deposito' | null>(null)
  const [editandoLimites, setEditandoLimites] = useState(false)

  const certos = certosDoMes(dados, aba, mes, hoje)
  const outros = outrosDoMes(dados, aba, mes)
  // Tudo o que foi gasto no mês, do mais recente para o mais antigo; os gastos à parte ficam separados.
  const itens: (Certo | Gasto)[] = [...certos, ...outros].sort((a, b) => b.data.localeCompare(a.data))
  const normais = itens.filter((i) => !i.separado)
  const aParte = itens.filter((i) => i.separado)
  // Os totais deixam de fora o que foi pago com dinheiro à parte (como o card).
  const somaDasContas = (lista: (Certo | Gasto)[]) =>
    lista.filter((i) => !(aba === 'nubank' && i.dinheiro_a_parte)).reduce((s, i) => s + i.valor_centavos, 0)
  const totalDoMes = somaDasContas(normais)
  // A seção "à parte" já fica fora do total do mês: mostra a soma de tudo o que está nela.
  const totalAParte = aParte.reduce((s, i) => s + i.valor_centavos, 0)

  const acoesCerto = useAcoesCerto(aba, setFolha)
  // A lista vem separada por dia (como no extrato do Caju): a data fica no título do dia e a linha
  // mostra a categoria, o horário e, no Nubank, crédito ou débito.
  // No Caju, no lugar da categoria aparece a carteira de onde saiu (como no extrato do Caju).
  const nomeDaCarteira = (item: Certo | Gasto) => CARTEIRAS.find((c) => c.id === carteiraDe(item))!.nome
  const detalheDoDia = (item: Certo | Gasto) =>
    [
      aba === 'caju' ? nomeDaCarteira(item) : item.categoria,
      !('chave' in item) && item.hora,
      'chave' in item && etiquetaCerto(item),
      !('chave' in item) && item.mes_conta && item.mes_conta !== mesDe(item.data) && `conta em ${nomeDoMes(item.mes_conta)}`,
    ]
      .filter(Boolean)
      .join(' · ')
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
            detalhe={detalheDoDia(item)}
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
            hora={null}
            detalhe={detalheDoDia(item)}
            aoAlternarPago={() => executar(() => definirPago(item, !item.pago))}
          />
        </ItemDeslizavel>
      </li>
    )

  const depositos = aba === 'caju' ? depositosDoMes(dados, mes) : []
  const recebido = dados.recebidos.find((r) => r.mes === mes)?.valor_centavos ?? 0

  const folhas = (
    <>
      {folha && <FolhaGasto modo={folha} aoFechar={() => setFolha(null)} />}
      {editandoLimites && <FolhaLimites aba={aba} aoFechar={() => setEditandoLimites(false)} />}
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
        <FolhaDeposito
          dataInicial={mes === mesDe(hoje) ? hoje : dataNoMes(mes, diaDe(hoje))}
          aoSalvar={(depositos, data, mesConta) =>
            executar(async () => {
              for (const d of depositos) {
                await repo.criarDeposito({ aba: 'caju', data, valor_centavos: d.valor, mes_conta: mesConta, carteira: d.carteira })
              }
            })
          }
          aoFechar={() => setFolhaValor(null)}
        />
      )}
    </>
  )

  if (detalhado) {
    return (
      <div className={`pagina pagina-${aba}`}>
        <header className="topo">
          <div className="topo-linha">
            <Link to={`/${aba}`} className="voltar">
              <IconeAnterior tamanho={18} /> {NOMES[aba]}
            </Link>
          </div>
          <h1>Detalhes</h1>
          <div className="topo-linha">
            <SeletorMes />
          </div>
        </header>

        {aba === 'nubank' ? (
          <CardNubank aoEditarRecebido={() => setFolhaValor('recebido')} />
        ) : (
          <CardCajuPrincipal aoDepositar={() => setFolhaValor('deposito')} />
        )}

        <CardTelemetria
          aba={aba}
          aoLancar={(valor, parcelas) => setFolha({ aba, origem: 'topo', sugestao: { valor_centavos: valor, parcelas } })}
        />
        <nav className="atalhos" aria-label="Atalhos">
          <Link to={`/${aba}/resumo`} className="atalho">
            <IconeResumo tamanho={16} />
            <span>Resumo</span>
          </Link>
          <button type="button" className="atalho" onClick={() => setEditandoLimites(true)}>
            <IconeLimite tamanho={16} />
            <span>Limites</span>
          </button>
          <Link to={`/${aba}/para-onde`} className="atalho">
            <IconeCategoria nome="Compras" tamanho={16} />
            <span>Categorias</span>
          </Link>
          <Link to="/assinaturas" className="atalho">
            <IconeAssinatura tamanho={16} />
            <span>Assinaturas</span>
          </Link>
          <Link to="/busca" className="atalho">
            <IconeBusca tamanho={16} />
            <span>Buscar</span>
          </Link>
        </nav>

        <CardLimites aba={aba} aoEditar={() => setEditandoLimites(true)} />

        <CardPagamentos certos={certos} outros={outros} />

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
                        detalhe={[
                          CARTEIRAS.find((c) => c.id === (d.carteira ?? 'refeicao'))!.nome,
                          mesDe(d.data) !== mes && `caiu em ${dataCurta(d.data)}`,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                        positivo
                        icone="Depósito"
                      />
                    </ItemDeslizavel>
                  </li>
                ))}
            </ul>
          </section>
        )}

        {folhas}
      </div>
    )
  }

  return (
    <div className={`pagina pagina-${aba}`}>
      <Topo aba={aba} titulo={NOMES[aba]} aoAdicionar={() => setFolha({ aba, origem: 'topo' })} detalhes={`/${aba}/detalhes`} />

      <ResumoSimples aba={aba} aoDepositar={() => setFolhaValor('deposito')} aoEditarRecebido={() => setFolhaValor('recebido')} />

      <section className="secao">
        <h2>
          Gastos de {nomeDoMes(mes)} <span>{formatarReais(totalDoMes)}</span>
        </h2>
        {carregando ? (
          <p className="vazio">Carregando…</p>
        ) : normais.length === 0 ? (
          <p className="vazio">Nenhum gasto em {nomeDoMes(mes)}. Toque no + lá em cima para registrar o que comprou.</p>
        ) : (
          <ListaPorDia itens={normais} linha={linha} />
        )}
        {itens.length > 0 && <p className="dica">Deslize um gasto para a esquerda para editar ou apagar.</p>}
      </section>

      {aParte.length > 0 && (
        <section className="secao secao-a-parte">
          <h2>
            À parte <span>{formatarReais(totalAParte)}</span>
          </h2>
          <ListaPorDia itens={aParte} linha={linha} />
          <p className="dica">Não somam com os gastos do mês, mas descontam do livre para gastar.</p>
        </section>
      )}

      {folhas}
    </div>
  )
}

/** Topo da tela simples: o que ainda tem (pequeno) e, no Caju, quanto tem em cada carteira. */
function ResumoSimples({ aba, aoDepositar, aoEditarRecebido }: { aba: Aba; aoDepositar: () => void; aoEditarRecebido: () => void }) {
  const { dados, hoje, mes } = useEstado()
  if (aba === 'nubank') {
    const r = resumoNubank(dados, mes, hoje)
    return (
      <section className="resumo-simples-card">
        <div className="resumo-simples-total">
          <small>Livre para gastar</small>
          <strong className={r.livre < 0 ? 'negativo-texto' : undefined}>{formatarReais(r.livre)}</strong>
        </div>
        {r.recebido > 0 ? (
          <div className="resumo-simples-partes">
            <div>
              <small>Gasto</small>
              <span>{formatarReais(r.certos.total + r.outros + r.aParte)}</span>
            </div>
            <div>
              <small>Recebido</small>
              <span>{formatarReais(r.recebido)}</span>
            </div>
          </div>
        ) : (
          <button type="button" className="botao-texto" onClick={aoEditarRecebido}>
            Colocar o recebido do mês
          </button>
        )}
      </section>
    )
  }
  const c = cardCaju(dados, mes, hoje)
  const temDeposito = depositosDoMes(dados, mes).length > 0
  return (
    <section className="resumo-simples-card">
      <div className="resumo-simples-total">
        <small>{c.modo === 'passado' ? `Sobrou em ${nomeDoMes(mes)}` : 'Saldo no Caju'}</small>
        <strong className={c.saldo < 0 ? 'negativo-texto' : undefined}>{formatarReais(c.saldo)}</strong>
      </div>
      {temDeposito ? (
        <div className="resumo-simples-partes">
          {c.carteiras.map((x) => (
            <div key={x.carteira}>
              <small>{x.nome}</small>
              <span className={x.saldo < 0 ? 'negativo-texto' : undefined}>{formatarReais(x.saldo)}</span>
            </div>
          ))}
        </div>
      ) : (
        <button type="button" className="botao-texto" onClick={aoDepositar}>
          Registrar o depósito do mês
        </button>
      )}
    </section>
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
      {r.dinheiroAParte > 0 && (
        <p className="card-principal-nota">Pago com dinheiro à parte: {formatarReais(r.dinheiroAParte)} (fora da conta)</p>
      )}
      <div className="card-principal-rodape">
        <button type="button" className="recebido" onClick={aoEditarRecebido}>
          <small>Recebido</small>
          <strong>
            {formatarReais(r.recebido)} <IconeLapis tamanho={13} />
          </strong>
        </button>
      </div>
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
              <strong>{formatarReais(c.porDia)}</strong> por dia · {c.diasRestantes} {c.diasRestantes === 1 ? 'dia' : 'dias'} até o fim do mês
            </>
          )}
        </p>
      )}
      {c.modo === 'futuro' && (
        <p className="aviso-por-dia">Depósitos que valem para {nomeDoMes(mes)} menos os gastos já previstos nele.</p>
      )}
      <div className="carteiras-caju">
        {c.carteiras.map((x) => (
          <div key={x.carteira} className="carteira-caju">
            <small>{x.nome}</small>
            <strong className={x.saldo < 0 ? 'negativo' : undefined}>{formatarReais(x.saldo)}</strong>
            {c.modo === 'atual' && <span>{x.porDia === null ? 'acabou' : `${formatarReais(x.porDia)}/dia`}</span>}
          </div>
        ))}
      </div>
      <div className="card-principal-rodape">
        <button type="button" className="botao-claro" onClick={aoDepositar}>
          + Registrar depósito
        </button>
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

/** Os gastos separados por dia, com a data no título (do mais recente para o mais antigo). */
function ListaPorDia({ itens, linha }: { itens: (Certo | Gasto)[]; linha: (item: Certo | Gasto) => React.ReactNode }) {
  const dias = new Map<string, (Certo | Gasto)[]>()
  for (const item of itens) dias.set(item.data, [...(dias.get(item.data) ?? []), item])
  const horaDe = (i: Certo | Gasto) => ('chave' in i ? '' : (i.hora ?? ''))
  return (
    <div className="lista-por-dia">
      {[...dias.entries()]
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([data, doDia]) => (
          <section key={data} className="dia-grupo">
            <h3 className="dia-titulo">{dataPorExtenso(data)}</h3>
            <ul className="lista lista-dia">{[...doDia].sort((a, b) => horaDe(b).localeCompare(horaDe(a))).map(linha)}</ul>
          </section>
        ))}
    </div>
  )
}

/** "9 de novembro de 2026". */
function dataPorExtenso(data: string): string {
  const [ano, mes, dia] = data.split('-')
  return `${Number(dia)} de ${nomeDoMes(`${ano}-${mes}`)} de ${ano}`
}
