/** Rotas que pertencem à área Banco (Nubank e Caju). */
export function ehAreaBanco(caminho: string): boolean {
  return /^\/(nubank|caju)(\/|$)/.test(caminho)
}
