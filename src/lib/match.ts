// Akıllı eşleştirme: parse imzası + serbest kelimelerle katalogda skorlu arama.
// Kural: grup ve kalite STRICT filtredir (A2 ararken A4 çıkmaz).
// TAM eşleşme varsa YALNIZ onlar döner; yoksa en yakınlar önerilir.
import type { Kalite, ParseImza, Product } from '../types'
import { GRUPSUZ_KELIMELER, trLower } from './searchWords'

const KALITE_SIRA: Record<string, number> = { A2: 0, A4: 1, '420': 2, '': 3 }

export interface EslesmeSonucu {
  urunler: Product[]
  tamEslesme: boolean
}

function standartNo(standart: string): number | null {
  const m = standart.match(/(\d+)/)
  return m ? parseInt(m[1], 10) : null
}

export function urunSirala(a: Product, b: Product): number {
  const ka = KALITE_SIRA[a.kalite] ?? 3
  const kb = KALITE_SIRA[b.kalite] ?? 3
  if (ka !== kb) return ka - kb
  const oa = a.olcu ?? Infinity
  const ob = b.olcu ?? Infinity
  if (oa !== ob) return oa - ob
  const ba = a.boyMm ?? Infinity
  const bb = b.boyMm ?? Infinity
  if (ba !== bb) return ba - bb
  const sa = standartNo(a.standart) ?? Infinity
  const sb = standartNo(b.standart) ?? Infinity
  if (sa !== sb) return sa - sb
  return a.aciklama.localeCompare(b.aciklama, 'tr')
}

/**
 * imza + serbest metin ile ürün listesinde arama.
 * ekGrup/ekKalite: arayüzdeki filtre kutuları (imzayı ezer).
 */
export function urunEslestir(
  urunler: Product[],
  imza: ParseImza,
  serbestMetin: string,
  ekGrup?: string,
  ekKalite?: Kalite | '',
  limit = 50,
): EslesmeSonucu {
  const grup = ekGrup || imza.grup
  const kalite = (ekKalite || imza.kalite) as Kalite | ''

  // STRICT filtreler
  let havuz = urunler
  if (grup) havuz = havuz.filter((u) => u.grup === grup)
  if (kalite) havuz = havuz.filter((u) => u.kalite === kalite)

  // İmza dışında kalan serbest kelimeler açıklamada aranır
  const kelimeler = GRUPSUZ_KELIMELER(serbestMetin)

  interface Skorlu {
    u: Product
    skor: number
    tam: boolean
  }
  const skorlar: Skorlu[] = []

  for (const u of havuz) {
    let skor = 0
    let istenenAlan = 0
    let tutanAlan = 0

    if (imza.standart) {
      istenenAlan++
      if (standartNo(u.standart) === standartNo(imza.standart)) {
        skor += 50
        tutanAlan++
      }
    }
    if (imza.olcu !== null) {
      istenenAlan++
      if (u.olcu !== null && Math.abs(u.olcu - imza.olcu) < 0.001) {
        skor += 40
        tutanAlan++
      } else if (u.olcu !== null) {
        skor -= Math.min(20, Math.abs(u.olcu - imza.olcu) * 2)
      }
    }
    if (imza.boyMm !== null) {
      istenenAlan++
      if (u.boyMm !== null && Math.abs(u.boyMm - imza.boyMm) < 0.001) {
        skor += 30
        tutanAlan++
      } else if (u.boyMm !== null) {
        skor -= Math.min(15, Math.abs(u.boyMm - imza.boyMm) / 2)
      }
    }
    if (imza.disTipi === 'inç') {
      istenenAlan++
      const inMetin = imza.boyutMetni && u.aciklama.includes(imza.boyutMetni.replace('"', ''))
      if (u.disTipi === 'inç' || inMetin) {
        skor += 25
        tutanAlan++
      }
    }

    const aciklamaKucuk = trLower(`${u.aciklama} ${u.kartKodu}`)
    let kelimeTutan = 0
    for (const kelime of kelimeler) {
      if (aciklamaKucuk.includes(kelime)) {
        skor += 10
        kelimeTutan++
      }
    }

    // Hiçbir kriter tutmuyorsa ve kriter istendiyse eleme
    const kriterVar = istenenAlan > 0 || kelimeler.length > 0
    if (kriterVar && tutanAlan === 0 && kelimeTutan === 0 && !grup && !kalite) continue
    if (kriterVar && istenenAlan > 0 && tutanAlan === 0 && kelimeler.length > 0 && kelimeTutan === 0) continue

    const tam = istenenAlan > 0 && tutanAlan === istenenAlan && kelimeTutan === kelimeler.length
    // Grup+kalite tek başına arandıysa (ör. "imbus a2") tüm havuz "tam"dır
    const sadeceFiltre = istenenAlan === 0 && kelimeler.length === 0
    skorlar.push({ u, skor, tam: tam || sadeceFiltre })
  }

  const tamlar = skorlar.filter((s) => s.tam)
  const secilen = tamlar.length > 0 ? tamlar : skorlar
  secilen.sort((a, b) => b.skor - a.skor || urunSirala(a.u, b.u))

  const kesit = secilen.slice(0, limit).map((s) => s.u)
  kesit.sort(urunSirala)
  return { urunler: kesit, tamEslesme: tamlar.length > 0 }
}
