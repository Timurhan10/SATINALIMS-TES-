import { useMemo } from 'react'
import { musteriApi, talepListele } from '../data/api'
import { useVeri } from '../data/hooks'
import Rehber from '../components/Rehber'

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
      aciklama="Talep girerken yazdığınız yeni firmalar buraya otomatik eklenir."
      tekil="müşteri"
      api={musteriApi}
      ekSutun={{ baslik: 'Talep sayısı', deger: (id) => sayilar.get(id) ?? 0 }}
    />
  )
}
