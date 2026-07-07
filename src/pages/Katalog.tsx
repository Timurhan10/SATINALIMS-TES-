import { useEffect, useMemo, useRef, useState } from 'react'
import { FileSpreadsheet, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { urunGuncelle, urunIdleriyleSil, urunListele, urunSil, urunToptanEkle } from '../data/api'
import { useVeri } from '../data/hooks'
import { hataMesaji } from '../data/client'
import type { Kalite, Product } from '../types'
import { parseSerbestMetin, trUpper } from '../lib/parser'
import { urunEslestir, urunSirala } from '../lib/match'
import { katalogExcelOku } from '../lib/excel'
import Modal from '../components/Modal'
import { KALITELER } from '../components/ProductSearch'
import { BosDurum, SayfaBaslik, Yukleniyor } from '../components/Parcalar'
import { toast } from '../components/Toast'
import { ElleUrunModal } from './Talepler'

const SAYFA_BOYU = 100

export default function Katalog() {
  const [arama, setArama] = useState('')
  const [grup, setGrup] = useState('')
  const [kalite, setKalite] = useState<Kalite | ''>('')
  const [limit, setLimit] = useState(SAYFA_BOYU)
  const [duzeltilen, setDuzeltilen] = useState<Product | null>(null)
  const [ekleAcik, setEkleAcik] = useState(false)
  const [importDosya, setImportDosya] = useState<File | null>(null)
  const [importCalisiyor, setImportCalisiyor] = useState(false)
  const [surukleniyor, setSurukleniyor] = useState(false)
  const dosyaInput = useRef<HTMLInputElement>(null)

  const urunlerHam = useVeri(urunListele)
  const urunler = urunlerHam ?? []

  // Arama her tuşta değil, yazma durunca (250 ms) çalışsın — büyük katalogda takılmayı önler.
  const [aramaGecikmeli, setAramaGecikmeli] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setAramaGecikmeli(arama), 250)
    return () => clearTimeout(t)
  }, [arama])

  const gruplar = useMemo(
    () => [...new Set(urunler.map((u) => u.grup).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr')),
    [urunler],
  )

  const sonuclar = useMemo(() => {
    if (!aramaGecikmeli.trim() && !grup && !kalite) {
      return [...urunler].sort(urunSirala)
    }
    const imza = parseSerbestMetin(aramaGecikmeli)
    return urunEslestir(urunler, imza, aramaGecikmeli, grup, kalite, 100000).urunler
  }, [urunler, aramaGecikmeli, grup, kalite])

  async function excelYukle(dosya: File, mod: 'degistir' | 'birlestir') {
    setImportCalisiyor(true)
    try {
      const { urunler: yeni, atlanan } = await katalogExcelOku(dosya)
      if (yeni.length === 0) {
        toast('Dosyada geçerli ürün satırı bulunamadı.', 'hata')
        return
      }
      if (mod === 'degistir') {
        // Önce yükle/güncelle, başarılıysa yeni dosyada olmayan eski Excel ürünlerini sil:
        // işlem ortada kesilirse katalog kaybolmaz. Elle/AI eklenen ürünler korunur.
        await urunToptanEkle(yeni, true)
        const yeniKodlar = new Set(yeni.map((u) => u.kartKodu))
        const artiklar = urunler
          .filter((u) => u.kaynak === 'katalog' && !yeniKodlar.has(u.kartKodu))
          .map((u) => u.id!)
        await urunIdleriyleSil(artiklar)
      } else {
        // Birleştir: yalnız yeni kart kodları eklenir, mevcutlara dokunulmaz.
        await urunToptanEkle(yeni)
      }
      toast(`${yeni.length} ürün içe aktarıldı${atlanan ? ` (${atlanan} satır atlandı)` : ''}.`)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Excel okunamadı.', 'hata')
    } finally {
      setImportCalisiyor(false)
      setImportDosya(null)
    }
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setSurukleniyor(true)
      }}
      onDragLeave={() => setSurukleniyor(false)}
      onDrop={(e) => {
        e.preventDefault()
        setSurukleniyor(false)
        const f = e.dataTransfer.files?.[0]
        if (f) setImportDosya(f)
      }}
    >
      <SayfaBaslik
        baslik="Katalog"
        aciklama={`${urunler.length.toLocaleString('tr-TR')} ürün · stok takibi yok, veri kontrolü var.`}
        sag={
          <>
            <button className="btn btn-ikincil" onClick={() => dosyaInput.current?.click()}>
              <FileSpreadsheet size={16} aria-hidden /> Excel içe aktar
            </button>
            <button className="btn btn-birincil" onClick={() => setEkleAcik(true)}>
              <Plus size={16} aria-hidden /> Ürün ekle
            </button>
          </>
        }
      />
      <input
        ref={dosyaInput}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) setImportDosya(f)
          e.target.value = ''
        }}
        aria-label="Excel dosyası seç"
      />

      {surukleniyor && (
        <div className="kart border-2 border-dashed !border-[var(--accent)] bg-accent-soft text-accent text-center py-6 mb-4 font-medium">
          Excel dosyasını buraya bırakın
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-3">
        <div className="relative flex-1 min-w-56">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden />
          <input
            className="girdi pl-9"
            placeholder='Ara: "imbus a2", "933", "8*30"…'
            value={arama}
            onChange={(e) => setArama(e.target.value)}
          />
        </div>
        <select className="girdi w-auto" value={grup} onChange={(e) => setGrup(e.target.value)} aria-label="Grup">
          <option value="">Tüm gruplar</option>
          {gruplar.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        <select className="girdi w-auto" value={kalite} onChange={(e) => setKalite(e.target.value as Kalite | '')} aria-label="Kalite">
          <option value="">Tüm kaliteler</option>
          {KALITELER.map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
      </div>

      {urunlerHam === undefined ? (
        <Yukleniyor />
      ) : sonuclar.length === 0 ? (
        <BosDurum
          mesaj="Ürün bulunamadı"
          alt="Excel dosyanızı sürükleyip bırakarak kataloğu yükleyebilirsiniz (Kart Kodu | Açıklama | Grup Kodu | Özel Kod 1)."
        />
      ) : (
        <>
          <div className="kart overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-line bg-surface-2">
                  <th className="px-4 py-2.5 font-semibold">Kart Kodu</th>
                  <th className="px-4 py-2.5 font-semibold">Açıklama</th>
                  <th className="px-4 py-2.5 font-semibold">Grup</th>
                  <th className="px-4 py-2.5 font-semibold">DIN</th>
                  <th className="px-4 py-2.5 font-semibold">Ölçü</th>
                  <th className="px-4 py-2.5 font-semibold">Kalite</th>
                  <th className="px-2 py-2.5" aria-label="İşlemler"></th>
                </tr>
              </thead>
              <tbody>
                {sonuclar.slice(0, limit).map((u) => (
                  <tr key={u.id} className="border-b border-line last:border-b-0 hover:bg-surface-2">
                    <td className="px-4 py-2 whitespace-nowrap text-ink-2">{u.kartKodu}</td>
                    <td className="px-4 py-2 font-medium">{u.aciklama}</td>
                    <td className="px-4 py-2">{u.grup || '—'}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{u.standart || '—'}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{u.boyutMetni || '—'}</td>
                    <td className="px-4 py-2">{u.kalite || '—'}</td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <button className="text-ink-3 hover:text-accent p-1" onClick={() => setDuzeltilen(u)} aria-label="Düzelt">
                        <Pencil size={15} />
                      </button>
                      <button
                        className="text-ink-3 hover:text-bad p-1"
                        onClick={async () => {
                          if (!window.confirm(`"${u.aciklama}" silinsin mi?`)) return
                          try {
                            await urunSil(u.id!)
                            toast('Ürün silindi.')
                          } catch (e) {
                            toast(hataMesaji(e), 'hata')
                          }
                        }}
                        aria-label="Sil"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {sonuclar.length > limit && (
            <div className="text-center mt-3">
              <button className="btn btn-ikincil" onClick={() => setLimit(limit + SAYFA_BOYU)}>
                Daha fazla göster ({(sonuclar.length - limit).toLocaleString('tr-TR')} kaldı)
              </button>
            </div>
          )}
        </>
      )}

      {/* Import onayı */}
      <Modal baslik="Excel İçe Aktar" acik={Boolean(importDosya)} kapat={() => setImportDosya(null)}>
        <p className="text-sm text-ink-2 mb-1">
          <strong>{importDosya?.name}</strong> dosyası okunacak.
        </p>
        <p className="text-sm text-ink-3 mb-4">
          Beklenen format: <em>Kart Kodu | Açıklama | Grup Kodu | Özel Kod 1 (DIN)</em>.
          Türkçe karakter bozuklukları (cp1254) otomatik düzeltilir; kalite ve ölçü açıklamadan çıkarılır.
        </p>
        <div className="grid gap-2">
          <button
            className="btn btn-birincil justify-center"
            disabled={importCalisiyor}
            onClick={() => importDosya && excelYukle(importDosya, 'degistir')}
          >
            {importCalisiyor ? 'Yükleniyor…' : 'Kataloğu temizle ve yeniden yükle (önerilen)'}
          </button>
          <button
            className="btn btn-ikincil justify-center"
            disabled={importCalisiyor}
            onClick={() => importDosya && excelYukle(importDosya, 'birlestir')}
          >
            Mevcut kataloğa ekle (birleştir)
          </button>
        </div>
        <p className="text-xs text-ink-3 mt-3">
          Not: “Temizle ve yeniden yükle” yalnızca Excel kaynaklı ürünleri değiştirir; elle/AI ile eklenen ürünler korunur.
        </p>
      </Modal>

      <DuzeltModal urun={duzeltilen} kapat={() => setDuzeltilen(null)} />
      <ElleUrunModal acik={ekleAcik} kapat={() => setEkleAcik(false)} />
    </div>
  )
}

function DuzeltModal({ urun, kapat }: { urun: Product | null; kapat: () => void }) {
  // Sayı alanları metin olarak tutulur; kaydederken doğrulanır.
  const [form, setForm] = useState({ aciklama: '', grup: '', standart: '', olcuStr: '', boyStr: '', kalite: '' as Kalite })
  const [yuklenenId, setYuklenenId] = useState<number | null>(null)
  const u = urun

  // Modal her yeni ürünle açıldığında formu o üründen doldur.
  if (u?.id !== undefined && u.id !== yuklenenId) {
    setYuklenenId(u.id)
    setForm({
      aciklama: u.aciklama,
      grup: u.grup,
      standart: u.standart,
      olcuStr: u.olcu !== null ? String(u.olcu) : '',
      boyStr: u.boyMm !== null ? String(u.boyMm) : '',
      kalite: u.kalite,
    })
  }

  function sayiCoz(metin: string): number | null | undefined {
    const temiz = metin.trim()
    if (!temiz) return null
    const n = parseFloat(temiz.replace(',', '.'))
    return Number.isFinite(n) ? n : undefined // undefined = geçersiz girdi
  }

  async function kaydet() {
    if (!u?.id) return
    const olcu = sayiCoz(form.olcuStr)
    const boyMm = sayiCoz(form.boyStr)
    if (olcu === undefined || boyMm === undefined) {
      toast('Ölçü/Boy alanına geçerli bir sayı girin (örn. 8 veya 4,8).', 'hata')
      return
    }
    try {
      await urunGuncelle(u.id, {
        aciklama: trUpper(form.aciklama),
        grup: trUpper(form.grup),
        standart: form.standart,
        olcu,
        boyMm,
        kalite: form.kalite,
        boyutMetni: olcu !== null ? (boyMm !== null ? `M${olcu}x${boyMm}` : `M${olcu}`) : '',
      })
      toast('Ürün güncellendi.')
      setYuklenenId(null)
      kapat()
    } catch (e) {
      toast(hataMesaji(e), 'hata')
    }
  }

  function vazgec() {
    setYuklenenId(null)
    kapat()
  }

  return (
    <Modal baslik="Ürünü Düzelt" acik={Boolean(u)} kapat={vazgec}>
      {u && (
        <div className="grid gap-3">
          <div>
            <label className="text-xs font-medium text-ink-2 block mb-1">Açıklama</label>
            <input className="girdi" value={form.aciklama} onChange={(e) => setForm({ ...form, aciklama: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-ink-2 block mb-1">Grup</label>
              <input className="girdi" value={form.grup} onChange={(e) => setForm({ ...form, grup: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-2 block mb-1">DIN (örn. DIN 933)</label>
              <input className="girdi" value={form.standart} onChange={(e) => setForm({ ...form, standart: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-ink-2 block mb-1">Ölçü (M)</label>
              <input className="girdi" value={form.olcuStr} onChange={(e) => setForm({ ...form, olcuStr: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-2 block mb-1">Boy (mm)</label>
              <input className="girdi" value={form.boyStr} onChange={(e) => setForm({ ...form, boyStr: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-2 block mb-1">Kalite</label>
              <select className="girdi" value={form.kalite} onChange={(e) => setForm({ ...form, kalite: e.target.value as Kalite })}>
                <option value="">—</option>
                <option value="A2">A2</option>
                <option value="A4">A4</option>
                <option value="420">420</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-1">
            <button className="btn btn-ikincil" onClick={vazgec}>Vazgeç</button>
            <button className="btn btn-birincil" onClick={kaydet}>Kaydet</button>
          </div>
        </div>
      )}
    </Modal>
  )
}
