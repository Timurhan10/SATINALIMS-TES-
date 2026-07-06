import { useEffect } from 'react'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props {
  baslik: string
  acik: boolean
  kapat: () => void
  genis?: boolean
  children: ReactNode
}

export default function Modal({ baslik, acik, kapat, genis, children }: Props) {
  useEffect(() => {
    if (!acik) return
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') kapat()
    }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [acik, kapat])

  if (!acik) return null
  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4 overflow-y-auto"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) kapat()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={baslik}
        className={`kart w-full ${genis ? 'max-w-3xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto shadow-xl`}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5 sticky top-0 bg-surface rounded-t-xl">
          <h2 className="font-semibold">{baslik}</h2>
          <button className="text-ink-3 hover:text-ink p-1 rounded" onClick={kapat} aria-label="Kapat">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}
