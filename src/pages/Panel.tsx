import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../db'
import { BosDurum, KpiKarti, SayfaBaslik } from '../components/Parcalar'
import { DURUM_ETIKET } from '../types'
import type { DemandDurum } from '../types'

const DURUM_RENK: Record<DemandDurum, string> = {
  VERILDI: 'var(--ok)',
  VERILMEDI: 'var(--bad)',
  BEKLEMEDE: 'var(--warn)',
}

export default function Panel() {
  const talepler = useLiveQuery(() => db.demands.toArray(), []) ?? []
  const urunSayisi = useLiveQuery(() => db.products.count(), []) ?? 0
  const urunler = useLiveQuery(() => db.products.toArray(), []) ?? []
  const musteriler = useLiveQuery(() => db.customers.toArray(), []) ?? []

  const urunMap = useMemo(() => new Map(urunler.map((u) => [u.id, u])), [urunler])
  const musteriMap = useMemo(() => new Map(musteriler.map((m) => [m.id, m.ad])), [musteriler])

  const toplam = talepler.length
  const verilen = talepler.filter((t) => t.durum === 'VERILDI').length
  const verilmeyen = talepler.filter((t) => t.durum === 'VERILMEDI').length
  const sonuclanan = verilen + verilmeyen
  const oran = sonuclanan > 0 ? Math.round((verilen / sonuclanan) * 100) : 0

  // Stoğa eklenmeli: en çok VERILMEDI olan ürün/imza
  const stogaEklenmeli = useMemo(() => {
    const sayim = new Map<string, { etiket: string; adet: number; neden: string }>()
    for (const t of talepler) {
      if (t.durum !== 'VERILMEDI') continue
      const u = t.productId ? urunMap.get(t.productId) : undefined
      const anahtar = u ? `u${u.id}` : `s:${t.serbestMetin}`
      const etiket = u?.aciklama ?? t.serbestMetin
      const kayit = sayim.get(anahtar) ?? { etiket, adet: 0, neden: t.kayipNedeni }
      kayit.adet++
      if (t.kayipNedeni) kayit.neden = t.kayipNedeni
      sayim.set(anahtar, kayit)
    }
    return [...sayim.values()].sort((a, b) => b.adet - a.adet).slice(0, 8)
  }, [talepler, urunMap])

  const sonTalepler = useMemo(
    () => [...talepler].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6),
    [talepler],
  )

  const durumlar = (Object.keys(DURUM_ETIKET) as DemandDurum[]).map((d) => ({
    d,
    adet: talepler.filter((t) => t.durum === d).length,
  }))

  return (
    <div>
      <SayfaBaslik baslik="Panel" aciklama="Talep verinizin genel görünümü." />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-5">
        <KpiKarti etiket="Toplam talep" deger={String(toplam)} />
        <KpiKarti etiket="Karşılama oranı" deger={`%${oran}`} alt={`${verilen} verildi / ${sonuclanan} sonuçlandı`} vurgu={oran >= 70 ? 'ok' : undefined} />
        <KpiKarti etiket="Verilemeyen" deger={String(verilmeyen)} vurgu={verilmeyen > 0 ? 'bad' : undefined} alt="stok fırsatı" />
        <KpiKarti etiket="Katalog ürünü" deger={urunSayisi.toLocaleString('tr-TR')} />
      </div>

      {/* Durum dağılımı çubukları */}
      <div className="kart p-4 md:p-5 mb-5">
        <div className="mikro mb-3">Durum Dağılımı</div>
        {toplam === 0 ? (
          <p className="text-sm text-ink-3">Henüz talep yok.</p>
        ) : (
          <div className="grid gap-2.5">
            {durumlar.map(({ d, adet }) => {
              const yuzde = toplam > 0 ? (adet / toplam) * 100 : 0
              return (
                <div key={d} className="grid grid-cols-[90px_1fr_46px] items-center gap-3 text-sm">
                  <span className="text-ink-2">{DURUM_ETIKET[d]}</span>
                  <div className="h-4 rounded bg-surface-2 overflow-hidden">
                    <div
                      className="h-full rounded"
                      style={{ width: `${yuzde}%`, background: DURUM_RENK[d], minWidth: adet > 0 ? 4 : 0 }}
                      role="img"
                      aria-label={`${DURUM_ETIKET[d]}: ${adet} talep`}
                    />
                  </div>
                  <span className="tnum text-right text-ink-2">{adet}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Stoğa eklenmeli */}
        <div className="kart overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <span className="font-semibold text-sm">Stoğa eklenmeli — en çok verilemeyen</span>
            <Link to="/raporlar" className="text-xs text-accent font-medium hover:underline">Rapora git →</Link>
          </div>
          {stogaEklenmeli.length === 0 ? (
            <p className="px-4 py-6 text-sm text-ink-3">Verilemeyen talep yok — harika! 🎉</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {stogaEklenmeli.map((s, i) => (
                  <tr key={i} className="border-b border-line last:border-b-0">
                    <td className="px-4 py-2">
                      <div className="font-medium">{s.etiket}</div>
                      <div className="text-xs text-ink-3">{s.neden || '—'}</div>
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <span className="bg-bad-soft text-bad rounded-full px-2.5 py-0.5 text-xs font-bold tnum">
                        {s.adet}×
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Son talepler */}
        <div className="kart overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <span className="font-semibold text-sm">Son talepler</span>
            <Link to="/talepler" className="text-xs text-accent font-medium hover:underline">Tümü →</Link>
          </div>
          {sonTalepler.length === 0 ? (
            <div className="p-4"><BosDurum mesaj="Henüz talep yok" /></div>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {sonTalepler.map((t) => {
                  const u = t.productId ? urunMap.get(t.productId) : undefined
                  return (
                    <tr key={t.id} className="border-b border-line last:border-b-0">
                      <td className="px-4 py-2">
                        <div className="font-medium truncate max-w-64">{u?.aciklama ?? t.serbestMetin}</div>
                        <div className="text-xs text-ink-3">{musteriMap.get(t.customerId)} · {t.tarih}</div>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <span
                          className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                          style={{
                            color: DURUM_RENK[t.durum],
                            background: 'color-mix(in srgb, ' + DURUM_RENK[t.durum] + ' 12%, transparent)',
                          }}
                        >
                          {DURUM_ETIKET[t.durum]}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
