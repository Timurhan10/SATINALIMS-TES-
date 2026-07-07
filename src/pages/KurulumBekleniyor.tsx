// Supabase yapılandırması henüz girilmediğinde gösterilen ekran.
import { Bolt } from 'lucide-react'

export default function KurulumBekleniyor() {
  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="kart max-w-md w-full p-6 md:p-8 text-center">
        <span className="inline-grid place-items-center w-12 h-12 rounded-xl bg-accent text-accent-ink mb-4">
          <Bolt size={24} aria-hidden />
        </span>
        <h1 className="text-xl font-bold mb-2">Paslanmaz Takip</h1>
        <p className="text-sm text-ink-2 leading-relaxed">
          Bulut kurulumu henüz tamamlanmadı. Sistem yöneticisinin Supabase proje bilgilerini
          (<code>src/supabaseConfig.ts</code>) girmesi bekleniyor.
        </p>
        <p className="text-xs text-ink-3 mt-3">Kurulum adımları: KURULUM.md</p>
      </div>
    </div>
  )
}
