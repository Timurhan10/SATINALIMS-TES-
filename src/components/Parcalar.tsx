// Küçük ortak parçalar: sayfa başlığı, KPI kartı, durum rozeti, boş durum.
import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'
import type { DemandDurum } from '../types'
import { DURUM_ETIKET } from '../types'

export function SayfaBaslik({ baslik, aciklama, sag }: { baslik: string; aciklama?: string; sag?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{baslik}</h1>
        {aciklama && <p className="text-sm text-ink-2 mt-0.5">{aciklama}</p>}
      </div>
      {sag && <div className="flex gap-2">{sag}</div>}
    </div>
  )
}

export function KpiKarti({ etiket, deger, alt, vurgu }: { etiket: string; deger: string; alt?: string; vurgu?: 'ok' | 'bad' }) {
  return (
    <div className="kart px-4 py-3.5">
      <div className="mikro">{etiket}</div>
      <div className={`text-2xl font-bold mt-1 tnum ${vurgu === 'ok' ? 'text-ok' : vurgu === 'bad' ? 'text-bad' : ''}`}>
        {deger}
      </div>
      {alt && <div className="text-xs text-ink-3 mt-0.5">{alt}</div>}
    </div>
  )
}

const DURUM_SINIF: Record<DemandDurum, string> = {
  BEKLEMEDE: 'bg-warn-soft text-warn',
  VERILDI: 'bg-ok-soft text-ok',
  VERILMEDI: 'bg-bad-soft text-bad',
}

export function DurumRozeti({ durum }: { durum: DemandDurum }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${DURUM_SINIF[durum]}`}>
      {DURUM_ETIKET[durum]}
    </span>
  )
}

export function BosDurum({ mesaj, alt }: { mesaj: string; alt?: string }) {
  return (
    <div className="kart grid place-items-center py-12 text-center">
      <Inbox size={28} className="text-ink-3 mb-2" aria-hidden />
      <div className="font-medium text-ink-2">{mesaj}</div>
      {alt && <div className="text-sm text-ink-3 mt-1">{alt}</div>}
    </div>
  )
}
