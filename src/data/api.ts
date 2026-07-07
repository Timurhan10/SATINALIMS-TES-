// Bulut veri katmanı — eski Dexie çağrılarını birebir aynalayan fonksiyonlar.
// Postgres kolonları snake_case; uygulama tipleri (types.ts) camelCase kalır,
// dönüşüm bu dosyadaki mapper'larda yapılır. org_id hiç gönderilmez: sunucuda
// default current_org_id() doldurur, RLS doğrular.
import type { Customer, Demand, OrderItem, OrderList, Product, Supplier } from '../types'
import { supabase } from './client'
import { degisti, getSnapshot } from './store'

// ---------- mapper'lar ----------

type Satir = Record<string, unknown>

function urunOku(r: Satir): Product {
  return {
    id: r.id as number,
    kartKodu: r.kart_kodu as string,
    aciklama: r.aciklama as string,
    grup: r.grup as string,
    standart: r.standart as string,
    standartAdi: r.standart_adi as string,
    basTipi: r.bas_tipi as string,
    olcu: r.olcu as number | null,
    boyMm: r.boy_mm as number | null,
    boyutMetni: r.boyut_metni as string,
    kalite: r.kalite as Product['kalite'],
    disTipi: r.dis_tipi as string,
    kaynak: r.kaynak as Product['kaynak'],
    inCatalog: r.in_catalog as boolean,
  }
}

function urunYaz(p: Partial<Product>): Satir {
  const r: Satir = {}
  if (p.kartKodu !== undefined) r.kart_kodu = p.kartKodu
  if (p.aciklama !== undefined) r.aciklama = p.aciklama
  if (p.grup !== undefined) r.grup = p.grup
  if (p.standart !== undefined) r.standart = p.standart
  if (p.standartAdi !== undefined) r.standart_adi = p.standartAdi
  if (p.basTipi !== undefined) r.bas_tipi = p.basTipi
  if (p.olcu !== undefined) r.olcu = p.olcu
  if (p.boyMm !== undefined) r.boy_mm = p.boyMm
  if (p.boyutMetni !== undefined) r.boyut_metni = p.boyutMetni
  if (p.kalite !== undefined) r.kalite = p.kalite
  if (p.disTipi !== undefined) r.dis_tipi = p.disTipi
  if (p.kaynak !== undefined) r.kaynak = p.kaynak
  if (p.inCatalog !== undefined) r.in_catalog = p.inCatalog
  return r
}

function talepOku(r: Satir): Demand {
  return {
    id: r.id as number,
    tarih: r.tarih as string,
    customerId: r.customer_id as number,
    productId: r.product_id as number | null,
    serbestMetin: r.serbest_metin as string,
    grup: r.grup as string,
    standart: r.standart as string,
    olcu: r.olcu as number | null,
    boyMm: r.boy_mm as number | null,
    kalite: r.kalite as Demand['kalite'],
    durum: r.durum as Demand['durum'],
    kayipNedeni: r.kayip_nedeni as string,
    adet: Number(r.adet ?? 1),
    createdAt: Number(r.created_at),
  }
}

function talepYaz(t: Partial<Demand>): Satir {
  const r: Satir = {}
  if (t.tarih !== undefined) r.tarih = t.tarih
  if (t.customerId !== undefined) r.customer_id = t.customerId
  if (t.productId !== undefined) r.product_id = t.productId
  if (t.serbestMetin !== undefined) r.serbest_metin = t.serbestMetin
  if (t.grup !== undefined) r.grup = t.grup
  if (t.standart !== undefined) r.standart = t.standart
  if (t.olcu !== undefined) r.olcu = t.olcu
  if (t.boyMm !== undefined) r.boy_mm = t.boyMm
  if (t.kalite !== undefined) r.kalite = t.kalite
  if (t.durum !== undefined) r.durum = t.durum
  if (t.kayipNedeni !== undefined) r.kayip_nedeni = t.kayipNedeni
  if (t.adet !== undefined) r.adet = t.adet
  if (t.createdAt !== undefined) r.created_at = t.createdAt
  return r
}

function listeOku(r: Satir): OrderList {
  return { id: r.id as number, ad: r.ad as string, createdAt: Number(r.created_at) }
}

function kalemOku(r: Satir): OrderItem {
  return {
    id: r.id as number,
    listeId: r.liste_id as number,
    productId: r.product_id as number | null,
    aciklama: r.aciklama as string,
    grup: r.grup as string,
    standart: r.standart as string,
    adet: r.adet as number,
  }
}

function kalemYaz(k: Partial<OrderItem>): Satir {
  const r: Satir = {}
  if (k.listeId !== undefined) r.liste_id = k.listeId
  if (k.productId !== undefined) r.product_id = k.productId
  if (k.aciklama !== undefined) r.aciklama = k.aciklama
  if (k.grup !== undefined) r.grup = k.grup
  if (k.standart !== undefined) r.standart = k.standart
  if (k.adet !== undefined) r.adet = k.adet
  return r
}

function hataFirlat(error: { message: string } | null): void {
  if (error) throw new Error(error.message)
}

// Supabase SELECT sorguları varsayılan olarak 1000 satırla sınırlıdır.
// Bu yardımcı, kısa sayfa gelene dek 1000'lik dilimleri çekip birleştirir;
// çağıran, her dilim için sorguyu (sıralama + filtre dahil) kurar.
const SAYFA_BOYU = 1000

async function hepsiniCek(
  sorgu: (bas: number, son: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>,
): Promise<Satir[]> {
  const hepsi: Satir[] = []
  for (let i = 0; ; i += SAYFA_BOYU) {
    const { data, error } = await sorgu(i, i + SAYFA_BOYU - 1)
    hataFirlat(error)
    const sayfa = (data ?? []) as Satir[]
    hepsi.push(...sayfa)
    if (sayfa.length < SAYFA_BOYU) break
  }
  return hepsi
}

// ---------- ürünler ----------

// Ürün listesi birden çok bileşende aynı anda okunur (Talepler + ProductSearch vb.);
// aynı veri sürümü içinde tek sorgu atılır, mutasyon (degisti) sürümü artırınca tazelenir.
let urunOnbellek: { surum: number; sozveri: Promise<Product[]> } | null = null

export function urunListele(): Promise<Product[]> {
  const surum = getSnapshot()
  if (urunOnbellek && urunOnbellek.surum === surum) return urunOnbellek.sozveri
  const sozveri = (async () => {
    const satirlar = await hepsiniCek((bas, son) =>
      supabase().from('products').select('*').order('kart_kodu').order('id').range(bas, son),
    )
    return satirlar.map(urunOku)
  })()
  urunOnbellek = { surum, sozveri }
  sozveri.catch(() => {
    if (urunOnbellek?.sozveri === sozveri) urunOnbellek = null // hata önbelleğe alınmaz
  })
  return sozveri
}

export async function urunSay(): Promise<number> {
  const { count, error } = await supabase().from('products').select('id', { count: 'exact', head: true })
  hataFirlat(error)
  return count ?? 0
}

export async function urunEkle(p: Product): Promise<Product> {
  const { data, error } = await supabase().from('products').insert(urunYaz(p)).select().single()
  hataFirlat(error)
  degisti()
  return urunOku(data as Satir)
}

/** Toplu ürün ekleme (Excel import): 500'lük parçalar.
 *  guncelle=false → aynı kart kodu atlanır; guncelle=true → üzerine yazılır. */
export async function urunToptanEkle(liste: Product[], guncelle = false): Promise<void> {
  const BOY = 500
  for (let i = 0; i < liste.length; i += BOY) {
    const { error } = await supabase()
      .from('products')
      .upsert(liste.slice(i, i + BOY).map(urunYaz), {
        onConflict: 'org_id,kart_kodu',
        ignoreDuplicates: !guncelle,
      })
    hataFirlat(error)
  }
  degisti()
}

/** Verilen id listesindeki ürünleri siler (Excel "değiştir" modunda artıkları temizler). */
export async function urunIdleriyleSil(idler: number[]): Promise<void> {
  const BOY = 500
  for (let i = 0; i < idler.length; i += BOY) {
    const { error } = await supabase().from('products').delete().in('id', idler.slice(i, i + BOY))
    hataFirlat(error)
  }
  if (idler.length > 0) degisti()
}

export async function urunGuncelle(id: number, patch: Partial<Product>): Promise<void> {
  const { error } = await supabase().from('products').update(urunYaz(patch)).eq('id', id)
  hataFirlat(error)
  degisti()
}

export async function urunSil(id: number): Promise<void> {
  const { error } = await supabase().from('products').delete().eq('id', id)
  hataFirlat(error)
  degisti()
}

/** Şirketin TÜM ürünlerini siler (RLS org ile sınırlar). */
export async function tumUrunleriSil(): Promise<void> {
  const { error } = await supabase().from('products').delete().gte('id', 0)
  hataFirlat(error)
  degisti()
}

export async function urunKaynaktanSil(kaynak: Product['kaynak']): Promise<void> {
  const { error } = await supabase().from('products').delete().eq('kaynak', kaynak)
  hataFirlat(error)
  degisti()
}

// ---------- talepler ----------

export async function talepListele(): Promise<Demand[]> {
  const satirlar = await hepsiniCek((bas, son) =>
    supabase()
      .from('demands')
      .select('*')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(bas, son),
  )
  return satirlar.map(talepOku)
}

export async function talepToptanEkle(liste: Demand[]): Promise<void> {
  const { error } = await supabase().from('demands').insert(liste.map(talepYaz))
  hataFirlat(error)
  degisti()
}

export async function talepGuncelle(id: number, patch: Partial<Demand>): Promise<void> {
  const { error } = await supabase().from('demands').update(talepYaz(patch)).eq('id', id)
  hataFirlat(error)
  degisti()
}

export async function talepSil(id: number): Promise<void> {
  const { error } = await supabase().from('demands').delete().eq('id', id)
  hataFirlat(error)
  degisti()
}

// ---------- rehber (müşteriler / tedarikçiler) ----------

export interface RehberKaydi {
  id?: number
  ad: string
  telefon: string
  email: string
}

export interface RehberApi {
  listele: () => Promise<RehberKaydi[]>
  ekle: (k: RehberKaydi) => Promise<RehberKaydi>
  guncelle: (id: number, patch: Partial<RehberKaydi>) => Promise<void>
  sil: (id: number) => Promise<void>
}

function rehberApi(tablo: 'customers' | 'suppliers'): RehberApi {
  return {
    async listele() {
      const satirlar = await hepsiniCek((bas, son) =>
        supabase().from(tablo).select('*').order('ad').order('id').range(bas, son),
      )
      return satirlar as unknown as RehberKaydi[]
    },
    async ekle(k) {
      const { data, error } = await supabase()
        .from(tablo)
        .insert({ ad: k.ad, telefon: k.telefon, email: k.email })
        .select()
        .single()
      hataFirlat(error)
      degisti()
      return data as RehberKaydi
    },
    async guncelle(id, patch) {
      const { error } = await supabase().from(tablo).update(patch).eq('id', id)
      hataFirlat(error)
      degisti()
    },
    async sil(id) {
      const { error } = await supabase().from(tablo).delete().eq('id', id)
      hataFirlat(error)
      degisti()
    },
  }
}

export const musteriApi: RehberApi = rehberApi('customers')
export const tedarikciApi: RehberApi = rehberApi('suppliers')

export async function musteriListele(): Promise<Customer[]> {
  return (await musteriApi.listele()) as Customer[]
}

export async function tedarikciListele(): Promise<Supplier[]> {
  return (await tedarikciApi.listele()) as Supplier[]
}

// ---------- sipariş listeleri ----------

export async function listeListele(): Promise<OrderList[]> {
  const { data, error } = await supabase()
    .from('order_lists')
    .select('*')
    .order('created_at', { ascending: false })
  hataFirlat(error)
  return (data ?? []).map(listeOku)
}

export async function listeEkle(ad: string): Promise<OrderList> {
  const { data, error } = await supabase()
    .from('order_lists')
    .insert({ ad, created_at: Date.now() })
    .select()
    .single()
  hataFirlat(error)
  degisti()
  return listeOku(data as Satir)
}

/** Listeyi siler; kalemler veritabanında CASCADE ile birlikte silinir. */
export async function listeSil(id: number): Promise<void> {
  const { error } = await supabase().from('order_lists').delete().eq('id', id)
  hataFirlat(error)
  degisti()
}

export async function kalemListele(listeId: number): Promise<OrderItem[]> {
  const satirlar = await hepsiniCek((bas, son) =>
    supabase().from('order_items').select('*').eq('liste_id', listeId).order('id').range(bas, son),
  )
  return satirlar.map(kalemOku)
}

export async function tumKalemler(): Promise<OrderItem[]> {
  const satirlar = await hepsiniCek((bas, son) =>
    supabase().from('order_items').select('*').order('id').range(bas, son),
  )
  return satirlar.map(kalemOku)
}

export async function kalemEkle(k: OrderItem): Promise<void> {
  const { error } = await supabase().from('order_items').insert(kalemYaz(k))
  hataFirlat(error)
  degisti()
}

export async function kalemGuncelle(id: number, patch: Partial<OrderItem>): Promise<void> {
  const { error } = await supabase().from('order_items').update(kalemYaz(patch)).eq('id', id)
  hataFirlat(error)
  degisti()
}

export async function kalemSil(id: number): Promise<void> {
  const { error } = await supabase().from('order_items').delete().eq('id', id)
  hataFirlat(error)
  degisti()
}

// ---------- şirket (org) ----------

export interface Uye {
  userId: string
  rol: 'owner' | 'member'
  email: string
}

export async function uyeListele(): Promise<Uye[]> {
  const { data, error } = await supabase()
    .from('org_members')
    .select('user_id, rol, email')
    .order('created_at')
  hataFirlat(error)
  return (data ?? []).map((r) => ({
    userId: r.user_id as string,
    rol: r.rol as Uye['rol'],
    email: r.email as string,
  }))
}

export async function katilimKoduOlustur(): Promise<string> {
  const { data, error } = await supabase().rpc('katilim_kodu_olustur')
  hataFirlat(error)
  return data as string
}

export async function uyeCikar(userId: string): Promise<void> {
  const { error } = await supabase().rpc('uye_cikar', { hedef: userId })
  hataFirlat(error)
  degisti()
}

export async function sirketAdiDegistir(yeniAd: string): Promise<void> {
  const { error } = await supabase().rpc('sirket_adi_degistir', { yeni_ad: yeniAd })
  hataFirlat(error)
  degisti()
}

export async function adminMiyim(): Promise<boolean> {
  const { data, error } = await supabase().rpc('admin_miyim')
  hataFirlat(error)
  return Boolean(data)
}

// ---------- platform yönetimi (davet kodları) ----------

export interface DavetKodu {
  code: string
  note: string
  createdAt: string
  usedAt: string | null
}

export async function davetKodlariListele(): Promise<DavetKodu[]> {
  const data = await hepsiniCek((bas, son) =>
    supabase()
      .from('invite_codes')
      .select('code, note, created_at, used_at')
      .order('created_at', { ascending: false })
      .order('code')
      .range(bas, son),
  )
  return data.map((r) => ({
    code: r.code as string,
    note: r.note as string,
    createdAt: r.created_at as string,
    usedAt: (r.used_at as string) ?? null,
  }))
}

export async function davetKoduOlustur(adet: number, aciklama: string): Promise<string[]> {
  const { data, error } = await supabase().rpc('davet_kodu_olustur', { adet, aciklama })
  hataFirlat(error)
  return (data ?? []) as string[]
}

export interface OrgOzet {
  id: string
  ad: string
  olusturma: string
  aktif: boolean
  uyeSayisi: number
}

export async function orgListele(): Promise<OrgOzet[]> {
  const { data, error } = await supabase().rpc('org_listele')
  hataFirlat(error)
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: r.org_id as string,
    ad: r.org_ad as string,
    olusturma: r.olusturma as string,
    aktif: Boolean(r.aktif),
    uyeSayisi: Number(r.uye_sayisi ?? 0),
  }))
}

export async function orgAktiflik(id: string, aktif: boolean): Promise<void> {
  const { error } = await supabase().rpc('org_aktiflik', { hedef: id, aktif })
  hataFirlat(error)
  degisti()
}
