import { describe, expect, it } from 'vitest'
import { precisaBackup } from './backup'

describe('lembrete de backup', () => {
  it('avisa quando nunca fez ou faz 30 dias ou mais', () => {
    expect(precisaBackup(null, '2026-11-26')).toBe(true)
    expect(precisaBackup('2026-11-01', '2026-11-26')).toBe(false)
    expect(precisaBackup('2026-10-27', '2026-11-26')).toBe(true)
  })
})
