import { Link } from 'react-router-dom'
import { IconeProximo, Logo } from '../componentes/icones'
import { BotaoMenu } from '../componentes/MenuLateral'
import { useEstado } from '../estado'
import { useFaculdade } from '../faculdade/estado'
import { aulasDoDia, formatarNota, prazoAtividade, provasProximas } from '../faculdade/regras'
import { repoFaculdade } from '../faculdade/repo'
import { cardCaju, resumoNubank } from '../lib/calculos'
import { mesDe } from '../lib/datas'
import { formatarReais } from '../lib/dinheiro'
import { alertasFaculdade, atividadesUrgentes, dataPorExtenso, saudacao } from './resumo'

/** Tela inicial: o resumo do dia (dinheiro, o que vai cair e a faculdade). */
export default function PaginaHoje() {
  const { dados, hoje } = useEstado()
  const faculdade = useFaculdade()
  const livre = resumoNubank(dados, mesDe(hoje), hoje).livre
  const caju = cardCaju(dados, mesDe(hoje), hoje)
  const atividades = atividadesUrgentes(faculdade.dados.atividades, hoje)
  const aulas = aulasDoDia(faculdade.dados.aulas, hoje)
  const provas = provasProximas(faculdade.dados, hoje)
  // O aviso de nota não se repete quando a prova da matéria já aparece na lista.
  const comProva = new Set(provas.filter((p) => p.precisa !== null).map((p) => p.disciplina?.id))
  const alertas = alertasFaculdade(faculdade.dados).filter((a) => !(a.tipo === 'nota' && comProva.has(a.disciplina.id)))
  const semFaculdade = !faculdade.carregando && !faculdade.erro && !faculdade.dados.disciplinas.length && !faculdade.dados.atividades.length

  return (
    <div className="pagina pagina-hoje">
      <header className="topo">
        <div className="topo-com-menu">
          <BotaoMenu />
          <h1>{saudacao()}!</h1>
        </div>
        <p className="data-hoje">{dataPorExtenso(hoje)}</p>
      </header>

      <section className="hoje-dinheiro">
        <Link to="/nubank" className="hoje-cartao card-nubank">
          <span className="hoje-cartao-topo">
            <Logo aba="nubank" tamanho={22} /> Livre no mês
          </span>
          <strong className={livre < 0 ? 'negativo' : undefined}>{formatarReais(livre)}</strong>
          <small>Nubank</small>
        </Link>
        <Link to="/caju" className="hoje-cartao card-caju">
          <span className="hoje-cartao-topo">
            <Logo aba="caju" tamanho={22} /> Saldo
          </span>
          <strong className={caju.saldo < 0 ? 'negativo' : undefined}>{formatarReais(caju.saldo)}</strong>
          <small>
            {caju.modo === 'atual' && caju.porDia !== null ? `${formatarReais(caju.porDia)} por dia` : 'Saldo esgotado'}
          </small>
        </Link>
      </section>

      <section className="secao">
        <h2>
          Faculdade
          <Link to="/faculdade/calendario" className="link-secao">
            Abrir <IconeProximo tamanho={14} />
          </Link>
        </h2>

        {faculdade.erro ? (
          <p className="vazio">A Faculdade ainda não está configurada no banco.</p>
        ) : semFaculdade ? (
          <Link to="/faculdade" className="card vazio-link">
            Cadastre suas disciplinas e atividades para ver aqui o que vence e os avisos de notas e faltas.
          </Link>
        ) : (
          <>
            {aulas.length > 0 && (
              <Link to="/faculdade/faltas" className="card hoje-aulas">
                <small>Aulas de hoje</small>
                <span>
                  {aulas.map((a) => {
                    const d = faculdade.dados.disciplinas.find((x) => x.id === a.disciplina_id)
                    return (
                      <span key={a.id} className="hoje-aula">
                        <i className="ponto" style={{ background: d?.cor }} />
                        {a.inicio && <b>{a.inicio}</b>} {d?.nome}
                      </span>
                    )
                  })}
                </span>
              </Link>
            )}

            {provas.length > 0 && (
              <ul className="lista">
                {provas.map((p) => (
                  <li key={p.nota.id}>
                    <Link to="/faculdade/calendario" className="linha-atividade">
                      <span className="etiqueta-prova">Prova</span>
                      <span className="linha-texto">
                        <strong>
                          {p.nota.descricao}
                          {p.disciplina && ` · ${p.disciplina.nome}`}
                        </strong>
                        <small>{p.precisa !== null ? `Precisa de ${formatarNota(p.precisa)} para passar` : 'Bons estudos!'}</small>
                      </span>
                      <span className={`prazo prazo-${p.dias <= 3 ? 'hoje' : 'perto'}`}>
                        {p.dias === 0 ? 'Hoje' : p.dias === 1 ? 'Amanhã' : `Em ${p.dias} dias`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {atividades.length > 0 ? (
              <ul className="lista">
                {atividades.map((a) => {
                  const disc = faculdade.dados.disciplinas.find((d) => d.id === a.disciplina_id)
                  const prazo = prazoAtividade(a, hoje)
                  return (
                    <li key={a.id}>
                      <div className="linha-atividade">
                        <button
                          type="button"
                          className="marcar"
                          aria-label="Marcar como entregue"
                          onClick={() => faculdade.executar(() => repoFaculdade.atualizar('atividades', a.id, { feita: true }))}
                        />
                        <Link to="/faculdade/calendario" className="linha-texto">
                          <strong>{a.titulo}</strong>
                          <small>
                            {disc && (
                              <>
                                <i className="ponto" style={{ background: disc.cor }} /> {disc.nome}
                              </>
                            )}
                          </small>
                        </Link>
                        <span className={`prazo prazo-${prazo.nivel}`}>{prazo.texto}</span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="vazio">Nenhuma atividade para os próximos 7 dias.</p>
            )}

            {alertas.length > 0 && (
              <ul className="lista lista-alertas">
                {alertas.map((al) => (
                  <li key={`${al.tipo}-${al.disciplina.id}`}>
                    <Link
                      to={al.tipo === 'faltas' ? '/faculdade/faltas' : '/faculdade/notas'}
                      className={`alerta-linha${al.grave ? ' grave' : ''}`}
                    >
                      <i className="ponto ponto-grande" style={{ background: al.disciplina.cor }} />
                      <span>
                        <strong>{al.disciplina.nome}</strong>
                        <small>{al.texto}</small>
                      </span>
                      <IconeProximo tamanho={16} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  )
}
