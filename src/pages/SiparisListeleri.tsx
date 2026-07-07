// Kalıcı sipariş listeleri: liste oluştur/aç/sil, ürün ekle, gerçek .xlsx indir
// (tedarikçiye fiyat sormak için: Açıklama | Grup | DIN | Adet | FİYAT | Tedarikçi).
import { useState } from 'react'
import { ArrowLeft, FileDown, Plus, Trash2 } from 'lucide-react'
import {
  kalemEkle, kalemGuncelle, kalemListele, kalemSil, listeEkle, listeListele, listeSil, tumKalemler,
} from '../data/api'
import { useVeri } from '../data/hooks'
import type { OrderItem, OrderList, Product } from '../types'
import { siparisXlsxIndir } from '../lib/excel'
import ProductSearch from '../components/ProductSearch'
import { BosDurum, SayfaBaslik } from '../components/Parcalar'
import { toast } from '../components/Toast'

export default function SiparisListeleri() {
  const [acikListe, setAcikListe] = useState<OrderList | null>(null)
  const [yeniAd, setYeniAd] = useState('')
  const [metin, setMetin] = useState('')

  const listeler = useVeri(listeListele) ?? []
  const kalemler =
    useVeri(
      async (): Promise<OrderItem[]> => (acikListe?.id ? kalemListele(acikListe.id) : []),
      [acikListe?.id],
    ) ?? []
  const kalemSayilari =
    useVeri(async () => {
      const hepsi = await tumKalemler()
      const m = new Map<number, number>()
      for (const k of hepsi) m.set(k.listeId, (m.get(k.listeId) ?? 0) + 1)
      return m
    }) ?? new Map<number, number>()

  async function listeOlustur() {
    const ad = yeniAd.trim()
    if (!ad) {
      toast('Liste adı girin.', 'hata')
      return
    }
    const yeni = await listeEkle(ad)
    setYeniAd('')
    setAcikListe(yeni)
    toast('Liste oluşturuldu.')
  }

  async function urunEkle(u: Product) {
    if (!acikListe?.id) return
    await kalemEkle({
      listeId: acikListe.id,
      productId: u.id ?? null,
      aciklama: u.aciklama,
      grup: u.grup,
      standart: u.standart,
      adet: 1,
    })
    toast('Listeye eklendi.')
  }

  // ---- liste detayı ----
  if (acikListe) {
    return (
      <div>
        <SayfaBaslik
          baslik={acikListe.ad}
          aciklama={`${kalemler.length} kalem · tedarikçiye göndermek için Excel indirin.`}
          sag={
            <>
              <button className="btn btn-ikincil" onClick={() => setAcikListe(null)}>
                <ArrowLeft size={16} aria-hidden /> Listeler
              </button>
              <button
                className="btn btn-birincil"
                onClick={() => {
                  siparisXlsxIndir(acikListe.ad, kalemler)
                  toast('Excel indirildi.')
                }}
                disabled={kalemler.length === 0}
              >
                <FileDown size={16} aria-hidden /> Excel indir (.xlsx)
              </button>
            </>
          }
        />

        <div className="kart p-4 md:p-5 mb-5">
          <div className="mikro mb-2">Ürün ara ve listeye ekle</div>
          <ProductSearch metin={metin} setMetin={setMetin} onPick={urunEkle} pickEtiket="Listeye ekle" />
        </div>

        {kalemler.length === 0 ? (
          <BosDurum mesaj="Liste boş" alt="Yukarıdan ürün arayıp ekleyin." />
        ) : (
          <div className="kart overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-line bg-surface-2">
                  <th className="px-4 py-2.5 font-semibold">Açıklama</th>
                  <th className="px-4 py-2.5 font-semibold">Grup</th>
                  <th className="px-4 py-2.5 font-semibold">DIN</th>
                  <th className="px-4 py-2.5 font-semibold w-24">Adet</th>
                  <th className="px-2 py-2.5" aria-label="İşlemler"></th>
                </tr>
              </thead>
              <tbody>
                {kalemler.map((k) => (
                  <tr key={k.id} className="border-b border-line last:border-b-0">
                    <td className="px-4 py-2 font-medium">{k.aciklama}</td>
                    <td className="px-4 py-2">{k.grup || '—'}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{k.standart || '—'}</td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min={1}
                        className="girdi !py-1 w-20 tnum"
                        value={k.adet}
                        onChange={(e) => kalemGuncelle(k.id!, { adet: Math.max(1, Number(e.target.value) || 1) })}
                        aria-label="Adet"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <button
                        className="text-ink-3 hover:text-bad p-1"
                        onClick={() => kalemSil(k.id!)}
                        aria-label="Kalemi sil"
                      >
                        <Trash2 size={15} />
                      </button>
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

  // ---- liste ana ekranı ----
  return (
    <div>
      <SayfaBaslik baslik="Sipariş Listeleri" aciklama="Tedarikçiye fiyat sormak için kalıcı listeler oluşturun." />

      <div className="kart p-4 md:p-5 mb-5 flex flex-wrap gap-2">
        <input
          className="girdi flex-1 min-w-52"
          placeholder="Yeni liste adı (örn. Mart 2026 Paslanmaz Siparişi)…"
          value={yeniAd}
          onChange={(e) => setYeniAd(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && listeOlustur()}
        />
        <button className="btn btn-birincil" onClick={listeOlustur}>
          <Plus size={16} aria-hidden /> Liste oluştur
        </button>
      </div>

      {listeler.length === 0 ? (
        <BosDurum mesaj="Henüz sipariş listesi yok" alt="Yukarıdan ilk listenizi oluşturun." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {listeler.map((l) => (
            <div key={l.id} className="kart p-4 flex flex-col">
              <div className="font-semibold">{l.ad}</div>
              <div className="text-xs text-ink-3 mt-0.5 mb-3">
                {new Date(l.createdAt).toLocaleDateString('tr-TR')} · {kalemSayilari.get(l.id!) ?? 0} kalem
              </div>
              <div className="mt-auto flex gap-2">
                <button className="btn btn-birincil btn-kucuk" onClick={() => setAcikListe(l)}>Aç</button>
                <button
                  className="btn btn-tehlike btn-kucuk"
                  onClick={async () => {
                    await listeSil(l.id!) // kalemler CASCADE ile birlikte silinir
                    toast('Liste silindi.')
                  }}
                >
                  <Trash2 size={14} aria-hidden /> Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
