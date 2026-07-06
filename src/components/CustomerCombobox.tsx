// Firma/müşteri seçici: yazarken mevcut müşterilerden öneri sunar,
// yoksa yazılan adla yeni müşteri oluşturulacağını belirtir.
import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useRef, useState } from 'react'
import { db } from '../db'
import { trLower } from '../lib/searchWords'

interface Props {
  deger: string
  setDeger: (v: string) => void
  hata?: boolean
}

export default function CustomerCombobox({ deger, setDeger, hata }: Props) {
  const [acik, setAcik] = useState(false)
  const kutu = useRef<HTMLDivElement>(null)
  const musteriler = useLiveQuery(() => db.customers.orderBy('ad').toArray(), []) ?? []

  const oneriler = useMemo(() => {
    const q = trLower(deger.trim())
    if (!q) return musteriler.slice(0, 8)
    return musteriler.filter((m) => trLower(m.ad).includes(q)).slice(0, 8)
  }, [deger, musteriler])

  const tamEslesme = oneriler.some((m) => trLower(m.ad) === trLower(deger.trim()))

  return (
    <div className="relative" ref={kutu}>
      <input
        className="girdi"
        style={hata ? { borderColor: 'var(--bad)' } : undefined}
        placeholder="Firma / müşteri adı yazın…"
        value={deger}
        onChange={(e) => {
          setDeger(e.target.value)
          setAcik(true)
        }}
        onFocus={() => setAcik(true)}
        onBlur={() => setTimeout(() => setAcik(false), 150)}
        aria-label="Firma / müşteri"
      />
      {acik && (oneriler.length > 0 || deger.trim()) && (
        <div className="absolute z-30 mt-1 w-full kart shadow-lg overflow-hidden">
          {oneriler.map((m) => (
            <button
              key={m.id}
              type="button"
              className="block w-full text-left px-3 py-2 text-sm hover:bg-accent-soft"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setDeger(m.ad)
                setAcik(false)
              }}
            >
              <span className="font-medium">{m.ad}</span>
              {m.telefon && <span className="text-ink-3 ml-2 text-xs">{m.telefon}</span>}
            </button>
          ))}
          {deger.trim() && !tamEslesme && (
            <div className="px-3 py-2 text-xs text-ink-3 border-t border-line">
              ↳ “{deger.trim()}” yeni müşteri olarak kaydedilecek
            </div>
          )}
        </div>
      )}
    </div>
  )
}
