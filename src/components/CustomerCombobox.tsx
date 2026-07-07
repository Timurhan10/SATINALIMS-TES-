// Firma/müşteri seçici: yazarken mevcut müşterilerden öneri sunar,
// yoksa yazılan adla yeni müşteri oluşturulacağını belirtir.
// Klavye: ↑/↓ gezinme, Enter seçme, Esc kapatma.
import { useMemo, useRef, useState } from 'react'
import { musteriListele } from '../data/api'
import { useVeri } from '../data/hooks'
import { trLower } from '../lib/searchWords'

interface Props {
  deger: string
  setDeger: (v: string) => void
  hata?: boolean
}

export default function CustomerCombobox({ deger, setDeger, hata }: Props) {
  const [acik, setAcik] = useState(false)
  const [aktifIndeks, setAktifIndeks] = useState(-1)
  const kutu = useRef<HTMLDivElement>(null)
  const musteriler = useVeri(musteriListele) ?? []

  const oneriler = useMemo(() => {
    const q = trLower(deger.trim())
    if (!q) return musteriler.slice(0, 8)
    return musteriler.filter((m) => trLower(m.ad).includes(q)).slice(0, 8)
  }, [deger, musteriler])

  const tamEslesme = oneriler.some((m) => trLower(m.ad) === trLower(deger.trim()))

  function sec(ad: string) {
    setDeger(ad)
    setAcik(false)
    setAktifIndeks(-1)
  }

  function tusla(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!acik && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setAcik(true)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setAktifIndeks((i) => (i + 1 >= oneriler.length ? 0 : i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setAktifIndeks((i) => (i <= 0 ? oneriler.length - 1 : i - 1))
    } else if (e.key === 'Enter') {
      if (acik && aktifIndeks >= 0 && oneriler[aktifIndeks]) {
        e.preventDefault()
        sec(oneriler[aktifIndeks].ad)
      }
    } else if (e.key === 'Escape') {
      setAcik(false)
      setAktifIndeks(-1)
    }
  }

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
          setAktifIndeks(-1)
        }}
        onFocus={() => setAcik(true)}
        onBlur={() => setTimeout(() => setAcik(false), 150)}
        onKeyDown={tusla}
        role="combobox"
        aria-expanded={acik}
        aria-controls="musteri-onerileri"
        aria-activedescendant={aktifIndeks >= 0 ? `musteri-oneri-${aktifIndeks}` : undefined}
        aria-autocomplete="list"
        aria-label="Firma / müşteri"
      />
      {acik && (oneriler.length > 0 || deger.trim()) && (
        <div id="musteri-onerileri" role="listbox" className="absolute z-30 mt-1 w-full kart shadow-lg overflow-hidden">
          {oneriler.map((m, i) => (
            <button
              key={m.id}
              id={`musteri-oneri-${i}`}
              type="button"
              role="option"
              aria-selected={i === aktifIndeks}
              className={`block w-full text-left px-3 py-2 text-sm ${
                i === aktifIndeks ? 'bg-accent-soft' : 'hover:bg-accent-soft'
              }`}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setAktifIndeks(i)}
              onClick={() => sec(m.ad)}
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
