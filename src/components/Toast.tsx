// Basit global bildirim sistemi.
import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'

interface ToastKaydi {
  id: number
  mesaj: string
  tur: 'ok' | 'hata'
}

let sayac = 0
let dinleyici: ((t: ToastKaydi) => void) | null = null

export function toast(mesaj: string, tur: 'ok' | 'hata' = 'ok'): void {
  dinleyici?.({ id: ++sayac, mesaj, tur })
}

export function ToastAlani() {
  const [liste, setListe] = useState<ToastKaydi[]>([])

  useEffect(() => {
    dinleyici = (t) => {
      setListe((eski) => [...eski, t])
      setTimeout(() => setListe((eski) => eski.filter((x) => x.id !== t.id)), 3500)
    }
    return () => {
      dinleyici = null
    }
  }, [])

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2" role="status" aria-live="polite">
      {liste.map((t) => (
        <div
          key={t.id}
          className={`kart flex items-center gap-2 px-4 py-3 text-sm font-medium shadow-lg ${
            t.tur === 'ok' ? 'text-ok' : 'text-bad'
          }`}
        >
          {t.tur === 'ok' ? <CheckCircle2 size={17} aria-hidden /> : <XCircle size={17} aria-hidden />}
          <span className="text-ink">{t.mesaj}</span>
        </div>
      ))}
    </div>
  )
}
