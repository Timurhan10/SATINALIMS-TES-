import { useMemo, useState } from 'react'
import { Plus, Sparkles, Trash2 } from 'lucide-react'
import {
  musteriApi, musteriListele, talepGuncelle, talepListele, talepSil, talepToptanEkle,
  urunEkle, urunListele,
} from '../data/api'
import { useVeri } from '../data/hooks'
import { hataMesaji } from '../data/client'
import type { Demand, DemandDurum, Kalite, Product } from '../types'
import { DURUM_ETIKET, KAYIP_NEDENLERI } from '../types'
import { parseSerbestMetin, trUpper } from '../lib/parser'
import { trLower } from '../lib/searchWords'
import { bugunYerel } from '../lib/tarih'
import { aiAnahtarVarMi, urunCozumle } from '../lib/ai'
import ProductSearch from '../components/ProductSearch'
import CustomerCombobox from '../components/CustomerCombobox'
import Modal from '../components/Modal'
import { AdetKutusu, BosDurum, DurumRozeti, SayfaBaslik, Yukleniyor } from '../components/Parcalar'
import { toast } from '../components/Toast'

interface SecimSatiri {
  urun: Product
  adet: number
}

/** Müşteri adından id bulur; yoksa oluşturur. İki kişinin aynı anda aynı yeni
 *  firmayı kaydetmesi durumuna karşı: ekleme çakışırsa liste yeniden okunur. */
async function musteriIdBul(ad: string): Promise<number> {
  const temiz = ad.trim()
  const bul = (liste: Awaited<ReturnType<typeof musteriListele>>) =>
    liste.find((m) => trLower(m.ad) === trLower(temiz))
  const mevcut = bul(await musteriListele())
  if (mevcut?.id) return mevcut.id
  try {
    return (await musteriApi.ekle({ ad: temiz, telefon: '', email: '' })).id!
  } catch (e) {
    const tekrar = bul(await musteriListele())
    if (tekrar?.id) return tekrar.id
    throw e
  }
}

export default function Talepler() {
  // ---- yeni talep formu ----
  const [firma, setFirma] = useState('')
  const [firmaHata, setFirmaHata] = useState(false)
  const [tarih, setTarih] = useState(bugunYerel())
  const [metin, setMetin] = useState('')
  const [secililer, setSecililer] = useState<Map<number, SecimSatiri>>(new Map())
  const [genelAdet, setGenelAdet] = useState('1') // katalogsuz talep için
  const [durum, setDurum] = useState<DemandDurum>('BEKLEMEDE')
  const [kayipNedeni, setKayipNedeni] = useState<string>(KAYIP_NEDENLERI[0])
  const [elleAcik, setElleAcik] = useState(false)
  const [aiCalisiyor, setAiCalisiyor] = useState(false)
  const [kaydediliyor, setKaydediliyor] = useState(false)

  const aiVar = aiAnahtarVarMi()

  // ---- liste filtreleri ----
  const [listeArama, setListeArama] = useState('')
  const [listeDurum, setListeDurum] = useState<DemandDurum | ''>('')

  const taleplerHam = useVeri(talepListele)
  const talepler = taleplerHam ?? []
  const musteriler = useVeri(musteriListele) ?? []
  const urunler = useVeri(urunListele) ?? []

  const musteriAd = useMemo(() => new Map(musteriler.map((m) => [m.id, m.ad])), [musteriler])
  const urunMap = useMemo(() => new Map(urunler.map((u) => [u.id, u])), [urunler])

  const goruntulenen = useMemo(() => {
    const q = trLower(listeArama.trim())
    return talepler.filter((t) => {
      if (listeDurum && t.durum !== listeDurum) return false
      if (!q) return true
      const urunAd = t.productId ? urunMap.get(t.productId)?.aciklama ?? '' : ''
      const firmaAd = musteriAd.get(t.customerId) ?? ''
      return trLower(`${t.serbestMetin} ${urunAd} ${firmaAd}`).includes(q)
    })
  }, [talepler, listeArama, listeDurum, urunMap, musteriAd])

  function toggleUrun(u: Product) {
    if (u.id === undefined) return
    setSecililer((eski) => {
      const yeni = new Map(eski)
      if (yeni.has(u.id!)) yeni.delete(u.id!)
      else yeni.set(u.id!, { urun: u, adet: 1 })
      return yeni
    })
  }

  function adetDegistir(id: number, adet: number) {
    setSecililer((eski) => {
      const yeni = new Map(eski)
      const s = yeni.get(id)
      if (s) yeni.set(id, { ...s, adet: Math.max(1, adet) })
      return yeni
    })
  }

  async function kaydet(katalogsuz = false) {
    if (kaydediliyor) return
    if (!firma.trim()) {
      setFirmaHata(true)
      toast('Firma/müşteri adı zorunludur.', 'hata')
      return
    }
    const satirlar = [...secililer.values()]
    if (satirlar.length === 0 && !katalogsuz) {
      toast('En az bir ürün seçin veya katalogsuz talep kaydedin.', 'hata')
      return
    }
    setKaydediliyor(true)
    try {
      const customerId = await musteriIdBul(firma)
      const imza = parseSerbestMetin(metin)
      const kaynaklar: Array<{ urun: Product | null; adet: number }> = katalogsuz
        ? [{ urun: null, adet: Math.max(1, parseInt(genelAdet, 10) || 1) }]
        : satirlar.map((s) => ({ urun: s.urun, adet: s.adet }))
      const kayitlar: Demand[] = kaynaklar.map(({ urun: u, adet }) => ({
        tarih,
        customerId,
        productId: u?.id ?? null,
        serbestMetin: metin.trim() || (u?.aciklama ?? ''),
        grup: u?.grup ?? imza.grup,
        standart: u?.standart ?? imza.standart,
        olcu: u?.olcu ?? imza.olcu,
        boyMm: u?.boyMm ?? imza.boyMm,
        kalite: (u?.kalite ?? imza.kalite) as Kalite,
        durum,
        kayipNedeni: durum === 'VERILMEDI' ? kayipNedeni : '',
        adet,
        createdAt: Date.now(),
      }))
      await talepToptanEkle(kayitlar)
      toast(`${kayitlar.length} talep kaydedildi.`)
      setSecililer(new Map())
      setMetin('')
      setFirma('')
      setGenelAdet('1')
      setFirmaHata(false)
    } catch (e) {
      toast(hataMesaji(e), 'hata')
    } finally {
      setKaydediliyor(false)
    }
  }

  async function aiIleDoldur() {
    if (!metin.trim()) return
    setAiCalisiyor(true)
    try {
      const c = await urunCozumle(metin)
      const yeni = await urunEkle({
        kartKodu: `AI-${Date.now()}`,
        aciklama: trUpper(c.aciklama),
        grup: trUpper(c.grup),
        standart: c.standart,
        standartAdi: c.standartAdi,
        basTipi: '',
        olcu: c.olcu,
        boyMm: c.boyMm,
        boyutMetni: c.olcu !== null ? (c.boyMm !== null ? `M${c.olcu}x${c.boyMm}` : `M${c.olcu}`) : '',
        kalite: c.kalite,
        disTipi: c.olcu !== null ? 'metrik' : '',
        kaynak: 'ai',
        inCatalog: false,
      })
      setSecililer((eski) => new Map(eski).set(yeni.id!, { urun: yeni, adet: 1 }))
      toast(`AI ürünü oluşturdu: ${yeni.aciklama}`)
    } catch (e) {
      toast(hataMesaji(e), 'hata')
    } finally {
      setAiCalisiyor(false)
    }
  }

  async function durumGuncelle(t: Demand, yeniDurum: DemandDurum) {
    try {
      await talepGuncelle(t.id!, {
        durum: yeniDurum,
        kayipNedeni: yeniDurum === 'VERILMEDI' ? t.kayipNedeni || KAYIP_NEDENLERI[0] : '',
      })
      toast('Durum güncellendi.')
    } catch (e) {
      toast(hataMesaji(e), 'hata')
    }
  }

  async function talepDuzelt(id: number, patch: Partial<Demand>) {
    try {
      await talepGuncelle(id, patch)
    } catch (e) {
      toast(hataMesaji(e), 'hata')
    }
  }

  return (
    <div>
      <SayfaBaslik
        baslik="Talepler"
        aciklama="Müşterinin sorduğu her ürünü kaydedin — verilemeyenler de veri olarak değerlidir."
      />

      {/* Yeni talep */}
      <div className="kart p-4 md:p-5 mb-6">
        <div className="mikro mb-3">Yeni Talep</div>
        <div className="grid gap-3 md:grid-cols-[1fr_170px]">
          <div>
            <label className="text-xs font-medium text-ink-2 block mb-1">
              Firma / Müşteri <span className="text-bad">*</span>
            </label>
            <CustomerCombobox deger={firma} setDeger={(v) => { setFirma(v); setFirmaHata(false) }} hata={firmaHata} />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-2 block mb-1">Tarih</label>
            <input type="date" className="girdi" value={tarih} onChange={(e) => setTarih(e.target.value)} />
          </div>
        </div>

        <div className="mt-3">
          <label className="text-xs font-medium text-ink-2 block mb-1">Ürün ara ve seç (çoklu seçim)</label>
          <ProductSearch
            metin={metin}
            setMetin={setMetin}
            seciliIdler={new Set(secililer.keys())}
            onToggle={toggleUrun}
            sonucYokAlani={
              <div className="flex flex-wrap justify-center gap-2">
                {aiVar && (
                  <button className="btn btn-birincil btn-kucuk" onClick={aiIleDoldur} disabled={aiCalisiyor}>
                    <Sparkles size={14} aria-hidden />
                    {aiCalisiyor ? 'AI çözümlüyor…' : 'AI ile doldur'}
                  </button>
                )}
                <button className="btn btn-ikincil btn-kucuk" onClick={() => setElleAcik(true)}>
                  <Plus size={14} aria-hidden /> Elle yeni ürün
                </button>
                <button className="btn btn-ikincil btn-kucuk" onClick={() => kaydet(true)} disabled={kaydediliyor}>
                  Katalogsuz talep kaydet
                </button>
              </div>
            }
          />
        </div>

        {secililer.size > 0 && (
          <div className="mt-3 grid gap-1.5">
            <div className="mikro">Seçilen ürünler ve adetleri</div>
            {[...secililer.values()].map(({ urun: u, adet }) => (
              <div key={u.id} className="flex items-center gap-2 bg-accent-soft rounded-lg px-3 py-1.5">
                <span className="flex-1 text-sm font-medium text-accent truncate">{u.aciklama}</span>
                <label className="text-xs text-ink-3" htmlFor={`adet-${u.id}`}>Adet</label>
                <input
                  id={`adet-${u.id}`}
                  type="number"
                  min={1}
                  className="girdi !py-1 w-20 tnum text-sm"
                  value={adet}
                  onChange={(e) => adetDegistir(u.id!, parseInt(e.target.value, 10) || 1)}
                />
                <button
                  className="text-ink-3 hover:text-bad p-1"
                  onClick={() => toggleUrun(u)}
                  aria-label={`${u.aciklama} kaldır`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-medium text-ink-2 block mb-1">Durum</label>
            <select className="girdi w-auto" value={durum} onChange={(e) => setDurum(e.target.value as DemandDurum)}>
              {(Object.keys(DURUM_ETIKET) as DemandDurum[]).map((d) => (
                <option key={d} value={d}>{DURUM_ETIKET[d]}</option>
              ))}
            </select>
          </div>
          {secililer.size === 0 && (
            <div>
              <label className="text-xs font-medium text-ink-2 block mb-1">Adet (katalogsuz)</label>
              <input
                type="number"
                min={1}
                className="girdi w-24 tnum"
                value={genelAdet}
                onChange={(e) => setGenelAdet(e.target.value)}
                aria-label="Katalogsuz talep adedi"
              />
            </div>
          )}
          {durum === 'VERILMEDI' && (
            <div>
              <label className="text-xs font-medium text-ink-2 block mb-1">Kayıp nedeni</label>
              <select className="girdi w-auto" value={kayipNedeni} onChange={(e) => setKayipNedeni(e.target.value)}>
                {KAYIP_NEDENLERI.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          )}
          <button className="btn btn-birincil" onClick={() => kaydet()} disabled={kaydediliyor}>
            <Plus size={16} aria-hidden />
            {kaydediliyor ? 'Kaydediliyor…' : secililer.size > 1 ? `${secililer.size} talep kaydet` : 'Talebi kaydet'}
          </button>
        </div>
      </div>

      {/* Talep listesi */}
      <div className="flex flex-wrap gap-2 mb-3">
        <input
          className="girdi flex-1 min-w-52"
          placeholder="Talep listesinde ara (firma, ürün, metin)…"
          value={listeArama}
          onChange={(e) => setListeArama(e.target.value)}
        />
        <select className="girdi w-auto" value={listeDurum} onChange={(e) => setListeDurum(e.target.value as DemandDurum | '')}>
          <option value="">Tüm durumlar</option>
          {(Object.keys(DURUM_ETIKET) as DemandDurum[]).map((d) => (
            <option key={d} value={d}>{DURUM_ETIKET[d]}</option>
          ))}
        </select>
      </div>

      {taleplerHam === undefined ? (
        <Yukleniyor />
      ) : goruntulenen.length === 0 ? (
        <BosDurum mesaj="Kayıtlı talep yok" alt="Yukarıdaki formdan ilk talebi ekleyin." />
      ) : (
        <div className="kart overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-line bg-surface-2">
                <th className="px-4 py-2.5 font-semibold">Tarih</th>
                <th className="px-4 py-2.5 font-semibold">Firma</th>
                <th className="px-4 py-2.5 font-semibold">Ürün / Talep</th>
                <th className="px-4 py-2.5 font-semibold">Adet</th>
                <th className="px-4 py-2.5 font-semibold">Durum</th>
                <th className="px-4 py-2.5 font-semibold">Kayıp nedeni</th>
                <th className="px-2 py-2.5" aria-label="İşlemler"></th>
              </tr>
            </thead>
            <tbody>
              {goruntulenen.map((t) => {
                const u = t.productId ? urunMap.get(t.productId) : undefined
                return (
                  <tr key={t.id} className="border-b border-line last:border-b-0 align-top">
                    <td className="px-4 py-2.5 whitespace-nowrap">{t.tarih}</td>
                    <td className="px-4 py-2.5">{musteriAd.get(t.customerId) ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium">{u?.aciklama ?? t.serbestMetin}</div>
                      {u && t.serbestMetin && t.serbestMetin !== u.aciklama && (
                        <div className="text-xs text-ink-3">“{t.serbestMetin}”</div>
                      )}
                      {!u && <div className="text-xs text-warn">katalog dışı</div>}
                    </td>
                    <td className="px-4 py-2.5">
                      <AdetKutusu deger={t.adet} onKaydet={(n) => talepDuzelt(t.id!, { adet: n })} />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <DurumRozeti durum={t.durum} />
                        <select
                          className="girdi w-auto btn-kucuk !py-1 !px-2 text-xs"
                          value={t.durum}
                          onChange={(e) => durumGuncelle(t, e.target.value as DemandDurum)}
                          aria-label="Durumu değiştir"
                        >
                          {(Object.keys(DURUM_ETIKET) as DemandDurum[]).map((d) => (
                            <option key={d} value={d}>{DURUM_ETIKET[d]}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      {t.durum === 'VERILMEDI' ? (
                        <select
                          className="girdi w-auto !py-1 !px-2 text-xs"
                          value={t.kayipNedeni || KAYIP_NEDENLERI[0]}
                          onChange={(e) => talepDuzelt(t.id!, { kayipNedeni: e.target.value })}
                          aria-label="Kayıp nedeni"
                        >
                          {KAYIP_NEDENLERI.map((n) => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-ink-3">—</span>
                      )}
                    </td>
                    <td className="px-2 py-2.5">
                      <button
                        className="text-ink-3 hover:text-bad p-1"
                        onClick={async () => {
                          if (!window.confirm('Bu talep silinsin mi?')) return
                          try {
                            await talepSil(t.id!)
                            toast('Talep silindi.')
                          } catch (e) {
                            toast(hataMesaji(e), 'hata')
                          }
                        }}
                        aria-label="Talebi sil"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <ElleUrunModal acik={elleAcik} kapat={() => setElleAcik(false)} onOlustu={(u) => {
        if (u.id !== undefined) setSecililer((eski) => new Map(eski).set(u.id!, { urun: u, adet: 1 }))
      }} varsayilanMetin={metin} />
    </div>
  )
}

// Elle yeni ürün ekleme (Katalog sayfasında da kullanılır)
export function ElleUrunModal({
  acik, kapat, onOlustu, varsayilanMetin = '',
}: {
  acik: boolean
  kapat: () => void
  onOlustu?: (u: Product) => void
  varsayilanMetin?: string
}) {
  const [aciklama, setAciklama] = useState(varsayilanMetin)
  const [grup, setGrup] = useState('')
  const [din, setDin] = useState('')
  const [olcu, setOlcu] = useState('')
  const [boy, setBoy] = useState('')
  const [kalite, setKalite] = useState<Kalite>('')

  async function olustur() {
    if (!aciklama.trim()) {
      toast('Açıklama zorunludur.', 'hata')
      return
    }
    const olcuN = olcu ? parseFloat(olcu.replace(',', '.')) : null
    const boyN = boy ? parseFloat(boy.replace(',', '.')) : null
    try {
      const u = await urunEkle({
        kartKodu: `MAN-${Date.now()}`,
        aciklama: trUpper(aciklama.trim()),
        grup: trUpper(grup.trim()),
        standart: din.trim() ? `DIN ${din.trim().replace(/^din\s*/i, '')}` : '',
        standartAdi: '',
        basTipi: '',
        olcu: Number.isFinite(olcuN) ? olcuN : null,
        boyMm: Number.isFinite(boyN) ? boyN : null,
        boyutMetni: olcuN ? (boyN ? `M${olcu}x${boy}` : `M${olcu}`) : '',
        kalite,
        disTipi: olcuN ? 'metrik' : '',
        kaynak: 'manuel',
        inCatalog: false,
      })
      toast('Ürün eklendi.')
      if (onOlustu) onOlustu(u)
      kapat()
      setAciklama('')
      setGrup('')
      setDin('')
      setOlcu('')
      setBoy('')
      setKalite('')
    } catch (e) {
      toast(hataMesaji(e), 'hata')
    }
  }

  return (
    <Modal baslik="Elle Yeni Ürün" acik={acik} kapat={kapat}>
      <div className="grid gap-3">
        <div>
          <label className="text-xs font-medium text-ink-2 block mb-1">Açıklama *</label>
          <input className="girdi" value={aciklama} onChange={(e) => setAciklama(e.target.value)} placeholder="KELEBEK SOMUN M6 A2" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-ink-2 block mb-1">Grup</label>
            <input className="girdi" value={grup} onChange={(e) => setGrup(e.target.value)} placeholder="SOMUN" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-2 block mb-1">DIN no</label>
            <input className="girdi" value={din} onChange={(e) => setDin(e.target.value)} placeholder="315" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-ink-2 block mb-1">Ölçü (M)</label>
            <input className="girdi" value={olcu} onChange={(e) => setOlcu(e.target.value)} placeholder="6" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-2 block mb-1">Boy (mm)</label>
            <input className="girdi" value={boy} onChange={(e) => setBoy(e.target.value)} placeholder="30" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-2 block mb-1">Kalite</label>
            <select className="girdi" value={kalite} onChange={(e) => setKalite(e.target.value as Kalite)}>
              <option value="">—</option>
              <option value="A2">A2</option>
              <option value="A4">A4</option>
              <option value="420">420</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-2">
          <button className="btn btn-ikincil" onClick={kapat}>Vazgeç</button>
          <button className="btn btn-birincil" onClick={olustur}>Ürünü ekle</button>
        </div>
      </div>
    </Modal>
  )
}
