import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Folha } from '../componentes/Folha'
import { FolhaGasto } from '../componentes/FolhaGasto'
import { IconeAnterior, IconeMais } from '../componentes/icones'
import { ItemDeslizavel } from '../componentes/ItemDeslizavel'
import { repo } from '../data/repo'
import type { Desejo } from '../data/types'
import { useEstado } from '../estado'
import { resumoNubank } from '../lib/calculos'
import { planoDoDesejo, resumoCofrinho, type PlanoDesejo } from '../lib/cofrinho'
import { mesDe } from '../lib/datas'
import { formatarReais, lerReais, somar } from '../lib/dinheiro'

function textoDoPlano(p: PlanoDesejo): { texto: string; classe: string } {
  switch (p.tipo) {
    case 'cabe':
      return { texto: `Cabe no livre deste mês (sobram ${formatarReais(p.sobra)})`, classe: 'bom' }
    case 'cofrinho':
      return { texto: `Dá com o cofrinho (ficam ${formatarReais(p.sobraNoCofrinho)} guardados)`, classe: 'bom' }
    case 'meses':
      return {
        texto: `Faltam ${formatarReais(p.falta)}: guardando a meta, em ${p.meses} ${p.meses === 1 ? 'mês' : 'meses'}`,
        classe: 'medio',
      }
    case 'sem-meta':
      return { texto: `Faltam ${formatarReais(p.falta)}. Defina a meta no cofrinho para ver em quantos meses.`, classe: 'medio' }
  }
}

/** Compras futuras: o que quer comprar e se dá agora, com o cofrinho ou em quantos meses. */
export default function Desejos() {
  const { dados, hoje, executar } = useEstado()
  const navegar = useNavigate()
  const [novo, setNovo] = useState(false)
  const [comprando, setComprando] = useState<Desejo | null>(null)
  const desejos = dados.desejos ?? []
  const livre = resumoNubank(dados, mesDe(hoje), hoje).livre
  const cofre = resumoCofrinho(dados, hoje)

  return (
    <div className="pagina pagina-desejos">
      <header className="topo">
        <div className="topo-linha">
          <button type="button" className="voltar" onClick={() => navegar(-1)}>
            <IconeAnterior tamanho={18} /> Voltar
          </button>
          <button type="button" className="botao-mais botao-nubank" onClick={() => setNovo(true)} aria-label="Nova compra futura">
            <IconeMais tamanho={20} />
          </button>
        </div>
        <h1>Compras futuras</h1>
      </header>

      <section className="resumo-simples-card sem-total">
        <div className="resumo-simples-partes">
          <div>
            <small>Na lista</small>
            <span>{formatarReais(somar(desejos.map((d) => d.valor_centavos)))}</span>
          </div>
          <div>
            <small>Livre + cofrinho</small>
            <span>{formatarReais(Math.max(0, livre) + Math.max(0, cofre.total))}</span>
          </div>
        </div>
      </section>

      {desejos.length === 0 ? (
        <p className="vazio">Nada na lista. Toque no + para colocar o que você quer comprar.</p>
      ) : (
        <ul className="lista lista-desejos">
          {desejos.map((d) => {
            const plano = textoDoPlano(planoDoDesejo(d.valor_centavos, livre, cofre.total, cofre.meta))
            return (
              <li key={d.id}>
                <ItemDeslizavel
                  pergunta={`Tirar “${d.nome}” da lista?`}
                  aoApagar={() => executar(() => repo.excluirDesejo(d.id))}
                >
                  <div className="desejo">
                    <div className="desejo-info">
                      <strong>{d.nome}</strong>
                      <small className={plano.classe}>{plano.texto}</small>
                    </div>
                    <div className="desejo-lado">
                      <strong>{formatarReais(d.valor_centavos)}</strong>
                      <button type="button" className="botao-lancar" onClick={() => setComprando(d)}>
                        Comprei
                      </button>
                    </div>
                  </div>
                </ItemDeslizavel>
              </li>
            )
          })}
        </ul>
      )}
      {desejos.length > 0 && <p className="dica">Deslize para a esquerda para tirar da lista.</p>}

      {novo && <FolhaDesejo aoFechar={() => setNovo(false)} />}
      {comprando && (
        <FolhaGasto
          modo={{
            aba: 'nubank',
            origem: 'topo',
            sugestao: { valor_centavos: comprando.valor_centavos, parcelas: 1, descricao: comprando.nome },
          }}
          aoFechar={() => setComprando(null)}
          aoSalvar={() => executar(() => repo.excluirDesejo(comprando.id))}
        />
      )}
    </div>
  )
}

function FolhaDesejo({ aoFechar }: { aoFechar: () => void }) {
  const { executar } = useEstado()
  const [nome, setNome] = useState('')
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    const valor = lerReais(texto)
    if (!nome.trim()) return setErro('Coloque o nome do que você quer comprar.')
    if (!valor || valor <= 0) return setErro('Digite um valor válido.')
    if (await executar(() => repo.criarDesejo(nome.trim(), valor))) aoFechar()
  }

  return (
    <Folha titulo="Nova compra futura" aoFechar={aoFechar}>
      <form className="form-gasto" onSubmit={salvar} noValidate>
        <label className="campo-valor">
          <span>Quanto custa</span>
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
          <span>O que é</span>
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: tênis, PS5, viagem" />
        </label>
        {erro && <p className="erro">{erro}</p>}
        <button type="submit" className="botao-principal botao-nubank">
          Colocar na lista
        </button>
      </form>
    </Folha>
  )
}
