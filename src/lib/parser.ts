// Serbest metni yapılandırılmış "imza"ya çevirir.
// Örnekler: "imbus a2" → {grup: İMBUS, kalite: A2}
//           "933 8*30" → {standart: DIN 933, olcu: 8, boyMm: 30}
//           "471/10"   → {standart: DIN 471, olcu: 10}
//           "somun 8"  → {grup: SOMUN, olcu: 8}
//           "1/2 civata" → {grup: CİVATA, boyutMetni: 1/2", disTipi: inç}
import type { Kalite, ParseImza } from '../types'

// Bilinen bağlantı elemanı DIN standartları (çıplak sayı tanıma için).
export const BILINEN_DIN = new Set([
  84, 85, 94, 125, 127, 137, 417, 433, 434, 435, 436, 438, 439, 440, 464, 466,
  467, 471, 472, 478, 479, 480, 508, 551, 553, 562, 563, 571, 601, 603, 605,
  693, 704, 787, 835, 906, 908, 910, 912, 913, 914, 915, 916, 923, 928, 929,
  931, 933, 934, 935, 936, 937, 938, 939, 940, 960, 961, 963, 964, 965, 966,
  968, 970, 975, 976, 980, 982, 985, 986, 988, 1052, 1440, 1441, 1481, 1587,
  6325, 6334, 6791, 6796, 6797, 6798, 6885, 6899, 6912, 6921, 6923, 7337,
  7338, 7343, 7380, 7500, 7504, 7513, 7972, 7976, 7981, 7982, 7983, 7985,
  7989, 7991, 9021, 28129, 34813,
])

// Grup kelime eşleme — anahtar kelimeler Türkçe küçük harfe göre.
const GRUP_KELIME: Record<string, string> = {
  imbus: 'İMBUS',
  imbüs: 'İMBUS',
  allen: 'İMBUS',
  alyan: 'İMBUS',
  civata: 'CİVATA',
  cıvata: 'CİVATA',
  vida: 'VİDA',
  somun: 'SOMUN',
  setiskur: 'SETİSKUR',
  setuskur: 'SETİSKUR',
  setskur: 'SETİSKUR',
  segman: 'SEGMAN',
  pul: 'PUL',
  gujon: 'GÜJON',
  güjon: 'GÜJON',
  saplama: 'GÜJON',
  rondela: 'RONDELA',
  rondela1: 'RONDELA',
  marin: 'MARİN',
  marine: 'MARİN',
  nozul: 'NOZUL',
  hirdavat: 'HIRDAVAT',
  hırdavat: 'HIRDAVAT',
  perçin: 'PERÇİN',
  percin: 'PERÇİN',
  kelepçe: 'KELEPÇE',
  kelepce: 'KELEPÇE',
}

const SAYI = String.raw`\d+(?:[.,]\d+)?`

function num(s: string): number {
  return parseFloat(s.replace(',', '.'))
}

/** Türkçe'ye uygun küçük harf (I→ı, İ→i). */
export function trLower(s: string): string {
  return s.toLocaleLowerCase('tr-TR')
}

/** Türkçe'ye uygun büyük harf (i→İ, ı→I). */
export function trUpper(s: string): string {
  return s.toLocaleUpperCase('tr-TR')
}

export function parseSerbestMetin(metin: string): ParseImza {
  const imza: ParseImza = {
    grup: '',
    standart: '',
    olcu: null,
    boyMm: null,
    kalite: '',
    boyutMetni: '',
    disTipi: '',
  }
  const kelimeler = trLower(metin.trim()).split(/\s+/).filter(Boolean)
  let i = 0
  while (i < kelimeler.length) {
    const k = kelimeler[i]

    // "din 933" (iki kelime) veya "din933"
    if (k === 'din' && i + 1 < kelimeler.length && /^\d+$/.test(kelimeler[i + 1])) {
      imza.standart = `DIN ${kelimeler[i + 1]}`
      i += 2
      continue
    }
    const dinBirlesik = k.match(/^din(\d+)$/)
    if (dinBirlesik) {
      imza.standart = `DIN ${dinBirlesik[1]}`
      i++
      continue
    }

    // Kalite: a2 / a4 / 420
    if (k === 'a2' || k === 'a4') {
      imza.kalite = trUpper(k) as Kalite
      i++
      continue
    }
    if (k === '420' && !imza.kalite) {
      imza.kalite = '420'
      i++
      continue
    }

    // Grup kelimesi
    if (GRUP_KELIME[k]) {
      imza.grup = GRUP_KELIME[k]
      i++
      continue
    }

    // "m8*30" / "m8x30" / "m8"
    const mDesen = k.match(new RegExp(`^m(${SAYI})(?:[x*×](${SAYI}))?$`))
    if (mDesen) {
      imza.olcu = num(mDesen[1])
      if (mDesen[2]) imza.boyMm = num(mDesen[2])
      i++
      continue
    }

    // "X/Y": X bilinen DIN ise standart + ölçü (segman "471/10"); değilse inç ("1/2")
    const bolmeli = k.match(new RegExp(`^(\\d+)\\/(${SAYI})$`))
    if (bolmeli) {
      const x = parseInt(bolmeli[1], 10)
      if (BILINEN_DIN.has(x)) {
        imza.standart = `DIN ${x}`
        imza.olcu = num(bolmeli[2])
      } else {
        imza.boyutMetni = `${bolmeli[1]}/${bolmeli[2]}"`
        imza.disTipi = 'inç'
      }
      i++
      continue
    }

    // "8*30" / "4,8*16" ölçü–boy
    const carpim = k.match(new RegExp(`^(${SAYI})[x*×](${SAYI})$`))
    if (carpim) {
      imza.olcu = num(carpim[1])
      imza.boyMm = num(carpim[2])
      i++
      continue
    }

    // Çıplak sayı: küçükse ölçü ("somun 8" → M8), bilinen DIN ise standart ("933")
    if (/^\d+$/.test(k)) {
      const n = parseInt(k, 10)
      if (n <= 30 && imza.olcu === null) {
        imza.olcu = n
      } else if (BILINEN_DIN.has(n) && !imza.standart) {
        imza.standart = `DIN ${n}`
      } else if (n <= 64 && imza.olcu === null) {
        imza.olcu = n
      } else if (imza.boyMm === null && imza.olcu !== null) {
        imza.boyMm = n
      }
      i++
      continue
    }

    i++
  }

  if (!imza.boyutMetni && imza.olcu !== null) {
    imza.boyutMetni =
      imza.boyMm !== null ? `M${fmtSayi(imza.olcu)}x${fmtSayi(imza.boyMm)}` : `M${fmtSayi(imza.olcu)}`
  }
  return imza
}

export function fmtSayi(n: number): string {
  return Number.isInteger(n) ? String(n) : String(n).replace('.', ',')
}

/** Ürün açıklamasından kalite (A2/A4/420) yakalar. */
export function kaliteBul(aciklama: string): Kalite {
  const a = ` ${trUpper(aciklama)} `
  if (/[^A-Z0-9]A2[^0-9]/.test(a)) return 'A2'
  if (/[^A-Z0-9]A4[^0-9]/.test(a)) return 'A4'
  if (/[^0-9]420[^0-9]/.test(a)) return '420'
  return ''
}

/** Ürün açıklamasından ölçü/boy yakalar: "M8X30", "M 8x30", "8*30", "M8". */
export function olcuBul(aciklama: string): { olcu: number | null; boyMm: number | null } {
  const a = trLower(aciklama).replace(/\s+/g, ' ')
  let m = a.match(new RegExp(`m\\s?(${SAYI})\\s?[x*×]\\s?(${SAYI})`))
  if (m) return { olcu: num(m[1]), boyMm: num(m[2]) }
  m = a.match(new RegExp(`(${SAYI})\\s?[x*×]\\s?(${SAYI})`))
  if (m) return { olcu: num(m[1]), boyMm: num(m[2]) }
  m = a.match(new RegExp(`\\bm\\s?(${SAYI})\\b`))
  if (m) return { olcu: num(m[1]), boyMm: null }
  return { olcu: null, boyMm: null }
}

/** Açıklama/özel koddan DIN numarası yakalar. */
export function dinBul(metin: string): string {
  const m = trUpper(metin).match(/DIN\s*-?\s*(\d+)/)
  if (m) return `DIN ${m[1]}`
  return ''
}
