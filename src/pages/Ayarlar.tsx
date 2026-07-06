import { useEffect, useState } from 'react'
import { Download, Moon, RefreshCw, Sparkles, Sun, Trash2, Upload } from 'lucide-react'
import { ayarOku, ayarYaz, tumVeriyiSil, yedekAl, yedekYukle } from '../db'
import { AI_ANAHTAR_KEY } from '../lib/ai'
import { ornekVeriYukle } from '../seed'
import { SayfaBaslik } from '../components/Parcalar'
import { toast } from '../components/Toast'

export default function Ayarlar({ tema, setTema }: { tema: 'light' | 'dark'; setTema: (t: 'light' | 'dark') => void }) {
  const [anahtar, setAnahtar] = useState('')
  const [yuklendi, setYuklendi] = useState(false)
  const [kalici, setKalici] = useState<boolean | null>(null)

  useEffect(() => {
    ayarOku(AI_ANAHTAR_KEY).then((v) => {
      setAnahtar(v)
      setYuklendi(true)
    })
    // Kalıcı depolama iste ve durumu göster
    navigator.storage
      ?.persist?.()
      .then(setKalici)
      .catch(() => setKalici(null))
  }, [])

  async function yedekIndir() {
    const json = await yedekAl()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `paslanmaz-yedek-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast('Yedek indirildi.')
  }

  return (
    <div className="max-w-2xl">
      <SayfaBaslik baslik="Ayarlar" aciklama="Tema, AI anahtarı ve veri yönetimi." />

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
          çözümleme ve raporlarda yönetici özeti. Anahtar yalnızca <strong>bu tarayıcıda</strong> saklanır.
        </p>
        <div className="flex gap-2">
          <input
            type="password"
            className="girdi flex-1"
            placeholder="sk-ant-…"
            value={anahtar}
            onChange={(e) => setAnahtar(e.target.value)}
            disabled={!yuklendi}
            aria-label="Anthropic API anahtarı"
          />
          <button
            className="btn btn-birincil"
            onClick={async () => {
              await ayarYaz(AI_ANAHTAR_KEY, anahtar.trim())
              toast(anahtar.trim() ? 'AI anahtarı kaydedildi.' : 'AI anahtarı kaldırıldı.')
            }}
          >
            Kaydet
          </button>
        </div>
        <p className="text-xs text-ink-3 mt-2">
          Anahtar almak için: console.anthropic.com → API Keys. Kullanılan modeller: claude-haiku-4-5 (çözümleme),
          claude-opus-4-8 (özet).
        </p>
      </div>

      {/* Veri */}
      <div className="kart p-4 md:p-5">
        <div className="mikro mb-2">Veri Yönetimi</div>
        <p className="text-sm text-ink-2 mb-2">
          Tüm veriler <strong>anında ve otomatik</strong> olarak bu tarayıcının içine (IndexedDB) kaydedilir —
          kaydet düğmesine gerek yoktur ve internete gönderilmez. Veriler siteye ve tarayıcıya özeldir:
          her zaman aynı adresi ve aynı tarayıcıyı kullanın.
        </p>
        {kalici !== null && (
          <p className={`text-sm font-medium mb-3 ${kalici ? 'text-ok' : 'text-warn'}`}>
            {kalici
              ? '✓ Kalıcı depolama aktif — tarayıcı verilerinizi otomatik silmez.'
              : '⚠ Kalıcı depolama izni verilmedi — güvence için düzenli JSON yedek alın.'}
          </p>
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
                try {
                  await yedekYukle(await f.text())
                  toast('Yedek geri yüklendi.')
                } catch {
                  toast('Yedek dosyası okunamadı.', 'hata')
                }
                e.target.value = ''
              }}
            />
          </label>
          <button
            className="btn btn-ikincil"
            onClick={async () => {
              await ornekVeriYukle()
              toast('Örnek veri yüklendi.')
            }}
          >
            <RefreshCw size={16} aria-hidden /> Örnek veriyi yükle
          </button>
          <button
            className="btn btn-tehlike"
            onClick={async () => {
              if (!window.confirm('TÜM veriler silinecek (talepler, katalog, müşteriler…). Emin misiniz?')) return
              await tumVeriyiSil()
              toast('Tüm veriler silindi.')
            }}
          >
            <Trash2 size={16} aria-hidden /> Tüm veriyi sil
          </button>
        </div>
      </div>
    </div>
  )
}
