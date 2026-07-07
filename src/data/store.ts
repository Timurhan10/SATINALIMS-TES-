// Basit global sürüm sayacı: her veri değişikliğinde artar, useVeri hook'ları
// bunu dinleyip yeniden çeker (Dexie useLiveQuery'nin bulut karşılığı).

let surum = 0
const dinleyiciler = new Set<() => void>()

export function subscribe(fn: () => void): () => void {
  dinleyiciler.add(fn)
  return () => dinleyiciler.delete(fn)
}

export function getSnapshot(): number {
  return surum
}

/** Bir mutasyon başarılı olduğunda çağrılır; tüm açık sorgular tazelenir. */
export function degisti(): void {
  surum++
  dinleyiciler.forEach((fn) => fn())
}

// Pencere odağa gelince veriyi tazele (mesai arkadaşının değişiklikleri görünsün);
// tek global dinleyici + 10 sn kısıtlama: sekme değiştirme fırtınası sorgu seli yaratmasın.
let sonOdakYenileme = 0
if (typeof window !== 'undefined') {
  window.addEventListener('focus', () => {
    const simdi = Date.now()
    if (simdi - sonOdakYenileme < 10_000) return
    sonOdakYenileme = simdi
    degisti()
  })
}
