import { useEffect, useState } from 'react'
import { Building2, Copy, Download, HardDriveUpload, Moon, Sparkles, Sun, Trash2, Upload, UserPlus } from 'lucide-react'
import { tumVeriyiSil, yedekAl, yedekYukle } from '../data/backup'
import { eskiYerelVeriOku, type EskiVeri } from '../data/eskiVeri'
import { katilimKoduOlustur, uyeListele } from '../data/api'
import { useVeri } from '../data/hooks'
import { hataMesaji } from '../data/client'
import { useAuth } from '../auth/AuthContext'
import { AI_ANAHTAR_KEY, aiAnahtariOku, aiAnahtariYaz } from '../lib/ai'
import { SayfaBaslik } from '../components/Parcalar'
import { toast } from '../components/Toast'

export default function Ayarlar({ tema, setTema }: { tema: 'light' | 'dark'; setTema: (t: 'light' | 'dark') => void }) {
  const { session, uyelik } = useAuth()
  const [anahtar, setAnahtar] = useState(aiAnahtariOku)
  const [katilimKodu, setKatilimKodu] = useState('')
  const [mesgul, setMesgul] = useState(false)
  const [eskiVeri, setEskiVeri] = useState<EskiVeri | null>(null)
  const [tasiniyor, setTasiniyor] = useState(false)

  const uyeler = useVeri(uyeListele) ?? []
  const sahipMi = uyelik?.rol === 'owner'

  useEffect(() => {
    eskiYerelVeriOku().then(setEskiVeri).catch(() => {})
  }, [])

  async function eskiVeriyiTasi() {
    if (!eskiVeri) return
    if (
      !window.confirm(
        `Bu tarayıcıda eski sürümden kalan ${eskiVeri.urunSayisi} ürün ve ${eskiVeri.talepSayisi} talep bulundu. ` +
          'Buluta aktarılacak ve şirketinizin MEVCUT bulut verisinin yerini alacak. Devam edilsin mi?',
      )
    )
      return
    setTasiniyor(true)
    try {
      await yedekYukle(eskiVeri.json)
      toast('Eski yerel veriler buluta aktarıldı.')
    } catch (e) {
      toast(hataMesaji(e), 'hata')
    } finally {
      setTasiniyor(false)
    }
  }

  async function yedekIndir() {
    try {
      const json = await yedekAl()
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tid-yedek-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast('Yedek indirildi.')
    } catch (e) {
      toast(hataMesaji(e), 'hata')
    }
  }

  async function kodUret() {
    setMesgul(true)
    try {
      setKatilimKodu(await katilimKoduOlustur())
    } catch (e) {
      toast(hataMesaji(e), 'hata')
    } finally {
      setMesgul(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <SayfaBaslik baslik="Ayarlar" aciklama="Şirket, tema, AI anahtarı ve veri yönetimi." />

      {/* Şirket */}
      <div className="kart p-4 md:p-5 mb-4">
        <div className="mikro mb-2 flex items-center gap-1.5">
          <Building2 size={13} aria-hidden /> Şirket
        </div>
        <p className="text-sm text-ink-2 mb-3">
          <strong>{uyelik?.orgAd}</strong> · Hesabınız: {session?.user.email}
          {sahipMi ? ' (şirket sahibi)' : ' (üye)'}
        </p>

        <div className="mb-3">
          <div className="text-xs font-medium text-ink-2 mb-1.5">Ekip ({uyeler.length} kişi)</div>
          <div className="grid gap-1">
            {uyeler.map((u) => (
              <div key={u.userId} className="flex items-center justify-between text-sm bg-surface-2 rounded-lg px-3 py-1.5">
                <span className="truncate">{u.email}</span>
                <span className="text-xs text-ink-3 shrink-0 ml-2">{u.rol === 'owner' ? 'Sahip' : 'Üye'}</span>
              </div>
            ))}
          </div>
        </div>

        {sahipMi && (
          <div>
            <button className="btn btn-ikincil" onClick={kodUret} disabled={mesgul}>
              <UserPlus size={16} aria-hidden />
              {mesgul ? 'Üretiliyor…' : 'Mesai arkadaşı için katılım kodu üret'}
            </button>
            {katilimKodu && (
              <div className="mt-2 flex items-center gap-2 bg-accent-soft text-accent rounded-lg px-3 py-2">
                <span className="font-mono font-bold tracking-wider">{katilimKodu}</span>
                <button
                  className="text-accent hover:opacity-70 p-1"
                  onClick={() =>
                    navigator.clipboard?.writeText(katilimKodu).then(
                      () => toast('Kod kopyalandı.'),
                      () => toast('Kopyalanamadı.', 'hata'),
                    )
                  }
                  aria-label="Kodu kopyala"
                >
                  <Copy size={14} />
                </button>
                <span className="text-xs opacity-80">
                  Tek kullanımlık — arkadaşınız giriş ekranındaki “Şirkete katıl” sekmesinde kullanır.
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tema */}
      <div className="kart p-4 md:p-5 mb-4">
        <div className="mikro mb-2">Görünüm</div>
        <button className="btn btn-ikincil" onClick={() => setTema(tema === 'dark' ? 'light' : 'dark')}>
          {tema === 'dark' ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
          {tema === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'}
        </button>
      </div>

      {/* AI */}
      <div className="kart p-4 md:p-5 mb-4">
        <div className="mikro mb-2 flex items-center gap-1.5">
          <Sparkles size={13} aria-hidden /> AI Özellikleri (opsiyonel)
        </div>
        <p className="text-sm text-ink-2 mb-3">
          Anthropic API anahtarınızı girerseniz iki yardımcı açılır: katalogda olmayan ürünü doğal dilden
          çözümleme ve raporlarda yönetici özeti. Anahtar yalnızca <strong>bu tarayıcıda</strong> saklanır,
          buluta gönderilmez.
        </p>
        <div className="flex gap-2">
          <input
            type="password"
            className="girdi flex-1"
            placeholder="sk-ant-…"
            value={anahtar}
            onChange={(e) => setAnahtar(e.target.value)}
            aria-label="Anthropic API anahtarı"
          />
          <button
            className="btn btn-birincil"
            onClick={() => {
              aiAnahtariYaz(anahtar)
              toast(anahtar.trim() ? 'AI anahtarı kaydedildi.' : 'AI anahtarı kaldırıldı.')
            }}
          >
            Kaydet
          </button>
        </div>
        <p className="text-xs text-ink-3 mt-2">
          Anahtar almak için: console.anthropic.com → API Keys. Kullanılan modeller: claude-haiku-4-5 (çözümleme),
          claude-opus-4-8 (özet). Kayıt anahtarı: {AI_ANAHTAR_KEY}
        </p>
      </div>

      {/* Veri */}
      <div className="kart p-4 md:p-5">
        <div className="mikro mb-2">Veri Yönetimi</div>
        <p className="text-sm text-ink-2 mb-3">
          Verileriniz <strong>bulutta, yalnızca şirketinize özel</strong> olarak saklanır ve her değişiklik
          anında kaydedilir. Tüm cihazlardan aynı veriye erişirsiniz; kullanmak için internet bağlantısı gerekir.
          Eski (tarayıcı içi) sürümden aldığınız JSON yedeği de buradan geri yükleyebilirsiniz.
        </p>
        {eskiVeri && (
          <div className="bg-accent-soft rounded-lg px-3 py-2.5 mb-3 text-sm">
            <div className="text-accent font-medium mb-1.5">
              Bu tarayıcıda eski (bulut öncesi) sürümden kalan veri bulundu:
              {' '}{eskiVeri.urunSayisi.toLocaleString('tr-TR')} ürün, {eskiVeri.talepSayisi} talep.
            </div>
            <button className="btn btn-birincil btn-kucuk" onClick={eskiVeriyiTasi} disabled={tasiniyor}>
              <HardDriveUpload size={14} aria-hidden />
              {tasiniyor ? 'Aktarılıyor…' : 'Eski verileri buluta aktar'}
            </button>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-birincil" onClick={yedekIndir}>
            <Download size={16} aria-hidden /> Yedek indir (JSON)
          </button>
          <label className="btn btn-ikincil cursor-pointer">
            <Upload size={16} aria-hidden /> Yedeği geri yükle
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (!f) return
                if (!window.confirm('Yedek geri yüklenecek ve MEVCUT şirket verisinin yerini alacak. Devam edilsin mi?')) {
                  e.target.value = ''
                  return
                }
                try {
                  await yedekYukle(await f.text())
                  toast('Yedek geri yüklendi.')
                } catch (err) {
                  toast(hataMesaji(err), 'hata')
                }
                e.target.value = ''
              }}
            />
          </label>
          {sahipMi && (
            <button
              className="btn btn-tehlike"
              onClick={async () => {
                if (!window.confirm('Şirketinizin TÜM verileri silinecek (talepler, katalog, müşteriler…). Emin misiniz?')) return
                try {
                  await tumVeriyiSil()
                  toast('Tüm veriler silindi.')
                } catch (e) {
                  toast(hataMesaji(e), 'hata')
                }
              }}
            >
              <Trash2 size={16} aria-hidden /> Tüm veriyi sil
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
