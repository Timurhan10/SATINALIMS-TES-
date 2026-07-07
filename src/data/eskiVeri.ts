// Eski (tarayıcı içi / Dexie) sürümün IndexedDB verisini ham API ile okur.
// Buluta geçen kullanıcıların tarayıcısında kalan veriyi tek tıkla taşımak için.

const ESKI_DB_AD = 'paslanmazTalepDB'
const TABLOLAR = ['products', 'customers', 'suppliers', 'demands', 'orderLists', 'orderItems'] as const

export interface EskiVeri {
  json: string
  urunSayisi: number
  talepSayisi: number
}

/** Eski yerel veritabanı varsa içeriğini yedek-JSON biçiminde döndürür; yoksa null. */
export function eskiYerelVeriOku(): Promise<EskiVeri | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  return new Promise((resolve) => {
    const istek = indexedDB.open(ESKI_DB_AD)
    let yeniOlustu = false
    istek.onupgradeneeded = () => {
      // open() var olmayan veritabanını oluşturur; boş kabuk bırakmamak için iptal et.
      yeniOlustu = true
      istek.transaction?.abort()
    }
    istek.onerror = () => resolve(null)
    istek.onsuccess = () => {
      const db = istek.result
      if (yeniOlustu || !TABLOLAR.every((t) => db.objectStoreNames.contains(t))) {
        db.close()
        resolve(null)
        return
      }
      try {
        const tx = db.transaction(TABLOLAR as unknown as string[], 'readonly')
        const sonuc: Record<string, unknown[]> = {}
        let kalan = TABLOLAR.length
        tx.onerror = () => {
          db.close()
          resolve(null)
        }
        for (const t of TABLOLAR) {
          const g = tx.objectStore(t).getAll()
          g.onsuccess = () => {
            sonuc[t] = g.result ?? []
            if (--kalan === 0) {
              db.close()
              const urunSayisi = sonuc.products.length
              const talepSayisi = sonuc.demands.length
              if (urunSayisi === 0 && talepSayisi === 0) {
                resolve(null)
                return
              }
              resolve({
                json: JSON.stringify({ surum: 1, ...sonuc }),
                urunSayisi,
                talepSayisi,
              })
            }
          }
        }
      } catch {
        db.close()
        resolve(null)
      }
    }
  })
}
