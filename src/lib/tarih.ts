/** Yerel saat diliminde bugünün YYYY-MM-DD değeri.
 *  (toISOString UTC döndürdüğü için TR'de gece 00-03 arası gün kaydırıyordu.) */
export function bugunYerel(d: Date = new Date()): string {
  const ay = String(d.getMonth() + 1).padStart(2, '0')
  const gun = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${ay}-${gun}`
}

/** İçinde bulunulan ayın ilk günü (yerel), YYYY-MM-DD. */
export function ayBasiYerel(): string {
  const d = new Date()
  return bugunYerel(new Date(d.getFullYear(), d.getMonth(), 1))
}
