import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Download, Sparkles } from 'lucide-react'
import { talepListele, urunListele } from '../data/api'
import { useVeri } from '../data/hooks'
import { csvIndir } from '../lib/csv'
import { aiAnahtarVarMi, yoneticiOzeti } from '../lib/ai'
import { BosDurum, SayfaBaslik } from '../components/Parcalar'
import { toast } from '../components/Toast'

type Donem = 'buAy' | 'tumZamanlar'

interface SayimSatiri {
  etiket: string
  adet: number
}

function sayimTablosu(kayitlar: Array<{ etiket: string }>): SayimSatiri[] {
  const m = new Map<string, number>()
  for (const k of kayitlar) m.set(k.etiket, (m.get(k.etiket) ?? 0) + 1)
  return [...m.entries()].map(([etiket, adet]) => ({ etiket, adet })).sort((a, b) => b.adet - a.adet)
}

export default function Raporlar() {
  const [donem, setDonem] = useState<Donem>('buAy')
  const [ozet, setOzet] = useState('')
  const [ozetYukleniyor, setOzetYukleniyor] = useState(false)

  const talepler = useVeri(talepListele) ?? []
  const urunler = useVeri(urunListele) ?? []
  const aiVar = aiAnahtarVarMi()

  const urunMap = useMemo(() => new Map(urunler.map((u) => [u.id, u])), [urunler])

  const donemdeki = useMemo(() => {
    if (donem === 'tumZamanlar') return talepler
    const ayBasi = new Date()
    ayBasi.setDate(1)
    const esik = ayBasi.toISOString().slice(0, 10)
    return talepler.filter((t) => t.tarih >= esik)
  }, [talepler, donem])

  const etiketle = (t: (typeof talepler)[number]) =>
    (t.productId ? urunMap.get(t.productId)?.aciklama : undefined) ?? t.serbestMetin ?? '—'

  const enCokSorulan = useMemo(() => sayimTablosu(donemdeki.map((t) => ({ etiket: etiketle(t) }))), [donemdeki, urunMap])
  const enCokVerilen = useMemo(
    () => sayimTablosu(donemdeki.filter((t) => t.durum === 'VERILDI').map((t) => ({ etiket: etiketle(t) }))),
    [donemdeki, urunMap],
  )
  const stogaEklenmeli = useMemo(
    () => sayimTablosu(donemdeki.filter((t) => t.durum === 'VERILMEDI').map((t) => ({ etiket: etiketle(t) }))),
    [donemdeki, urunMap],
  )
  const kayipNedenleri = useMemo(
    () =>
      sayimTablosu(
        donemdeki.filter((t) => t.durum === 'VERILMEDI').map((t) => ({ etiket: t.kayipNedeni || 'Belirtilmemiş' })),
      ),
    [donemdeki],
  )

  const grafikVerisi = enCokSorulan.slice(0, 10).map((s) => ({
    ad: s.etiket.length > 34 ? s.etiket.slice(0, 32) + '…' : s.etiket,
    'Sorulma sayısı': s.adet,
  }))

  async function ozetOlustur() {
    setOzetYukleniyor(true)
    try {
      const veri = JSON.stringify({
        donem: donem === 'buAy' ? 'Bu ay' : 'Tüm zamanlar',
        toplamTalep: donemdeki.length,
        verilen: donemdeki.filter((t) => t.durum === 'VERILDI').length,
        verilemeyen: donemdeki.filter((t) => t.durum === 'VERILMEDI').length,
        enCokSorulan: enCokSorulan.slice(0, 15),
        stogaEklenmeli: stogaEklenmeli.slice(0, 15),
        kayipNedenleri,
      })
      setOzet(await yoneticiOzeti(veri))
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Özet oluşturulamadı.', 'hata')
    } finally {
      setOzetYukleniyor(false)
    }
  }

  function csv(ad: string, satirlar: SayimSatiri[], metrik: string) {
    csvIndir(ad, ['Ürün / Kayıt', metrik], satirlar.map((s) => [s.etiket, s.adet]))
  }

  return (
    <div>
      <SayfaBaslik
        baslik="Raporlar"
        aciklama="Metrik: kaç kez soruldu / verildi — adet değil, sıklık."
        sag={
          <>
            <select className="girdi w-auto" value={donem} onChange={(e) => setDonem(e.target.value as Donem)} aria-label="Dönem">
              <option value="buAy">Bu ay</option>
              <option value="tumZamanlar">Tüm zamanlar</option>
            </select>
            {aiVar && (
              <button className="btn btn-birincil" onClick={ozetOlustur} disabled={ozetYukleniyor}>
                <Sparkles size={16} aria-hidden />
                {ozetYukleniyor ? 'Hazırlanıyor…' : 'AI yönetici özeti'}
              </button>
            )}
          </>
        }
      />

      {donemdeki.length === 0 ? (
        <BosDurum mesaj="Bu dönemde talep verisi yok" alt="Dönemi değiştirin veya Talepler sayfasından kayıt ekleyin." />
      ) : (
        <>
          {ozet && (
            <div className="kart p-4 md:p-5 mb-5 border-l-4 !border-l-[var(--accent)]">
              <div className="mikro mb-2">AI Yönetici Özeti</div>
              <div className="text-sm whitespace-pre-wrap leading-relaxed">{ozet}</div>
            </div>
          )}

          {/* Grafik */}
          <div className="kart p-4 md:p-5 mb-5">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-sm">En çok sorulan 10 ürün</span>
              <button className="btn btn-ikincil btn-kucuk" onClick={() => csv('en-cok-sorulan', enCokSorulan, 'Sorulma sayısı')}>
                <Download size={14} aria-hidden /> CSV
              </button>
            </div>
            <div style={{ width: '100%', height: Math.max(220, grafikVerisi.length * 34) }}>
              <ResponsiveContainer>
                <BarChart data={grafikVerisi} layout="vertical" margin={{ left: 8, right: 32, top: 4, bottom: 4 }}>
                  <CartesianGrid horizontal={false} stroke="var(--line)" />
                  <XAxis type="number" allowDecimals={false} tick={{ fill: 'var(--ink-3)', fontSize: 12 }} stroke="var(--line)" />
                  <YAxis
                    type="category"
                    dataKey="ad"
                    width={230}
                    tick={{ fill: 'var(--ink-2)', fontSize: 12 }}
                    stroke="var(--line)"
                  />
                  <Tooltip
                    cursor={{ fill: 'color-mix(in srgb, var(--accent) 8%, transparent)' }}
                    contentStyle={{
                      background: 'var(--surface)',
                      border: '1px solid var(--line)',
                      borderRadius: 8,
                      color: 'var(--ink)',
                      fontSize: 13,
                    }}
                  />
                  <Bar
                    dataKey="Sorulma sayısı"
                    fill="var(--accent)"
                    radius={[0, 4, 4, 0]}
                    barSize={16}
                    label={{ position: 'right', fill: 'var(--ink-2)', fontSize: 12 }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <RaporKarti
              baslik="En çok verilen (satılan)"
              satirlar={enCokVerilen}
              renk="ok"
              csvAd="en-cok-verilen"
              metrik="Verilme sayısı"
              onCsv={csv}
            />
            <RaporKarti
              baslik="Stoğa eklenmeli (verilemeyen)"
              satirlar={stogaEklenmeli}
              renk="bad"
              csvAd="stoga-eklenmeli"
              metrik="Verilememe sayısı"
              onCsv={csv}
            />
          </div>

          {/* Kayıp nedeni dağılımı */}
          <div className="kart p-4 md:p-5 mt-5">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-sm">Kayıp nedeni dağılımı</span>
              <button className="btn btn-ikincil btn-kucuk" onClick={() => csv('kayip-nedenleri', kayipNedenleri, 'Adet')}>
                <Download size={14} aria-hidden /> CSV
              </button>
            </div>
            {kayipNedenleri.length === 0 ? (
              <p className="text-sm text-ink-3">Bu dönemde verilemeyen talep yok.</p>
            ) : (
              <div className="grid gap-2.5">
                {kayipNedenleri.map((n) => {
                  const toplam = kayipNedenleri.reduce((a, b) => a + b.adet, 0)
                  const yuzde = (n.adet / toplam) * 100
                  return (
                    <div key={n.etiket} className="grid grid-cols-[170px_1fr_70px] items-center gap-3 text-sm">
                      <span className="text-ink-2 truncate">{n.etiket}</span>
                      <div className="h-4 rounded bg-surface-2 overflow-hidden">
                        <div
                          className="h-full rounded"
                          style={{ width: `${yuzde}%`, background: 'var(--bad)', minWidth: 4 }}
                          role="img"
                          aria-label={`${n.etiket}: ${n.adet}`}
                        />
                      </div>
                      <span className="tnum text-right text-ink-2">
                        {n.adet} <span className="text-ink-3">(%{Math.round(yuzde)})</span>
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function RaporKarti({
  baslik, satirlar, renk, csvAd, metrik, onCsv,
}: {
  baslik: string
  satirlar: SayimSatiri[]
  renk: 'ok' | 'bad'
  csvAd: string
  metrik: string
  onCsv: (ad: string, satirlar: SayimSatiri[], metrik: string) => void
}) {
  return (
    <div className="kart overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-line">
        <span className="font-semibold text-sm">{baslik}</span>
        <button className="btn btn-ikincil btn-kucuk" onClick={() => onCsv(csvAd, satirlar, metrik)}>
          <Download size={14} aria-hidden /> CSV
        </button>
      </div>
      {satirlar.length === 0 ? (
        <p className="px-4 py-6 text-sm text-ink-3">Kayıt yok.</p>
      ) : (
        <table className="w-full text-sm">
          <tbody>
            {satirlar.slice(0, 10).map((s, i) => (
              <tr key={i} className="border-b border-line last:border-b-0">
                <td className="px-4 py-2 text-ink-3 tnum w-8">{i + 1}.</td>
                <td className="px-2 py-2 font-medium">{s.etiket}</td>
                <td className="px-4 py-2 text-right">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold tnum ${renk === 'ok' ? 'bg-ok-soft text-ok' : 'bg-bad-soft text-bad'}`}>
                    {s.adet}×
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
