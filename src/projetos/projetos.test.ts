import { describe, expect, it } from 'vitest'
import { readmeParaHtml, urlReadme } from './projetos'

describe('README dos projetos', () => {
  it('troca imagens e links relativos por endereços do GitHub', () => {
    const html = readmeParaHtml(
      '# Título\n\n![Telas](docs/telas/app.png)\n\nVeja [o código](src/data/repo.ts) e [a pasta](./supabase).',
      'APP-DOCERIA',
    )
    expect(html).toContain('<h1>Título</h1>')
    expect(html).toContain('src="https://raw.githubusercontent.com/lucashsjc/APP-DOCERIA/main/docs/telas/app.png"')
    expect(html).toContain('href="https://github.com/lucashsjc/APP-DOCERIA/blob/main/src/data/repo.ts"')
    expect(html).toContain('href="https://github.com/lucashsjc/APP-DOCERIA/blob/main/supabase"')
  })

  it('mantém endereços completos e âncoras', () => {
    const html = readmeParaHtml(
      '![TS](https://img.shields.io/badge/TS-blue) [site](https://vercel.com) [topo](#titulo) [e-mail](mailto:a@b.c)',
      'APP-GASTOS',
    )
    expect(html).toContain('src="https://img.shields.io/badge/TS-blue"')
    expect(html).toContain('href="https://vercel.com"')
    expect(html).toContain('href="#titulo"')
    expect(html).toContain('href="mailto:a@b.c"')
  })

  it('também ajusta imagens escritas em HTML e mantém tabelas e <details>', () => {
    const html = readmeParaHtml(
      '<img src="public/icone.svg" width="64">\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\n<details><summary>Mais</summary>\n\ntexto\n\n</details>',
      'APP-GASTOS',
    )
    expect(html).toContain('src="https://raw.githubusercontent.com/lucashsjc/APP-GASTOS/main/public/icone.svg"')
    expect(html).toContain('<table>')
    expect(html).toContain('<summary>Mais</summary>')
  })

  it('endereço do README no GitHub', () => {
    expect(urlReadme('APP-GASTOS')).toBe('https://raw.githubusercontent.com/lucashsjc/APP-GASTOS/main/README.md')
  })
})
