// Ortak tipler — tüm uygulama bu sözleşmeyi kullanır.

export type Kalite = 'A2' | 'A4' | '420' | ''

export type DemandDurum = 'BEKLEMEDE' | 'VERILDI' | 'VERILMEDI'

export interface Product {
  id?: number
  kartKodu: string
  aciklama: string
  grup: string
  standart: string // "DIN 933" gibi; boş olabilir
  standartAdi: string
  basTipi: string
  olcu: number | null // M ölçüsü (M8 → 8); inç ise null, boyutMetni dolar
  boyMm: number | null
  boyutMetni: string // "M8x30", "1/2\"" gibi görüntü metni
  kalite: Kalite
  disTipi: string
  kaynak: 'katalog' | 'manuel' | 'ai'
  inCatalog: boolean
}

export interface Customer {
  id?: number
  ad: string
  telefon: string
  email: string
}

export interface Supplier {
  id?: number
  ad: string
  telefon: string
  email: string
}

export interface Demand {
  id?: number
  tarih: string // ISO gün (YYYY-MM-DD)
  customerId: number
  productId: number | null
  serbestMetin: string
  // parse imzası (raporlarda üründen bağımsız analiz için saklanır)
  grup: string
  standart: string
  olcu: number | null
  boyMm: number | null
  kalite: Kalite
  durum: DemandDurum
  kayipNedeni: string
  adet: number // kaç adet soruldu
  createdAt: number
}

export interface OrderList {
  id?: number
  ad: string
  createdAt: number
}

export interface OrderItem {
  id?: number
  listeId: number
  productId: number | null
  aciklama: string
  grup: string
  standart: string
  adet: number
}

export interface Setting {
  key: string
  value: string
}

export interface ParseImza {
  grup: string
  standart: string // "DIN 933"
  olcu: number | null
  boyMm: number | null
  kalite: Kalite
  boyutMetni: string
  disTipi: string
}

export const KAYIP_NEDENLERI = [
  'Stokta yok',
  'Fiyat yüksek geldi',
  'Termin uymadı',
  'Ürün kataloğumuzda yok',
  'Müşteri vazgeçti',
  'Diğer',
] as const

export const DURUM_ETIKET: Record<DemandDurum, string> = {
  BEKLEMEDE: 'Beklemede',
  VERILDI: 'Verildi',
  VERILMEDI: 'Verilmedi',
}
