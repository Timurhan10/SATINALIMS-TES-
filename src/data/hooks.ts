import { useEffect, useState, useSyncExternalStore } from 'react'
import { degisti, getSnapshot, subscribe } from './store'
import { toast } from '../components/Toast'

/**
 * Buluttan veri okuyan reaktif hook — useLiveQuery'nin karşılığı.
 * Her mutasyondan (degisti) ve pencere odağa geldiğinde yeniden çeker;
 * böylece mesai arkadaşının değişiklikleri de görünür.
 */
export function useVeri<T>(fetcher: () => Promise<T>, deps: unknown[] = []): T | undefined {
  const surum = useSyncExternalStore(subscribe, getSnapshot)
  const [veri, setVeri] = useState<T>()

  useEffect(() => {
    let aktif = true
    fetcher()
      .then((v) => { if (aktif) setVeri(v) })
      .catch((e) => {
        console.error(e)
        if (aktif) toast('Veri yüklenemedi. Bağlantınızı kontrol edin.', 'hata')
      })
    return () => { aktif = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surum, ...deps])

  useEffect(() => {
    const f = () => degisti()
    window.addEventListener('focus', f)
    return () => window.removeEventListener('focus', f)
  }, [])

  return veri
}
