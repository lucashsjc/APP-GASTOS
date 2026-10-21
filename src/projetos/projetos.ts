// Área Projetos: o perfil do GitHub e os apps publicados, com o README de cada um lido ao vivo
// do GitHub (os repositórios são públicos).

import { Marked } from 'marked'

export const GITHUB_USUARIO = 'lucashsjc'

export interface Projeto {
  /** Nome do repositório no GitHub. */
  repo: string
  nome: string
  resumo: string
  tecnologias: string[]
  /** Endereço do app publicado. */
  site: string | null
  cor: string
}

export const PROJETOS: Projeto[] = [
  {
    repo: 'APP-DOCERIA',
    nome: 'Ateliê Doce Festa',
    resumo: 'Gestão de pedidos para uma confeitaria real: agenda, clientes, pagamentos, cardápio em PDF e relatórios.',
    tecnologias: ['React 19', 'TypeScript', 'Supabase', 'Vercel', 'PWA'],
    site: 'https://app-doceria.vercel.app',
    cor: '#e46fd1',
  },
  {
    repo: 'APP-GASTOS',
    nome: 'Minha rotina (Gastos)',
    resumo: 'Controle dos cartões Nubank e Caju e da faculdade: livre do mês, saldo, notas, faltas e atividades.',
    tecnologias: ['React 19', 'TypeScript', 'Vitest', 'Supabase', 'PWA'],
    site: 'https://app-gastos-tan-alpha.vercel.app',
    cor: '#8a2be2',
  },
]

export function urlGithub(repo?: string): string {
  return `https://github.com/${GITHUB_USUARIO}${repo ? `/${repo}` : ''}`
}

export function urlReadme(repo: string): string {
  return `https://raw.githubusercontent.com/${GITHUB_USUARIO}/${repo}/main/README.md`
}

const marked = new Marked({ gfm: true })

/**
 * Converte o README (Markdown) em HTML, trocando os caminhos relativos por endereços do GitHub:
 * imagens vêm do raw.githubusercontent.com e links abrem o arquivo no github.com.
 * O HTML ainda precisa passar pelo DOMPurify antes de ir para a tela.
 */
export function readmeParaHtml(markdown: string, repo: string): string {
  const html = marked.parse(markdown, { async: false })
  const relativo = (url: string) => !/^([a-z][a-z0-9+.-]*:|\/\/|#)/i.test(url)
  const limpar = (url: string) => url.replace(/^\.\//, '').replace(/^\//, '')
  return html
    .replace(/(<img\b[^>]*\bsrc=")([^"]+)"/g, (tudo, inicio: string, url: string) =>
      relativo(url) ? `${inicio}https://raw.githubusercontent.com/${GITHUB_USUARIO}/${repo}/main/${limpar(url)}"` : tudo,
    )
    .replace(/(<a\b[^>]*\bhref=")([^"]+)"/g, (tudo, inicio: string, url: string) =>
      relativo(url) ? `${inicio}${urlGithub(repo)}/blob/main/${limpar(url)}"` : tudo,
    )
}
