import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { IconeAnterior, IconeProximo } from '../componentes/icones'
import { Valor } from '../componentes/Valor'
import { repo } from '../data/repo'
import { useEstado } from '../estado'
import { mesDe, nomeDoMes, somarMeses, tituloDoMes } from '../lib/datas'
import { formatarReais } from '../lib/dinheiro'
import { fechamentoDoMes } from '../lib/fechamento'
import { FolhaGuardar } from './Cofrinho'

/** Fechamento do mês: quanto entrou, quanto saiu e o que sobrou, com o botão para guardar a sobra. */
export default function Fechamento() {
  const { dados, hoje, executar, avisar } = useEstado()
  const navegar = useNavigate()
  const [params, setParams] = useSearchParams()
  const atual = mesDe(hoje)
  const pedido = params.get('mes')
  const mes = pedido && /^\d{4}-\d{2}$/.test(pedido) && pedido <= atual ? pedido : somarMeses(atual, -1)
  const [confirmando, setConfirmando] = useState(false)
  const [outroValor, setOutroValor] = useState(false)
  const f = fechamentoDoMes(dados, mes, hoje)
  const emAndamento = mes === atual
  const irPara = (m: string) => {
    setConfirmando(false)
    setParams({ mes: m }, { replace: true })
  }

  const guardarTudo = async () => {
    setConfirmando(false)
    const ok = await executar(() =>
      repo.criarGuardado({ mes, valor_centavos: f.nubank.sobra, tipo: 'guardar', descricao: `Sobra de ${nomeDoMes(mes)}` }),
    )
    if (ok) avisar(`${formatarReais(f.nubank.sobra)} de ${nomeDoMes(mes)} foram para o cofrinho.`)
  }

  const linha = (rotulo: string, valor: string, classe?: string) => (
    <div className="fechamento-linha">
      <span>{rotulo}</span>
      <strong className={classe}>{valor}</strong>
    </div>
  )

  return (
    <div className="pagina pagina-fechamento">
      <header className="topo">
        <div className="topo-linha">
          <button type="button" className="voltar" onClick={() => navegar(-1)}>
            <IconeAnterior tamanho={18} /> Voltar
          </button>
        </div>
        <h1>Fechamento do mês</h1>
        <div className="seletor-mes fechamento-mes">
          <button type="button" onClick={() => irPara(somarMeses(mes, -1))} aria-label="Mês anterior">
            <IconeAnterior tamanho={18} />
          </button>
          <span className="seletor-mes-nome">{tituloDoMes(mes, atual)}</span>
          <button type="button" onClick={() => irPara(somarMeses(mes, 1))} disabled={mes >= atual} aria-label="Próximo mês">
            <IconeProximo tamanho={18} />
          </button>
        </div>
      </header>

      {emAndamento && <p className="nota fechamento-aviso">{nomeDoMes(mes)} ainda não acabou: os números são até hoje.</p>}

      <section className="card-principal card-nubank fechamento-sobra">
        <span className="resumo-rotulo">{emAndamento ? 'Livre até agora no Nubank' : `Sobrou em ${nomeDoMes(mes)} no Nubank`}</span>
        {f.temRecebido ? <Valor centavos={f.nubank.sobra} /> : <strong className="fechamento-sem">Sem recebido</strong>}
        {!f.temRecebido ? (
          <p className="cofrinho-nota">Coloque o recebido de {nomeDoMes(mes)} no Nubank para ver quanto sobrou.</p>
        ) : f.nubank.sobra > 0 && !emAndamento ? (
          confirmando ? (
            <div className="confirmar-pagamento">
              <span>
                Mandar {formatarReais(f.nubank.sobra)} para o cofrinho? Sai do livre de {nomeDoMes(mes)}.
              </span>
              <div>
                <button type="button" className="botao-texto" onClick={() => setConfirmando(false)}>
                  Não
                </button>
                <button type="button" className="botao-confirmar" onClick={guardarTudo}>
                  Guardar
                </button>
              </div>
            </div>
          ) : (
            <div className="cofrinho-botoes">
              <button type="button" className="botao-principal botao-nubank" onClick={() => setConfirmando(true)}>
                Guardar tudo
              </button>
              <button type="button" className="botao-secundario" onClick={() => setOutroValor(true)}>
                Só uma parte
              </button>
            </div>
          )
        ) : (
          !emAndamento && (
            <p className="cofrinho-nota">
              {f.nubank.guardado > 0
                ? `Tudo certo: ${formatarReais(f.nubank.guardado)} de ${nomeDoMes(mes)} estão no cofrinho.`
                : `Não sobrou nada em ${nomeDoMes(mes)}.`}
            </p>
          )
        )}
      </section>

      <section className="card fechamento-bloco">
        <h2>Nubank</h2>
        {linha('Recebido', formatarReais(f.nubank.recebido))}
        {linha('Gastou', `−${formatarReais(f.nubank.gasto)}`)}
        {linha('Guardou no cofrinho', `−${formatarReais(f.nubank.guardado)}`)}
        {f.temRecebido && linha(emAndamento ? 'Livre' : 'Sobrou', formatarReais(f.nubank.sobra), 'positivo')}
        {f.nubank.variacao !== null && (
          <p className={`fechamento-comparacao ${f.nubank.variacao > 0 ? 'ruim' : 'bom'}`}>
            {f.nubank.variacao > 0 ? '▲' : '▼'} Gastou {Math.abs(f.nubank.variacao)}% {f.nubank.variacao > 0 ? 'a mais' : 'a menos'} que em{' '}
            {nomeDoMes(somarMeses(mes, -1))}
          </p>
        )}
        {f.nubank.campea && (
          <p className="nota">
            Onde mais gastou: <b>{f.nubank.campea.categoria}</b> ({formatarReais(f.nubank.campea.total)}, {f.nubank.campea.percentual}%)
          </p>
        )}
        {f.fatura.total > 0 && (
          <p className="nota">
            Fatura de {nomeDoMes(mes)}: {formatarReais(f.fatura.total)} · {f.fatura.paga ? 'paga' : 'ainda não paga'}
          </p>
        )}
      </section>

      <section className="card fechamento-bloco">
        <h2>Caju</h2>
        {linha('Depositado', formatarReais(f.caju.depositado))}
        {linha('Gastou', `−${formatarReais(f.caju.gasto)}`)}
        {linha(emAndamento ? 'Saldo' : 'Ficou no Caju', formatarReais(f.caju.saldo), f.caju.saldo < 0 ? 'negativo-texto' : undefined)}
        {f.caju.campea && (
          <p className="nota">
            Onde mais gastou: <b>{f.caju.campea.categoria}</b> ({formatarReais(f.caju.campea.total)})
          </p>
        )}
      </section>

      <Link to="/cofrinho" className="card link-fixos">
        <span>
          <strong>Abrir o Cofrinho</strong>
          <small>Ver tudo o que está guardado e a meta do mês.</small>
        </span>
        <IconeProximo tamanho={18} />
      </Link>

      {outroValor && <FolhaGuardar tipo="guardar" mesInicial={mes} aoFechar={() => setOutroValor(false)} />}
    </div>
  )
}
