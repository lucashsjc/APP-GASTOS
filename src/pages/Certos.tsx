import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FolhaGasto, type ModoGasto } from '../componentes/FolhaGasto'
import { IconeAnterior, IconeMais } from '../componentes/icones'
import { ItemDeslizavel } from '../componentes/ItemDeslizavel'
import { LinhaGasto } from '../componentes/LinhaGasto'
import { SeletorMes } from '../componentes/SeletorMes'
import { aplicarPlanoRecorrencia, alternarCaiu, definirPago } from '../data/acoes'
import { repo } from '../data/repo'
import type { Aba } from '../data/types'
import { useEstado } from '../estado'
import { certosDoMes, planejarEncerramento, resumirCertos, type Certo, type GrupoCerto } from '../lib/calculos'
import { mesDe, nomeDoMes, somarMeses } from '../lib/datas'
import { formatarReais } from '../lib/dinheiro'

const GRUPOS: { id: GrupoCerto; titulo: string }[] = [
  { id: 'todo_mes', titulo: 'Todo mês' },
  { id: 'parcelas', titulo: 'Parcelas' },
  { id: 'so_este_mes', titulo: 'Só este mês' },
]

export default function Certos({ aba }: { aba: Aba }) {
  const { dados, hoje, mes, executar } = useEstado()
  const [folha, setFolha] = useState<ModoGasto | null>(null)
  const certos = certosDoMes(dados, aba, mes, hoje)
  const resumo = resumirCertos(certos)
  const mesAtual = mesDe(hoje)

  const editar = (c: Certo) => setFolha(c.recorrencia ? { aba, recorrencia: c.recorrencia } : { aba, gasto: c.gasto! })

  /** Para um "todo mês", apagar = encerrar: os meses que já valeram não mudam. */
  const encerramento = (c: Certo) => {
    const r = c.recorrencia!
    const aPartirDe = mes > mesAtual ? mes : mesAtual
    const ocorrencia = certosDoMes(dados, aba, aPartirDe, hoje).find((x) => x.recorrencia?.id === r.id)
    const ultimoMes = ocorrencia?.caiu ? aPartirDe : somarMeses(aPartirDe, -1)
    return { ultimoMes, plano: planejarEncerramento(dados, r, ultimoMes) }
  }

  const pergunta = (c: Certo) => {
    if (c.recorrencia) {
      const { ultimoMes, plano } = encerramento(c)
      return plano.excluir
        ? `Apagar “${c.descricao}”? Ele ainda não tinha caído nenhuma vez.`
        : `Parar de contar “${c.descricao}” a partir de ${nomeDoMes(somarMeses(ultimoMes, 1))}? Os meses anteriores não mudam.`
    }
    if (c.grupo === 'parcelas') {
      const n = dados.gastos.filter((g) => g.grupo_id && g.grupo_id === c.gasto?.grupo_id).length
      return n > 1 ? `Apagar a compra “${c.descricao}” inteira (${n} parcelas)?` : `Apagar esta parcela de “${c.descricao}”?`
    }
    return `Apagar “${c.descricao}” (${formatarReais(c.valor_centavos)})?`
  }

  const apagar = (c: Certo) =>
    executar(async () => {
      if (c.recorrencia) return aplicarPlanoRecorrencia(c.recorrencia, encerramento(c).plano)
      const g = c.gasto!
      const ids = g.grupo_id ? dados.gastos.filter((x) => x.grupo_id === g.grupo_id).map((x) => x.id) : [g.id]
      return repo.excluirGastos(ids)
    })

  // Só faz sentido marcar à mão o que ainda não caiu pela data (ou desmarcar o que foi marcado).
  const podeAlternar = (c: Certo) => c.data > hoje

  return (
    <div className={`pagina pagina-${aba}`}>
      <header className="topo">
        <div className="topo-linha">
          <Link to={`/${aba}`} className="voltar">
            <IconeAnterior tamanho={18} /> {aba === 'nubank' ? 'Nubank' : 'Caju'}
          </Link>
        </div>
        <h1>Certos do mês</h1>
        <div className="topo-linha">
          <SeletorMes />
          <button
            type="button"
            className={`botao-mais botao-${aba}`}
            onClick={() => setFolha({ aba, origem: 'certos' })}
            aria-label="Novo gasto certo"
          >
            <IconeMais tamanho={20} />
          </button>
        </div>
      </header>

      <section className="card resumo-certos">
        <div>
          <small>Total</small>
          <strong>{formatarReais(resumo.total)}</strong>
        </div>
        <div>
          <small>
            <i className="ponto ponto-caiu" /> Já caiu
          </small>
          <strong className="positivo">{formatarReais(resumo.jaCaiu)}</strong>
        </div>
        <div>
          <small>
            <i className="ponto ponto-vai-cair" /> Vai cair
          </small>
          <strong className="alerta">{formatarReais(resumo.vaiCair)}</strong>
        </div>
      </section>

      {certos.length === 0 && (
        <p className="vazio">
          Nenhum gasto certo em {nomeDoMes(mes)}. Toque no + para adicionar um gasto de todo mês, parcelado ou só deste
          mês.
        </p>
      )}

      {GRUPOS.map(({ id, titulo }) => {
        const itens = certos.filter((c) => c.grupo === id)
        if (!itens.length) return null
        return (
          <section className="secao" key={id}>
            <h2>
              {titulo} <span>{formatarReais(itens.reduce((s, c) => s + c.valor_centavos, 0))}</span>
            </h2>
            <ul className="lista">
              {itens.map((c) => (
                <li key={c.chave}>
                  <ItemDeslizavel
                    pergunta={pergunta(c)}
                    rotuloApagar={c.recorrencia ? 'Encerrar' : 'Apagar'}
                    aoEditar={() => editar(c)}
                    aoApagar={() => apagar(c)}
                    aoTocar={() => editar(c)}
                  >
                    <LinhaGasto
                      {...c}
                      forma={aba === 'nubank' ? c.forma : null}
                      detalhe={c.parcela_numero ? `${c.parcela_numero} de ${c.parcela_total}` : undefined}
                      status={c.caiu ? 'caiu' : 'vai_cair'}
                      aoTocarStatus={podeAlternar(c) ? () => executar(() => alternarCaiu(c)) : undefined}
                      aoAlternarPago={() => executar(() => definirPago(c, !c.pago))}
                    />
                  </ItemDeslizavel>
                </li>
              ))}
            </ul>
          </section>
        )
      })}

      {certos.length > 0 && (
        <p className="dica">
          “Caiu” = data até hoje. Toque em “dia X” para marcar à mão como já caído. Deslize para editar ou apagar.
        </p>
      )}

      {folha && <FolhaGasto modo={folha} aoFechar={() => setFolha(null)} />}
    </div>
  )
}
