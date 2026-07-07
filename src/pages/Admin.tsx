// Platform yönetimi: satılacak davet kodlarını üret ve takip et.
// Yalnız platform yöneticisine görünür; yetki sunucuda da doğrulanır.
import { useState } from 'react'
import { Copy, KeyRound, Plus } from 'lucide-react'
import { davetKodlariListele, davetKoduOlustur } from '../data/api'
import { useVeri } from '../data/hooks'
import { hataMesaji } from '../data/client'
import { BosDurum, SayfaBaslik } from '../components/Parcalar'
import { toast } from '../components/Toast'

export default function Admin() {
  const [adet, setAdet] = useState('1')
  const [not_, setNot] = useState('')
  const [calisiyor, setCalisiyor] = useState(false)

  const kodlar = useVeri(davetKodlariListele) ?? []

  async function uret() {
    const n = Math.max(1, Math.min(50, parseInt(adet, 10) || 1))
    setCalisiyor(true)
    try {
      const yeni = await davetKoduOlustur(n, not_.trim())
      toast(`${yeni.length} davet kodu üretildi.`)
      setNot('')
    } catch (e) {
      toast(hataMesaji(e), 'hata')
    } finally {
      setCalisiyor(false)
    }
  }

  function kopyala(kod: string) {
    navigator.clipboard?.writeText(kod).then(
      () => toast('Kod kopyalandı.'),
      () => toast('Kopyalanamadı.', 'hata'),
    )
  }

  const kullanilmayan = kodlar.filter((k) => !k.usedAt).length

  return (
    <div>
      <SayfaBaslik
        baslik="Platform Yönetimi"
        aciklama={`Sattığınız her şirkete bir davet kodu verin · ${kullanilmayan} kullanılmamış kod var.`}
      />

      <div className="kart p-4 md:p-5 mb-5">
        <div className="mikro mb-2 flex items-center gap-1.5">
          <KeyRound size={13} aria-hidden /> Davet kodu üret
        </div>
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="text-xs font-medium text-ink-2 block mb-1">Adet</label>
            <input
              type="number"
              min={1}
              max={50}
              className="girdi w-24 tnum"
              value={adet}
              onChange={(e) => setAdet(e.target.value)}
            />
          </div>
          <div className="flex-1 min-w-48">
            <label className="text-xs font-medium text-ink-2 block mb-1">Not (isteğe bağlı)</label>
            <input
              className="girdi"
              placeholder="Örn. Mart satışı — Yılmaz Hırdavat"
              value={not_}
              onChange={(e) => setNot(e.target.value)}
            />
          </div>
          <button className="btn btn-birincil" onClick={uret} disabled={calisiyor}>
            <Plus size={16} aria-hidden /> {calisiyor ? 'Üretiliyor…' : 'Üret'}
          </button>
        </div>
      </div>

      {kodlar.length === 0 ? (
        <BosDurum mesaj="Henüz davet kodu yok" alt="Yukarıdan ilk kodları üretin." />
      ) : (
        <div className="kart overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-line bg-surface-2">
                <th className="px-4 py-2.5 font-semibold">Kod</th>
                <th className="px-4 py-2.5 font-semibold">Not</th>
                <th className="px-4 py-2.5 font-semibold">Oluşturulma</th>
                <th className="px-4 py-2.5 font-semibold">Durum</th>
                <th className="px-2 py-2.5" aria-label="İşlemler"></th>
              </tr>
            </thead>
            <tbody>
              {kodlar.map((k) => (
                <tr key={k.code} className="border-b border-line last:border-b-0">
                  <td className="px-4 py-2.5 font-mono font-semibold whitespace-nowrap">{k.code}</td>
                  <td className="px-4 py-2.5">{k.note || '—'}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {new Date(k.createdAt).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {k.usedAt ? (
                      <span className="bg-ok-soft text-ok rounded-full px-2.5 py-0.5 text-xs font-semibold">
                        Kullanıldı · {new Date(k.usedAt).toLocaleDateString('tr-TR')}
                      </span>
                    ) : (
                      <span className="bg-accent-soft text-accent rounded-full px-2.5 py-0.5 text-xs font-semibold">
                        Satışa hazır
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2.5">
                    {!k.usedAt && (
                      <button
                        className="text-ink-3 hover:text-accent p-1"
                        onClick={() => kopyala(k.code)}
                        aria-label="Kodu kopyala"
                      >
                        <Copy size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
