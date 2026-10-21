import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FolhaGasto, type ModoGasto } from '../componentes/FolhaGasto'
import { FolhaValor } from '../componentes/FolhaValor'
import { IconeLapis, IconeProximo, IconeSeta, Logo } from '../componentes/icones'
import { ItemDeslizavel } from '../componentes/ItemDeslizavel'
import { LinhaGasto } from '../componentes/LinhaGasto'
import { Topo } from '../componentes/Topo'
import { Valor } from '../componentes/Valor'
import { repo } from '../data/repo'
import type { Aba } from '../data/types'
import { useEstado } from '../estado'
import { cardCaju, certosDoMes, outrosDoMes, resumirCertos, resumoNubank, type ResumoCertos } from '../lib/calculos'
import { dataNoMes, diaDe, mesDe, nomeDoMes } from '../lib/datas'
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
  const [parametros, setParametros] = useSearchParams()

  // "Novo gasto" do menu lateral chega como ?novo=1.
  useEffect(() => {
    if (parametros.get('novo') !== '1') return
    setFolha({ aba, origem: 'topo' })
    setParametros({}, { replace: true })
  }, [parametros, setParametros, aba])

  const certos = certosDoMes(dados, aba, mes, hoje)
  const resumoCertos = resumirCertos(certos)
  const outros = outrosDoMes(dados, aba, mes)
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

      <CardCertos aba={aba} resumo={resumoCertos} quantidade={certos.length} />

      <section className="secao">
        <h2>{aba === 'nubank' ? 'Outros gastos' : 'Gastos do mês'}</h2>
        {carregando ? (
          <p className="vazio">Carregando…</p>
        ) : outros.length === 0 ? (
          <p className="vazio">Nenhum gasto de uma vez em {nomeDoMes(mes)}. Toque no + lá em cima para registrar.</p>
        ) : (
          <ul className="lista">
            {outros.map((g) => (
              <li key={g.id}>
                <ItemDeslizavel
                  pergunta={`Apagar “${g.descricao}” (${formatarReais(g.valor_centavos)})?`}
                  aoEditar={() => setFolha({ aba, gasto: g })}
                  aoApagar={() => executar(() => repo.excluirGastos([g.id]))}
                  aoTocar={() => setFolha({ aba, gasto: g })}
                >
                  <LinhaGasto {...g} forma={aba === 'nubank' ? g.forma : null} />
                </ItemDeslizavel>
              </li>
            ))}
          </ul>
        )}
        {outros.length > 0 && <p className="dica">Deslize um gasto para a esquerda para editar ou apagar.</p>}
      </section>

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
        <span style={{ width: porcento(r.certos.total, r.recebido) }} />
        <span className="barra-outros" style={{ width: porcento(r.outros, r.recebido) }} />
      </div>
      <div className="card-principal-legenda">
        <span>Certos {formatarReais(r.certos.total)}</span>
        <span>Outros {formatarReais(r.outros)}</span>
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
      {c.modo === 'futuro' && <p className="aviso-por-dia">Saldo de hoje menos os certos do Caju até lá.</p>}
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

function CardCertos({ aba, resumo, quantidade }: { aba: Aba; resumo: ResumoCertos; quantidade: number }) {
  return (
    <Link to={`/${aba}/certos`} className="card card-certos">
      <div className="card-certos-topo">
        <h2>Certos do mês</h2>
        <span>
          {formatarReais(resumo.total)} <IconeProximo tamanho={16} />
        </span>
      </div>
      {quantidade === 0 ? (
        <p className="vazio">Nenhum gasto certo neste mês. Toque para adicionar.</p>
      ) : (
        <>
          <div className="barra" aria-hidden="true">
            <span className="barra-caiu" style={{ width: porcento(resumo.jaCaiu, resumo.total) }} />
            <span className="barra-vai-cair" style={{ width: porcento(resumo.vaiCair, resumo.total) }} />
          </div>
          <div className="card-certos-legenda">
            <span>
              <i className="ponto ponto-caiu" /> Já caiu <strong>{formatarReais(resumo.jaCaiu)}</strong>
            </span>
            <span>
              <i className="ponto ponto-vai-cair" /> Vai cair <strong>{formatarReais(resumo.vaiCair)}</strong>
            </span>
          </div>
        </>
      )}
    </Link>
  )
}
