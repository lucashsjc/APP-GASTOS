import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FolhaGasto, type ModoGasto } from '../componentes/FolhaGasto'
import { IconeAnterior, IconeMais } from '../componentes/icones'
import { ItemDeslizavel } from '../componentes/ItemDeslizavel'
import { LinhaGasto } from '../componentes/LinhaGasto'
import { SeletorMes } from '../componentes/SeletorMes'
import { useAcoesCerto } from '../componentes/acoesCerto'
import { definirPago } from '../data/acoes'
import type { Aba } from '../data/types'
import { useEstado } from '../estado'
import { certosDoMes, type GrupoCerto } from '../lib/calculos'
import { nomeDoMes } from '../lib/datas'
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

  const acoes = useAcoesCerto(aba, setFolha)

  return (
    <div className={`pagina pagina-${aba}`}>
      <header className="topo">
        <div className="topo-linha">
          <Link to={`/${aba}`} className="voltar">
            <IconeAnterior tamanho={18} /> {aba === 'nubank' ? 'Nubank' : 'Caju'}
          </Link>
        </div>
        <h1>Fixos e parcelas</h1>
        <div className="topo-linha">
          <SeletorMes />
          <button
            type="button"
            className={`botao-mais botao-${aba}`}
            onClick={() => setFolha({ aba, origem: 'certos' })}
            aria-label="Novo fixo ou parcela"
          >
            <IconeMais tamanho={20} />
          </button>
        </div>
      </header>

      <section className="card resumo-certos resumo-simples">
        <div>
          <small>Total de fixos e parcelas em {nomeDoMes(mes)}</small>
          <strong>{formatarReais(certos.reduce((s, c) => s + c.valor_centavos, 0))}</strong>
        </div>
      </section>

      {certos.length === 0 && (
        <p className="vazio">
          Nenhum fixo ou parcela em {nomeDoMes(mes)}. Toque no + para adicionar um gasto de todo mês ou uma compra
          parcelada.
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
                    pergunta={acoes.pergunta(c)}
                    rotuloApagar={acoes.rotuloApagar(c)}
                    aoEditar={() => acoes.editar(c)}
                    aoApagar={() => acoes.apagar(c)}
                    aoTocar={() => acoes.editar(c)}
                  >
                    <LinhaGasto
                      {...c}
                      forma={aba === 'nubank' ? c.forma : null}
                      detalhe={c.parcela_numero ? `${c.parcela_numero} de ${c.parcela_total}` : undefined}
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
        <p className="dica">Eles entram sozinhos na lista de gastos de cada mês. Deslize para editar ou apagar.</p>
      )}

      {folha && <FolhaGasto modo={folha} aoFechar={() => setFolha(null)} />}
    </div>
  )
}
