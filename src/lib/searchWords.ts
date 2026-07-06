// Aramada imza tarafından tüketilmeyen serbest kelimeleri çıkarır
// (örn. "flanşlı somun m8" → ["flanşlı"] — somun grup, m8 ölçü imzaya gider).
export function trLower(s: string): string {
  return s.toLocaleLowerCase('tr-TR')
}

const IMZA_DESENLERI = [
  /^din\d*$/, // din, din933
  /^a2$|^a4$|^420$/, // kalite
  /^m?\d+([.,]\d+)?([x*×/]\d+([.,]\d+)?)?$/, // m8, 8*30, 471/10, 933, 1/2
]

const GRUP_KELIMELERI = new Set([
  'imbus', 'imbüs', 'allen', 'alyan', 'civata', 'cıvata', 'vida', 'somun',
  'setiskur', 'setuskur', 'setskur', 'segman', 'pul', 'gujon', 'güjon',
  'saplama', 'rondela', 'marin', 'marine', 'nozul', 'hirdavat', 'hırdavat',
  'perçin', 'percin', 'kelepçe', 'kelepce',
])

export function GRUPSUZ_KELIMELER(metin: string): string[] {
  return trLower(metin.trim())
    .split(/\s+/)
    .filter(Boolean)
    .filter((k) => !GRUP_KELIMELERI.has(k))
    .filter((k) => !IMZA_DESENLERI.some((d) => d.test(k)))
    .filter((k) => k.length >= 2)
}
