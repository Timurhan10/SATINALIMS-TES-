// Excel (SheetJS) içe/dışa aktarma.
// Katalog kaynağı: 4 kolonlu Excel — "Kart Kodu | Açıklama | Grup Kodu | Özel Kod 1 (DIN)".
// cp1254 kaynaklı bozuk Türkçe karakterler normalize edilir.
import * as XLSX from 'xlsx'
import type { OrderItem, Product } from '../types'
import { dinBul, kaliteBul, olcuBul, trUpper } from './parser'

// cp1254 → UTF-8 dönüşümünde sık bozulan karakterler
const KARAKTER_DUZELT: Array<[RegExp, string]> = [
  [/Ý/g, 'İ'], [/ý/g, 'ı'], [/Þ/g, 'Ş'], [/þ/g, 'ş'], [/Ð/g, 'Ğ'], [/ð/g, 'ğ'],
]

export function turkceNormalize(s: string): string {
  let r = s
  for (const [re, yerine] of KARAKTER_DUZELT) r = r.replace(re, yerine)
  return r.trim()
}

export interface ImportSonuc {
  urunler: Product[]
  atlanan: number
}

/** 4 kolonlu katalog Excel'ini Product listesine çevirir. */
export async function katalogExcelOku(dosya: File): Promise<ImportSonuc> {
  const buf = await dosya.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const satirlar: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

  const urunler: Product[] = []
  const gorulen = new Set<string>()
  let atlanan = 0

  for (let i = 0; i < satirlar.length; i++) {
    const satir = satirlar[i]
    const kartKodu = turkceNormalize(String(satir[0] ?? ''))
    const aciklamaHam = turkceNormalize(String(satir[1] ?? ''))
    const grupKodu = turkceNormalize(String(satir[2] ?? ''))
    const ozelKod = turkceNormalize(String(satir[3] ?? ''))

    // Başlık satırını atla
    if (i === 0 && /kart\s*kodu/i.test(kartKodu)) continue
    if (!kartKodu || !aciklamaHam) {
      atlanan++
      continue
    }
    if (gorulen.has(kartKodu)) {
      atlanan++
      continue
    }
    gorulen.add(kartKodu)

    const grup = trUpper(grupKodu)
    const standart = dinBul(ozelKod) || dinBul(aciklamaHam)
    // Özel kod genelde "DIN 933 ALTIKÖŞE CİVATA" gibi tam ad içerir
    const standartAdi = ozelKod.replace(/DIN\s*-?\s*\d+\s*/i, '').trim() || aciklamaHam
    const kalite = kaliteBul(aciklamaHam)
    const { olcu, boyMm } = olcuBul(aciklamaHam)
    const inc = /["'']|inç|inch|\d+\/\d+/.test(aciklamaHam) && olcu === null

    urunler.push({
      kartKodu,
      aciklama: aciklamaHam,
      grup,
      standart,
      standartAdi,
      basTipi: '',
      olcu,
      boyMm,
      boyutMetni: olcu !== null ? (boyMm !== null ? `M${olcu}x${boyMm}` : `M${olcu}`) : '',
      kalite,
      disTipi: inc ? 'inç' : olcu !== null ? 'metrik' : '',
      kaynak: 'katalog',
      inCatalog: true,
    })
  }
  return { urunler, atlanan }
}

/** Sipariş listesini tedarikçiye gönderilecek gerçek .xlsx olarak indirir. */
export function siparisXlsxIndir(listeAd: string, kalemler: OrderItem[]): void {
  const satirlar = kalemler.map((k) => ({
    'Açıklama': k.aciklama,
    'Grup': k.grup,
    'DIN': k.standart,
    'Adet': k.adet,
    'FİYAT': '',
    'Tedarikçi': '',
  }))
  const ws = XLSX.utils.json_to_sheet(satirlar)
  ws['!cols'] = [{ wch: 52 }, { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 24 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sipariş')
  const guvenliAd = listeAd.replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, 60) || 'siparis'
  XLSX.writeFile(wb, `${guvenliAd}.xlsx`)
}
