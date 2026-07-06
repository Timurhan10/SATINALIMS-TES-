// CSV dışa aktarma (Excel'in Türkçe sürümüyle uyumlu: ; ayraç + BOM).
export function csvIndir(dosyaAdi: string, basliklar: string[], satirlar: (string | number)[][]): void {
  const kacir = (h: string | number) => {
    const s = String(h)
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const icerik =
    '﻿' +
    [basliklar, ...satirlar].map((satir) => satir.map(kacir).join(';')).join('\r\n')
  const blob = new Blob([icerik], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = dosyaAdi.endsWith('.csv') ? dosyaAdi : `${dosyaAdi}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
