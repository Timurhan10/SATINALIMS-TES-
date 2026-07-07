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
