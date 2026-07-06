// Akıllı ürün arama: serbest metin (parser) + GRUP + KALİTE filtreleri.
// Talepler'de çoklu seçim, sipariş listelerinde tekli ekleme için kullanılır.
import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import type { ReactNode } from 'react'
import { db } from '../db'
import { parseSerbestMetin } from '../lib/parser'
import { urunEslestir } from '../lib/match'
import type { Kalite, Product } from '../types'

interface Props {
  metin: string
  setMetin: (v: string) => void
  seciliIdler?: Set<number>
  onToggle?: (u: Product) => void
  onPick?: (u: Product) => void
  pickEtiket?: string
  sonucYokAlani?: ReactNode
}

export const KALITELER: Kalite[] = ['A2', 'A4', '420']

export default function ProductSearch({
  metin, setMetin, seciliIdler, onToggle, onPick, pickEtiket = 'Ekle', sonucYokAlani,
}: Props) {
  const [grup, setGrup] = useState('')
  const [kalite, setKalite] = useState<Kalite | ''>('')
  const urunler = useLiveQuery(() => db.products.toArray(), []) ?? []

  const gruplar = useMemo(
    () => [...new Set(urunler.map((u) => u.grup).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr')),
    [urunler],
  )

  const { sonuclar, tamEslesme } = useMemo(() => {
    const aramaVar = metin.trim() || grup || kalite
    if (!aramaVar) return { sonuclar: [] as Product[], tamEslesme: false }
    const imza = parseSerbestMetin(metin)
    const r = urunEslestir(urunler, imza, metin, grup, kalite)
    return { sonuclar: r.urunler, tamEslesme: r.tamEslesme }
  }, [metin, grup, kalite, urunler])

  const aramaVar = Boolean(metin.trim() || grup || kalite)

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-56">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden />
          <input
            className="girdi pl-9"
            placeholder='Örn: "imbus a2", "933 8*30", "471/10", "somun 8"…'
            value={metin}
            onChange={(e) => setMetin(e.target.value)}
            aria-label="Ürün ara"
          />
        </div>
        <select className="girdi w-auto" value={grup} onChange={(e) => setGrup(e.target.value)} aria-label="Grup filtresi">
          <option value="">Tüm gruplar</option>
          {gruplar.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        <select className="girdi w-auto" value={kalite} onChange={(e) => setKalite(e.target.value as Kalite | '')} aria-label="Kalite filtresi">
          <option value="">Tüm kaliteler</option>
          {KALITELER.map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
      </div>

      {aramaVar && (
        <div className="mt-3 kart overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-line bg-surface-2">
            <span className="text-xs text-ink-2">
              {sonuclar.length} sonuç {tamEslesme ? '· tam eşleşme' : sonuclar.length > 0 ? '· en yakın öneriler' : ''}
            </span>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {sonuclar.map((u) => {
              const secili = u.id !== undefined && seciliIdler?.has(u.id)
              return (
                <div
                  key={u.id}
                  className={`flex items-center gap-3 px-4 py-2 border-b border-line last:border-b-0 text-sm ${
                    secili ? 'bg-accent-soft' : 'hover:bg-surface-2'
                  }`}
                >
                  {onToggle && (
                    <input
                      type="checkbox"
                      className="accent-[var(--accent)] w-4 h-4 shrink-0"
                      checked={Boolean(secili)}
                      onChange={() => onToggle(u)}
                      aria-label={`Seç: ${u.aciklama}`}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{u.aciklama}</div>
                    <div className="text-xs text-ink-3">
                      {u.kartKodu}
                      {u.standart && ` · ${u.standart}`}
                      {u.grup && ` · ${u.grup}`}
                      {u.kalite && ` · ${u.kalite}`}
                    </div>
                  </div>
                  {onPick && (
                    <button className="btn btn-ikincil btn-kucuk" onClick={() => onPick(u)}>
                      {pickEtiket}
                    </button>
                  )}
                </div>
              )
            })}
            {sonuclar.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-ink-3">
                Katalogda eşleşen ürün bulunamadı.
                {sonucYokAlani && <div className="mt-3">{sonucYokAlani}</div>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
