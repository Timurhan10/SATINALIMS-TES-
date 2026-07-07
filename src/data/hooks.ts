import { useEffect, useState, useSyncExternalStore } from 'react'
import { getSnapshot, subscribe } from './store'
import { toast } from '../components/Toast'

/**
 * Buluttan veri okuyan reaktif hook — useLiveQuery'nin karşılığı.
 * Her mutasyonda (degisti) ve pencere odağa gelince (store'daki global dinleyici)
 * yeniden çeker. İlk yükleme bitene dek `undefined` döner (= yükleniyor);
 * sonraki yenilemelerde eski veri korunur, ekran titremez.
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

  return veri
}
