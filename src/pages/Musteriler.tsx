import { useMemo } from 'react'
import { musteriApi, talepListele, urunListele } from '../data/api'
import { useVeri } from '../data/hooks'
import Rehber from '../components/Rehber'
import { DurumRozeti } from '../components/Parcalar'

const DETAY_LIMIT = 20

/** Müşteri satırı açılınca gösterilen talep geçmişi (salt okunur). */
function MusteriTalepleri({ musteriId }: { musteriId: number }) {
  const talepler = useVeri(talepListele) ?? []
  const urunler = useVeri(urunListele) ?? []
  const urunMap = useMemo(() => new Map(urunler.map((u) => [u.id, u])), [urunler])

  const liste = talepler.filter((t) => t.customerId === musteriId) // en yeni üstte gelir

  if (liste.length === 0) {
    return <p className="text-sm text-ink-3">Bu müşteriden kayıtlı talep yok.</p>
  }

  return (
    <div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-line">
            <th className="pr-4 py-1.5 font-semibold">Tarih</th>
            <th className="pr-4 py-1.5 font-semibold">Ürün / Talep</th>
            <th className="pr-4 py-1.5 font-semibold">Adet</th>
            <th className="py-1.5 font-semibold">Durum</th>
          </tr>
        </thead>
        <tbody>
          {liste.slice(0, DETAY_LIMIT).map((t) => (
            <tr key={t.id} className="border-b border-line last:border-b-0">
              <td className="pr-4 py-1.5 whitespace-nowrap">{t.tarih}</td>
              <td className="pr-4 py-1.5 font-medium">
                {(t.productId ? urunMap.get(t.productId)?.aciklama : undefined) ?? t.serbestMetin}
              </td>
              <td className="pr-4 py-1.5 tnum">{t.adet.toLocaleString('tr-TR')}</td>
              <td className="py-1.5">
                <DurumRozeti durum={t.durum} />
                {t.durum === 'VERILMEDI' && t.kayipNedeni && (
                  <span className="text-xs text-ink-3 ml-1.5">({t.kayipNedeni})</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {liste.length > DETAY_LIMIT && (
        <p className="text-xs text-ink-3 mt-2">
          Son {DETAY_LIMIT} talep gösteriliyor · toplam {liste.length.toLocaleString('tr-TR')} talep
          (tümü için Talepler sayfasında firmaya tıklayın).
        </p>
      )}
    </div>
  )
}

export default function Musteriler() {
  const talepler = useVeri(talepListele) ?? []
  const sayilar = useMemo(() => {
    const m = new Map<number, number>()
    for (const t of talepler) m.set(t.customerId, (m.get(t.customerId) ?? 0) + 1)
    return m
  }, [talepler])

  return (
    <Rehber
      baslik="Müşteriler"
      aciklama="Satıra tıklayınca müşterinin talep geçmişi açılır. Talep girerken yazdığınız yeni firmalar buraya otomatik eklenir."
      tekil="müşteri"
      api={musteriApi}
      ekSutun={{ baslik: 'Talep sayısı', deger: (id) => sayilar.get(id) ?? 0 }}
      detay={(id) => <MusteriTalepleri musteriId={id} />}
    />
  )
}
