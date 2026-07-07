// Oturum açık ama şirket üyeliği yok (ör. kayıt yarıda kaldı):
// davet koduyla şirket kur veya katılım koduyla katıl.
import { useState } from 'react'
import { Bolt, LogOut } from 'lucide-react'
import { hataMesaji, supabase } from '../data/client'
import { useAuth } from '../auth/AuthContext'

export default function OrgKurulum() {
  const { session, uyelikYenile, cikisYap } = useAuth()
  const [davetKodu, setDavetKodu] = useState('')
  const [sirketAdi, setSirketAdi] = useState('')
  const [katilimKodu, setKatilimKodu] = useState('')
  const [hata, setHata] = useState('')
  const [calisiyor, setCalisiyor] = useState(false)

  async function calistir(fn: () => Promise<void>) {
    setHata('')
    setCalisiyor(true)
    try {
      await fn()
      await uyelikYenile()
    } catch (e) {
      setHata(hataMesaji(e))
    } finally {
      setCalisiyor(false)
    }
  }

  return (
    <div className="min-h-screen grid place-items-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2.5 mb-5">
          <span className="grid place-items-center w-10 h-10 rounded-lg bg-accent text-accent-ink">
            <Bolt size={22} aria-hidden />
          </span>
          <div className="font-bold text-lg tracking-tight">Paslanmaz Takip</div>
        </div>

        <div className="kart p-5 md:p-6">
          <h1 className="font-semibold mb-1">Hesabınız bir şirkete bağlı değil</h1>
          <p className="text-sm text-ink-2 mb-4">
            <strong>{session?.user.email}</strong> ile giriş yaptınız. Devam etmek için davet
            kodunuzla yeni şirket kurun veya katılım kodunuzla mevcut şirkete katılın.
          </p>

          <div className="grid gap-3">
            <div className="border border-line rounded-lg p-3">
              <div className="mikro mb-2">Yeni şirket kur</div>
              <div className="grid gap-2">
                <input
                  className="girdi uppercase"
                  placeholder="Davet kodu"
                  value={davetKodu}
                  onChange={(e) => setDavetKodu(e.target.value)}
                />
                <input
                  className="girdi"
                  placeholder="Şirket adı"
                  value={sirketAdi}
                  onChange={(e) => setSirketAdi(e.target.value)}
                />
                <button
                  className="btn btn-birincil justify-center"
                  disabled={calisiyor || !davetKodu.trim() || !sirketAdi.trim()}
                  onClick={() =>
                    calistir(async () => {
                      const { error } = await supabase().rpc('kurulus_olustur', {
                        davet_kodu: davetKodu.trim(),
                        sirket_adi: sirketAdi.trim(),
                      })
                      if (error) throw error
                    })
                  }
                >
                  Şirketi kur
                </button>
              </div>
            </div>

            <div className="border border-line rounded-lg p-3">
              <div className="mikro mb-2">Mevcut şirkete katıl</div>
              <div className="grid gap-2">
                <input
                  className="girdi uppercase"
                  placeholder="Katılım kodu"
                  value={katilimKodu}
                  onChange={(e) => setKatilimKodu(e.target.value)}
                />
                <button
                  className="btn btn-ikincil justify-center"
                  disabled={calisiyor || !katilimKodu.trim()}
                  onClick={() =>
                    calistir(async () => {
                      const { error } = await supabase().rpc('kurulusa_katil', {
                        katilim_kodu: katilimKodu.trim(),
                      })
                      if (error) throw error
                    })
                  }
                >
                  Katıl
                </button>
              </div>
            </div>

            {hata && <p className="text-sm text-bad font-medium">{hata}</p>}

            <button className="btn btn-ikincil btn-kucuk justify-center" onClick={cikisYap}>
              <LogOut size={14} aria-hidden /> Farklı hesapla giriş yap
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
