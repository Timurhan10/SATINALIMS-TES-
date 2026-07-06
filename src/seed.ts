// Temsili örnek katalog + örnek kayıtlar.
// Gerçek katalog, Katalog sayfasından Excel (4 kolon) sürükle-bırak ile yüklenir.
import { db } from './db'
import type { Demand, Kalite, Product } from './types'
import { kaliteBul } from './lib/parser'

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

function gunOnce(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

/** İlk açılışta: örnek katalog + örnek müşteri/talep verisi yükler. */
export async function ornekVeriYukle(): Promise<void> {
  const urunler = ornekKatalog()
  await db.transaction('rw', db.tables, async () => {
    await db.products.clear()
    await db.products.bulkAdd(urunler)

    if ((await db.customers.count()) === 0) {
      await db.customers.bulkAdd([
        { ad: 'Demir Makina San. Tic. Ltd.', telefon: '0212 555 11 22', email: 'satinalma@demirmakina.example' },
        { ad: 'Ege Yat Donanım A.Ş.', telefon: '0232 444 33 21', email: 'depo@egeyat.example' },
        { ad: 'Karadeniz Gıda Ekipmanları', telefon: '0362 333 45 67', email: 'info@kge.example' },
      ])
      await db.suppliers.bulkAdd([
        { ad: 'İstanbul Paslanmaz Toptan', telefon: '0212 666 77 88', email: 'satis@istpaslanmaz.example' },
        { ad: 'Anadolu Bağlantı Elemanları', telefon: '0312 222 33 44', email: 'siparis@anadolubaglanti.example' },
      ])
    }

    if ((await db.demands.count()) === 0) {
      const musteriler = await db.customers.toArray()
      const hepsi = await db.products.toArray()
      const bul = (kod: string) => hepsi.find((u) => u.kartKodu === kod)
      const ornekler: Array<[string, string | null, Demand['durum'], string, number, string]> = [
        // [serbestMetin, kartKodu|null, durum, kayipNedeni, günÖnce, imza notu]
        ['imbus m8x30 a2', '912-A2-0080-0300', 'VERILDI', '', 1, 'İMBUS'],
        ['933 m10x40 a4', '933-A4-0100-0400', 'VERILDI', '', 2, 'CİVATA'],
        ['somun m8 a2', '934-A2-0080', 'VERILDI', '', 2, 'SOMUN'],
        ['segman 471/10', '471-STD-0100', 'VERILDI', '', 4, 'SEGMAN'],
        ['imbus m8x30 a2', '912-A2-0080-0300', 'VERILDI', '', 6, 'İMBUS'],
        ['güjon m12 a4', '976-A4-0120', 'VERILMEDI', 'Stokta yok', 3, 'GÜJON'],
        ['güjon m12 a4', '976-A4-0120', 'VERILMEDI', 'Stokta yok', 9, 'GÜJON'],
        ['kelebek somun m6 a2', null, 'VERILMEDI', 'Ürün kataloğumuzda yok', 5, 'SOMUN'],
        ['kelebek somun m6 a2', null, 'VERILMEDI', 'Ürün kataloğumuzda yok', 12, 'SOMUN'],
        ['civata m16x60 a2', '933-A2-0160-0600', 'VERILMEDI', 'Fiyat yüksek geldi', 8, 'CİVATA'],
        ['pul m10 a4', '125-A4-0100', 'VERILDI', '', 10, 'PUL'],
        ['setiskur m6x10 a2', '916-A2-0060-0100', 'BEKLEMEDE', '', 0, 'SETİSKUR'],
      ]
      const talepler: Demand[] = ornekler.map(([metin, kod, durum, neden, gun, grup], i) => {
        const u = kod ? bul(kod) : undefined
        return {
          tarih: gunOnce(gun),
          customerId: musteriler[i % musteriler.length].id!,
          productId: u?.id ?? null,
          serbestMetin: metin,
          grup: u?.grup ?? grup,
          standart: u?.standart ?? '',
          olcu: u?.olcu ?? null,
          boyMm: u?.boyMm ?? null,
          kalite: (u?.kalite ?? '') as Demand['kalite'],
          durum,
          kayipNedeni: neden,
          createdAt: Date.now() - gun * 86_400_000,
        }
      })
      await db.demands.bulkAdd(talepler)
    }
  })
}

/** İlk açılış kontrolü: katalog boşsa örnek veri yükler. */
/** YALNIZ gerçek ilk açılışta örnek veri yükler; sonrasında kullanıcı
 *  verisine asla dokunmaz (katalog bilerek boşaltılmış olsa bile). */
export async function ilkKurulum(): Promise<void> {
  const yapildi = await db.settings.get('ilkKurulumTamam')
  if (yapildi) return
  if ((await db.products.count()) === 0 && (await db.demands.count()) === 0) {
    await ornekVeriYukle()
  }
  await db.settings.put({ key: 'ilkKurulumTamam', value: '1' })
}

// Excel importundan da kullanılan yardımcı: açıklamadan kalite yakala.
export { kaliteBul }
