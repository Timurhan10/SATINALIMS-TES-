// Şifre sıfırlama bağlantısından gelen kullanıcı yeni şifresini burada belirler.
import { useState } from 'react'
import { hataMesaji, supabase } from '../data/client'
import { useAuth } from '../auth/AuthContext'
import Logo from '../components/Logo'
import { toast } from '../components/Toast'

export default function YeniSifre() {
  const { uyelikYenile, sifreYenilemeTamam } = useAuth()
  const [sifre, setSifre] = useState('')
  const [tekrar, setTekrar] = useState('')
  const [hata, setHata] = useState('')
  const [calisiyor, setCalisiyor] = useState(false)

  async function kaydet() {
    setHata('')
    if (sifre.length < 6) {
      setHata('Şifre en az 6 karakter olmalı.')
      return
    }
    if (sifre !== tekrar) {
      setHata('Şifreler birbirini tutmuyor.')
      return
    }
    setCalisiyor(true)
    try {
      const { error } = await supabase().auth.updateUser({ password: sifre })
      if (error) throw error
      toast('Şifreniz güncellendi.')
      await uyelikYenile()
      sifreYenilemeTamam()
    } catch (e) {
      setHata(hataMesaji(e))
    } finally {
      setCalisiyor(false)
    }
  }

  return (
    <div className="min-h-screen grid place-items-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-5">
          <Logo boyut="buyuk" />
        </div>
        <div className="kart p-5 md:p-6">
          <h1 className="font-semibold mb-1">Yeni şifre belirleyin</h1>
          <p className="text-sm text-ink-2 mb-4">
            Şifre sıfırlama bağlantısıyla giriş yaptınız. Hesabınız için yeni bir şifre seçin.
          </p>
          <div className="grid gap-3">
            <div>
              <label className="text-xs font-medium text-ink-2 block mb-1">Yeni şifre</label>
              <input
                type="password"
                className="girdi"
                placeholder="En az 6 karakter"
                value={sifre}
                onChange={(e) => setSifre(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-2 block mb-1">Yeni şifre (tekrar)</label>
              <input
                type="password"
                className="girdi"
                value={tekrar}
                onChange={(e) => setTekrar(e.target.value)}
                autoComplete="new-password"
                onKeyDown={(e) => e.key === 'Enter' && kaydet()}
              />
            </div>
            {hata && <p className="text-sm text-bad font-medium">{hata}</p>}
            <button className="btn btn-birincil justify-center" onClick={kaydet} disabled={calisiyor}>
              {calisiyor ? 'Kaydediliyor…' : 'Şifreyi güncelle ve devam et'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
