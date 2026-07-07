// Supabase yapılandırması henüz girilmediğinde gösterilen ekran.
import Logo from '../components/Logo'

export default function KurulumBekleniyor() {
  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="kart max-w-md w-full p-6 md:p-8 text-center">
        <div className="mb-4">
          <Logo boyut="buyuk" />
        </div>
        <p className="text-sm text-ink-2 leading-relaxed">
          Bulut kurulumu henüz tamamlanmadı. Sistem yöneticisinin Supabase proje bilgilerini
          (<code>src/supabaseConfig.ts</code>) girmesi bekleniyor.
        </p>
        <p className="text-xs text-ink-3 mt-3">Kurulum adımları: KURULUM.md</p>
      </div>
    </div>
  )
}
