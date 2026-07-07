// Müşteriler ve Tedarikçiler için ortak basit rehber bileşeni.
// `detay` verilirse satırlar tıklanınca altında detay içeriği açılır.
import { Fragment, useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
import type { RehberApi, RehberKaydi } from '../data/api'
import { useVeri } from '../data/hooks'
import { hataMesaji } from '../data/client'
import Modal from './Modal'
import { BosDurum, SayfaBaslik, Yukleniyor } from './Parcalar'
import { toast } from './Toast'
import { trLower } from '../lib/searchWords'

export type { RehberKaydi } from '../data/api'

interface Props {
  baslik: string
  aciklama: string
  tekil: string // "müşteri" | "tedarikçi"
  api: RehberApi
  ekSutun?: { baslik: string; deger: (id: number) => number } // talep sayısı vb.
  detay?: (id: number) => ReactNode // satıra tıklayınca açılan içerik
}

export default function Rehber({ baslik, aciklama, tekil, api, ekSutun, detay }: Props) {
  const [arama, setArama] = useState('')
  const [duzenlenen, setDuzenlenen] = useState<RehberKaydi | null>(null)
  const [modalAcik, setModalAcik] = useState(false)
  const [form, setForm] = useState<RehberKaydi>({ ad: '', telefon: '', email: '' })
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [acikId, setAcikId] = useState<number | null>(null)

  const sutunSayisi = 4 + (detay ? 1 : 0) + (ekSutun ? 1 : 0)

  const kayitlarHam = useVeri(api.listele)
  const kayitlar = kayitlarHam ?? []
  const filtreli = kayitlar.filter((k) => !arama.trim() || trLower(k.ad).includes(trLower(arama.trim())))

  function ac(kayit?: RehberKaydi) {
    setDuzenlenen(kayit ?? null)
    setForm(kayit ? { ...kayit } : { ad: '', telefon: '', email: '' })
    setModalAcik(true)
  }

  async function kaydet() {
    if (!form.ad.trim()) {
      toast('Ad zorunludur.', 'hata')
      return
    }
    if (kaydediliyor) return
    setKaydediliyor(true)
    try {
      if (duzenlenen?.id) {
        await api.guncelle(duzenlenen.id, { ad: form.ad.trim(), telefon: form.telefon, email: form.email })
        toast('Güncellendi.')
      } else {
        await api.ekle({ ad: form.ad.trim(), telefon: form.telefon, email: form.email })
        toast('Eklendi.')
      }
      setModalAcik(false)
    } catch (e) {
      toast(hataMesaji(e), 'hata')
    } finally {
      setKaydediliyor(false)
    }
  }

  return (
    <div>
      <SayfaBaslik
        baslik={baslik}
        aciklama={aciklama}
        sag={
          <button className="btn btn-birincil" onClick={() => ac()}>
            <Plus size={16} aria-hidden /> Yeni {tekil}
          </button>
        }
      />

      <input
        className="girdi max-w-md mb-3"
        placeholder={`${baslik} içinde ara…`}
        value={arama}
        onChange={(e) => setArama(e.target.value)}
      />

      {kayitlarHam === undefined ? (
        <Yukleniyor />
      ) : filtreli.length === 0 ? (
        <BosDurum mesaj={`Kayıtlı ${tekil} yok`} />
      ) : (
        <div className="kart overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-line bg-surface-2">
                {detay && <th className="pl-3 w-6" aria-label="Aç/kapat"></th>}
                <th className="px-4 py-2.5 font-semibold">Ad</th>
                <th className="px-4 py-2.5 font-semibold">Telefon</th>
                <th className="px-4 py-2.5 font-semibold">E-posta</th>
                {ekSutun && <th className="px-4 py-2.5 font-semibold">{ekSutun.baslik}</th>}
                <th className="px-2 py-2.5" aria-label="İşlemler"></th>
              </tr>
            </thead>
            <tbody>
              {filtreli.map((k) => (
                <Fragment key={k.id}>
                  <tr
                    className={`border-b border-line last:border-b-0 hover:bg-surface-2 ${detay ? 'cursor-pointer' : ''}`}
                    onClick={detay ? () => setAcikId(acikId === k.id ? null : k.id!) : undefined}
                    aria-expanded={detay ? acikId === k.id : undefined}
                  >
                    {detay && (
                      <td className="pl-3 py-2.5 text-ink-3">
                        {acikId === k.id ? <ChevronDown size={15} aria-hidden /> : <ChevronRight size={15} aria-hidden />}
                      </td>
                    )}
                    <td className="px-4 py-2.5 font-medium">{k.ad}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">{k.telefon || '—'}</td>
                    <td className="px-4 py-2.5">{k.email || '—'}</td>
                    {ekSutun && (
                      <td className="px-4 py-2.5">
                        <span className="bg-accent-soft text-accent rounded-full px-2.5 py-0.5 text-xs font-semibold tnum">
                          {ekSutun.deger(k.id!)}
                        </span>
                      </td>
                    )}
                    <td className="px-2 py-2.5 whitespace-nowrap">
                      <button
                        className="text-ink-3 hover:text-accent p-1"
                        onClick={(e) => {
                          e.stopPropagation()
                          ac(k)
                        }}
                        aria-label="Düzenle"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="text-ink-3 hover:text-bad p-1"
                        onClick={async (e) => {
                          e.stopPropagation()
                          if (!window.confirm(`"${k.ad}" silinsin mi?`)) return
                          try {
                            await api.sil(k.id!)
                            toast('Silindi.')
                          } catch (err) {
                            toast(hataMesaji(err), 'hata')
                          }
                        }}
                        aria-label="Sil"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                  {detay && acikId === k.id && (
                    <tr className="border-b border-line last:border-b-0">
                      <td colSpan={sutunSayisi} className="bg-surface-2 px-4 py-3">
                        {detay(k.id!)}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal baslik={duzenlenen ? `${tekil} düzenle` : `Yeni ${tekil}`} acik={modalAcik} kapat={() => setModalAcik(false)}>
        <div className="grid gap-3">
          <div>
            <label className="text-xs font-medium text-ink-2 block mb-1">Ad *</label>
            <input className="girdi" value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-2 block mb-1">Telefon</label>
            <input className="girdi" value={form.telefon} onChange={(e) => setForm({ ...form, telefon: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-2 block mb-1">E-posta</label>
            <input className="girdi" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 mt-1">
            <button className="btn btn-ikincil" onClick={() => setModalAcik(false)}>Vazgeç</button>
            <button className="btn btn-birincil" onClick={kaydet} disabled={kaydediliyor}>
              {kaydediliyor ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
