// Giriş / kayıt ekranı: mevcut hesapla giriş, davet koduyla yeni şirket kurma
// veya katılım koduyla mevcut şirkete üye olma.
import { useState } from 'react'
import { Bolt } from 'lucide-react'
import { hataMesaji, supabase } from '../data/client'
import { useAuth } from '../auth/AuthContext'

type Sekme = 'giris' | 'kur' | 'katil'

const SEKMELER: Array<{ id: Sekme; ad: string }> = [
  { id: 'giris', ad: 'Giriş yap' },
  { id: 'kur', ad: 'Yeni şirket kur' },
  { id: 'katil', ad: 'Şirkete katıl' },
]

export default function Giris() {
  const { uyelikYenile } = useAuth()
  const [sekme, setSekme] = useState<Sekme>('giris')
  const [eposta, setEposta] = useState('')
  const [sifre, setSifre] = useState('')
  const [davetKodu, setDavetKodu] = useState('')
  const [sirketAdi, setSirketAdi] = useState('')
  const [katilimKodu, setKatilimKodu] = useState('')
  const [hata, setHata] = useState('')
  const [bilgi, setBilgi] = useState('')
  const [calisiyor, setCalisiyor] = useState(false)

  /** Kayıt ol; hesap zaten varsa aynı bilgilerle giriş yapmayı dener. */
  async function kayitVeyaGiris(): Promise<boolean> {
    const { data, error } = await supabase().auth.signUp({ email: eposta.trim(), password: sifre })
    if (error) {
      if (error.message.includes('already registered')) {
        const g = await supabase().auth.signInWithPassword({ email: eposta.trim(), password: sifre })
        if (g.error) throw g.error
        return true
      }
      throw error
    }
    if (!data.session) {
      // E-posta onayı açık bırakılmışsa oturum hemen oluşmaz.
      setBilgi('Hesap oluşturuldu. E-postanıza gelen onay bağlantısına tıklayıp tekrar giriş yapın.')
      return false
    }
    return true
  }

  async function gonder() {
    setHata('')
    setBilgi('')
    if (!eposta.trim() || !sifre) {
      setHata('E-posta ve şifre zorunludur.')
      return
    }
    if (sekme === 'kur' && (!davetKodu.trim() || !sirketAdi.trim())) {
      setHata('Davet kodu ve şirket adı zorunludur.')
      return
    }
    if (sekme === 'katil' && !katilimKodu.trim()) {
      setHata('Katılım kodu zorunludur.')
      return
    }
    setCalisiyor(true)
    try {
      if (sekme === 'giris') {
        const { error } = await supabase().auth.signInWithPassword({ email: eposta.trim(), password: sifre })
        if (error) throw error
        await uyelikYenile()
      } else if (sekme === 'kur') {
        if (!(await kayitVeyaGiris())) return
        const { error } = await supabase().rpc('kurulus_olustur', {
          davet_kodu: davetKodu.trim(),
          sirket_adi: sirketAdi.trim(),
        })
        if (error) throw error
        await uyelikYenile()
      } else {
        if (!(await kayitVeyaGiris())) return
        const { error } = await supabase().rpc('kurulusa_katil', { katilim_kodu: katilimKodu.trim() })
        if (error) throw error
        await uyelikYenile()
      }
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
          <div className="leading-tight">
            <div className="font-bold text-lg tracking-tight">Paslanmaz Takip</div>
            <div className="text-xs text-ink-3">Talep &amp; Satınalma</div>
          </div>
        </div>

        <div className="kart p-5 md:p-6">
          <div className="flex gap-1 mb-4 bg-surface-2 rounded-lg p-1">
            {SEKMELER.map((s) => (
              <button
                key={s.id}
                className={`flex-1 rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
                  sekme === s.id ? 'bg-surface shadow-sm text-ink' : 'text-ink-3 hover:text-ink'
                }`}
                onClick={() => {
                  setSekme(s.id)
                  setHata('')
                  setBilgi('')
                }}
              >
                {s.ad}
              </button>
            ))}
          </div>

          {sekme === 'kur' && (
            <p className="text-xs text-ink-3 mb-3">
              Yeni şirket hesabı açmak için size verilen <strong>davet kodu</strong> gerekir.
            </p>
          )}
          {sekme === 'katil' && (
            <p className="text-xs text-ink-3 mb-3">
              Şirketinizin sahibi Ayarlar sayfasından sizin için bir <strong>katılım kodu</strong> üretebilir.
            </p>
          )}

          <div className="grid gap-3">
            <div>
              <label className="text-xs font-medium text-ink-2 block mb-1">E-posta</label>
              <input
                type="email"
                className="girdi"
                placeholder="ornek@hotmail.com"
                value={eposta}
                onChange={(e) => setEposta(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-2 block mb-1">Şifre</label>
              <input
                type="password"
                className="girdi"
                placeholder={sekme === 'giris' ? 'Şifreniz' : 'En az 6 karakter'}
                value={sifre}
                onChange={(e) => setSifre(e.target.value)}
                autoComplete={sekme === 'giris' ? 'current-password' : 'new-password'}
                onKeyDown={(e) => e.key === 'Enter' && gonder()}
              />
            </div>
            {sekme === 'kur' && (
              <>
                <div>
                  <label className="text-xs font-medium text-ink-2 block mb-1">Davet kodu</label>
                  <input
                    className="girdi uppercase"
                    placeholder="Örn. 9F3A61BC"
                    value={davetKodu}
                    onChange={(e) => setDavetKodu(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink-2 block mb-1">Şirket adı</label>
                  <input
                    className="girdi"
                    placeholder="Örn. Yılmaz Hırdavat Ltd."
                    value={sirketAdi}
                    onChange={(e) => setSirketAdi(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && gonder()}
                  />
                </div>
              </>
            )}
            {sekme === 'katil' && (
              <div>
                <label className="text-xs font-medium text-ink-2 block mb-1">Katılım kodu</label>
                <input
                  className="girdi uppercase"
                  placeholder="Örn. 4B7C21DE"
                  value={katilimKodu}
                  onChange={(e) => setKatilimKodu(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && gonder()}
                />
              </div>
            )}

            {hata && <p className="text-sm text-bad font-medium">{hata}</p>}
            {bilgi && <p className="text-sm text-ok font-medium">{bilgi}</p>}

            <button className="btn btn-birincil justify-center mt-1" onClick={gonder} disabled={calisiyor}>
              {calisiyor
                ? 'İşleniyor…'
                : sekme === 'giris'
                  ? 'Giriş yap'
                  : sekme === 'kur'
                    ? 'Şirketi kur ve başla'
                    : 'Şirkete katıl'}
            </button>
          </div>
        </div>

        <p className="text-xs text-ink-3 text-center mt-4">
          Verileriniz şirketinize özeldir; diğer şirketler göremez.
        </p>
      </div>
    </div>
  )
}
