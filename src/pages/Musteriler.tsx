import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { db } from '../db'
import Rehber from '../components/Rehber'

export default function Musteriler() {
  const talepler = useLiveQuery(() => db.demands.toArray(), []) ?? []
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
      tablo={db.customers}
      ekSutun={{ baslik: 'Talep sayısı', deger: (id) => sayilar.get(id) ?? 0 }}
    />
  )
}
