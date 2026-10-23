import { Link } from 'react-router-dom'
import { IconeSeta } from '../componentes/icones'
import { BotaoMenu } from '../componentes/MenuLateral'
import { GITHUB_USUARIO, PROJETOS, urlGithub } from './projetos'

export default function PaginaProjetos() {
  return (
    <div className="pagina">
      <header className="topo">
        <div className="topo-com-menu">
          <BotaoMenu />
          <h1>Projetos</h1>
        </div>
      </header>

      <a href={urlGithub()} target="_blank" rel="noopener noreferrer" className="card perfil-github">
        <img src={`https://github.com/${GITHUB_USUARIO}.png?size=160`} alt="" width={64} height={64} />
        <span>
          <strong>Lucas Henrique</strong>
          <small>github.com/{GITHUB_USUARIO}</small>
        </span>
        <span className="botao-github">
          GitHub <IconeSeta tamanho={14} />
        </span>
      </a>

      <section className="secao">
        <h2>
          Apps <span>{PROJETOS.length}</span>
        </h2>
        <div className="lista-projetos">
          {PROJETOS.map((p) => (
            <article key={p.repo} className="card card-projeto" style={{ '--cor-projeto': p.cor } as React.CSSProperties}>
              <Link to={`/projetos/${p.repo}`} className="card-projeto-corpo">
                <span className="projeto-marca" aria-hidden="true">
                  {p.nome[0]}
                </span>
                <span>
                  <strong>{p.nome}</strong>
                  <small>{p.repo}</small>
                </span>
              </Link>
              <p>{p.resumo}</p>
              <div className="chips">
                {p.tecnologias.map((t) => (
                  <span key={t} className="chip chip-fixo">
                    {t}
                  </span>
                ))}
              </div>
              <div className="botoes-disciplina">
                <Link to={`/projetos/${p.repo}`} className="botao-secundario">
                  README
                </Link>
                <a href={urlGithub(p.repo)} target="_blank" rel="noopener noreferrer" className="botao-secundario">
                  Código
                </a>
                {p.site && (
                  <a href={p.site} target="_blank" rel="noopener noreferrer" className="botao-secundario">
                    Abrir app
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
