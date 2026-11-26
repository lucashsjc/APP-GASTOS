// Lembrete de backup: guarda (só neste aparelho) o dia do último backup baixado e avisa no Hoje
// quando passa de 30 dias. Testes em backup.test.ts.

import { diasEntre } from './datas'

const CHAVE = 'ultimo-backup'

export function lerUltimoBackup(): string | null {
  try {
    return localStorage.getItem(CHAVE)
  } catch {
    return null
  }
}

export function marcarBackup(hoje: string) {
  try {
    localStorage.setItem(CHAVE, hoje)
  } catch {
    /* sem localStorage: só não lembra */
  }
}

/** Precisa de backup: nunca fez neste aparelho, ou o último foi há 30 dias ou mais. */
export function precisaBackup(ultimo: string | null, hoje: string): boolean {
  return !ultimo || diasEntre(ultimo, hoje) >= 30
}
