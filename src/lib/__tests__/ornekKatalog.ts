// Test fikstürü: eşleştirme testleri için temsili örnek katalog üretir.
// (Uygulama artık örnek veri yüklemez; her şirket kendi Excel'ini import eder.)
import type { Kalite, Product } from '../../types'

interface SeedTanim {
  grup: string
  din: number
  standartAdi: string
  kaliteler: Kalite[]
  olculer: number[]
  boylar: number[] | null // null → boysuz (somun, pul, segman)
}

const TANIMLAR: SeedTanim[] = [
  { grup: 'İMBUS', din: 912, standartAdi: 'İMBUS CİVATA SİLİNDİRİK BAŞ', kaliteler: ['A2', 'A4'], olculer: [4, 5, 6, 8, 10, 12], boylar: [10, 16, 20, 30, 40, 50] },
  { grup: 'İMBUS', din: 7991, standartAdi: 'İMBUS CİVATA HAVŞA BAŞ', kaliteler: ['A2', 'A4'], olculer: [5, 6, 8], boylar: [16, 20, 30] },
  { grup: 'CİVATA', din: 933, standartAdi: 'ALTIKÖŞE CİVATA TAM DİŞ', kaliteler: ['A2', 'A4'], olculer: [6, 8, 10, 12, 16], boylar: [20, 30, 40, 50, 60] },
  { grup: 'CİVATA', din: 931, standartAdi: 'ALTIKÖŞE CİVATA YARIM DİŞ', kaliteler: ['A2', 'A4'], olculer: [8, 10, 12], boylar: [50, 60, 80] },
  { grup: 'SOMUN', din: 934, standartAdi: 'ALTIKÖŞE SOMUN', kaliteler: ['A2', 'A4'], olculer: [4, 5, 6, 8, 10, 12, 16], boylar: null },
  { grup: 'SOMUN', din: 985, standartAdi: 'FİBERLİ KİLİTLİ SOMUN', kaliteler: ['A2', 'A4'], olculer: [6, 8, 10, 12], boylar: null },
  { grup: 'PUL', din: 125, standartAdi: 'DÜZ PUL', kaliteler: ['A2', 'A4'], olculer: [4, 5, 6, 8, 10, 12], boylar: null },
  { grup: 'PUL', din: 9021, standartAdi: 'GENİŞ PUL (KAPORTA)', kaliteler: ['A2'], olculer: [5, 6, 8, 10], boylar: null },
  { grup: 'SEGMAN', din: 471, standartAdi: 'MİL SEGMANI (DIŞ)', kaliteler: [''], olculer: [8, 10, 12, 15, 20, 25], boylar: null },
  { grup: 'SEGMAN', din: 472, standartAdi: 'DELİK SEGMANI (İÇ)', kaliteler: [''], olculer: [12, 16, 22, 30], boylar: null },
  { grup: 'SETİSKUR', din: 916, standartAdi: 'SETİSKUR ÇUKUR UÇLU', kaliteler: ['A2'], olculer: [5, 6, 8], boylar: [8, 10, 16, 20] },
  { grup: 'VİDA', din: 7985, standartAdi: 'YSB VİDA (YILDIZ SİLİNDİRİK BAŞ)', kaliteler: ['A2', 'A4'], olculer: [3, 4, 5, 6], boylar: [10, 16, 20, 30] },
  { grup: 'VİDA', din: 7981, standartAdi: 'YSB SAC VİDASI', kaliteler: ['A2'], olculer: [3.5, 4.2, 4.8], boylar: [16, 19, 25] },
  { grup: 'GÜJON', din: 976, standartAdi: 'GÜJON (SAPLAMA) 1 METRE', kaliteler: ['A2', 'A4'], olculer: [6, 8, 10, 12, 16], boylar: null },
  { grup: 'RONDELA', din: 127, standartAdi: 'YAYLI RONDELA', kaliteler: ['A2'], olculer: [5, 6, 8, 10, 12], boylar: null },
]

function fmtOlcu(n: number): string {
  return Number.isInteger(n) ? String(n) : String(n).replace('.', ',')
}

function pad(n: number): string {
  return String(Math.round(n * 10)).padStart(4, '0')
}

export function ornekKatalog(): Product[] {
  const urunler: Product[] = []
  for (const t of TANIMLAR) {
    for (const kalite of t.kaliteler) {
      for (const olcu of t.olculer) {
        const boylar = t.boylar ?? [null]
        for (const boy of boylar) {
          const boyutMetni = boy !== null ? `M${fmtOlcu(olcu)}x${boy}` : `M${fmtOlcu(olcu)}`
          const kaliteEk = kalite ? ` ${kalite}` : ''
          const aciklama =
            t.grup === 'SEGMAN'
              ? `${t.standartAdi}-${t.din}/${fmtOlcu(olcu)}`
              : `${t.standartAdi} DIN ${t.din} ${boyutMetni}${kaliteEk}`
          urunler.push({
            kartKodu: `${t.din}-${kalite || 'STD'}-${pad(olcu)}${boy !== null ? '-' + pad(boy) : ''}`,
            aciklama,
            grup: t.grup,
            standart: `DIN ${t.din}`,
            standartAdi: t.standartAdi,
            basTipi: '',
            olcu,
            boyMm: boy,
            boyutMetni,
            kalite: t.grup === 'SEGMAN' ? '' : kalite,
            disTipi: 'metrik',
            kaynak: 'katalog',
            inCatalog: true,
          })
        }
      }
    }
  }
  return urunler
}
