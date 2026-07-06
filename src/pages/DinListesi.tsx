// DIN kodlarına göre büyükten küçüğe liste: her DIN satırında standart adı,
// ürün sayısı ve talep sayısı; satıra tıklayınca ürünler açılır.
import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Search } from 'lucide-react'
import { db } from '../db'
import { urunSirala } from '../lib/match'
import type { Product } from '../types'
import { BosDurum, SayfaBaslik } from '../components/Parcalar'

interface DinGrubu {
  no: number
  standart: string
  adlar: string[]
  urunler: Product[]
  talepSayisi: number
}

export default function DinListesi() {
  const [arama, setArama] = useState('')
  const [acikDin, setAcikDin] = useState<number | null>(null)

  const urunler = useLiveQuery(() => db.products.toArray(), []) ?? []
  const talepler = useLiveQuery(() => db.demands.toArray(), []) ?? []

  const gruplar = useMemo<DinGrubu[]>(() => {
    const map = new Map<number, DinGrubu>()
    for (const u of urunler) {
      const m = u.standart.match(/(\d+)/)
      if (!m) continue
      const no = parseInt(m[1], 10)
      const g = map.get(no) ?? { no, standart: `DIN ${no}`, adlar: [], urunler: [], talepSayisi: 0 }
      g.urunler.push(u)
      const ad = u.standartAdi || u.grup
      if (ad && !g.adlar.includes(ad)) g.adlar.push(ad)
      map.set(no, g)
    }
    for (const t of talepler) {
      const m = t.standart.match(/(\d+)/)
      if (!m) continue
      const g = map.get(parseInt(m[1], 10))
      if (g) g.talepSayisi++
    }
    for (const g of map.values()) g.urunler.sort(urunSirala)
    // Büyükten küçüğe
    return [...map.values()].sort((a, b) => b.no - a.no)
  }, [urunler, talepler])

  const filtreli = useMemo(() => {
    const q = arama.trim()
    if (!q) return gruplar
    return gruplar.filter(
      (g) =>
        String(g.no).includes(q) ||
        g.adlar.some((a) => a.toLocaleLowerCase('tr-TR').includes(q.toLocaleLowerCase('tr-TR'))),
    )
  }, [gruplar, arama])

  const standartsiz = urunler.filter((u) => !u.standart.match(/\d/)).length

  return (
    <div>
      <SayfaBaslik
        baslik="DIN Listesi"
        aciklama={`${gruplar.length} DIN standardı, büyükten küçüğe. Satıra tıklayınca ürünler açılır.`}
      />

      <div className="relative mb-3 max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden />
        <input
          className="girdi pl-9"
          placeholder="DIN no veya standart adı ara…"
          value={arama}
          onChange={(e) => setArama(e.target.value)}
        />
      </div>

      {filtreli.length === 0 ? (
        <BosDurum mesaj="DIN kaydı bulunamadı" alt="Katalogdaki ürünlerin DIN alanı boş olabilir." />
      ) : (
        <div className="kart overflow-hidden">
          {filtreli.map((g) => {
            const acik = acikDin === g.no
            return (
              <div key={g.no} className="border-b border-line last:border-b-0">
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-2"
                  onClick={() => setAcikDin(acik ? null : g.no)}
                  aria-expanded={acik}
                >
                  {acik ? <ChevronDown size={16} className="text-ink-3 shrink-0" aria-hidden /> : <ChevronRight size={16} className="text-ink-3 shrink-0" aria-hidden />}
                  <span className="font-bold tnum w-24 shrink-0">DIN {g.no}</span>
                  <span className="text-sm text-ink-2 flex-1 truncate">{g.adlar.join(' · ') || '—'}</span>
                  <span className="text-xs bg-accent-soft text-accent rounded-full px-2.5 py-0.5 font-semibold tnum whitespace-nowrap">
                    {g.urunler.length} ürün
                  </span>
                  <span
                    className={`text-xs rounded-full px-2.5 py-0.5 font-semibold tnum whitespace-nowrap ${
                      g.talepSayisi > 0 ? 'bg-info-soft text-info' : 'bg-surface-2 text-ink-3'
                    }`}
                  >
                    {g.talepSayisi} talep
                  </span>
                </button>
                {acik && (
                  <div className="bg-surface-2 border-t border-line overflow-x-auto">
                    <table className="w-full text-sm">
                      <tbody>
                        {g.urunler.map((u) => (
                          <tr key={u.id} className="border-b border-line/50 last:border-b-0">
                            <td className="pl-12 pr-4 py-1.5 text-ink-2 whitespace-nowrap">{u.kartKodu}</td>
                            <td className="px-4 py-1.5 font-medium">{u.aciklama}</td>
                            <td className="px-4 py-1.5 whitespace-nowrap">{u.boyutMetni || '—'}</td>
                            <td className="px-4 py-1.5">{u.kalite || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {standartsiz > 0 && (
        <p className="text-xs text-ink-3 mt-3">
          Not: {standartsiz.toLocaleString('tr-TR')} üründe DIN bilgisi yok — Katalog sayfasından “Düzelt” ile ekleyebilirsiniz.
        </p>
      )}
    </div>
  )
}
