// Şirket verisinin JSON yedeği: indirme, geri yükleme (id yeniden eşleme ile)
// ve tümünü silme. Eski (Dexie/surum:1) yedek dosyaları da aynı biçimde
// okunduğu için tarayıcıdan buluta taşıma yolu olarak da kullanılır.
import type { Customer, Demand, OrderItem, OrderList, Product, Supplier } from '../types'
import {
  kalemEkle, listeEkle, musteriApi, talepToptanEkle, tedarikciApi, tumKalemler,
  listeListele, musteriListele, talepListele, tedarikciListele, urunListele, urunToptanEkle,
} from './api'
import { supabase } from './client'
import { degisti } from './store'

export async function yedekAl(): Promise<string> {
  const [products, customers, suppliers, demands, orderLists, orderItems] = await Promise.all([
    urunListele(), musteriListele(), tedarikciListele(), talepListele(), listeListele(), tumKalemler(),
  ])
  return JSON.stringify(
    { surum: 2, tarih: new Date().toISOString(), products, customers, suppliers, demands, orderLists, orderItems },
    null, 2,
  )
}

async function tabloyuBosalt(tablo: string): Promise<void> {
  // supabase-js delete bir filtre ister; RLS zaten şirketle sınırlar.
  const { error } = await supabase().from(tablo).delete().gte('id', 0)
  if (error) throw new Error(error.message)
}

/** Şirketin TÜM verisini siler (yalnız şirket sahibi kullanmalı). */
export async function tumVeriyiSil(): Promise<void> {
  // order_items, order_lists silinince CASCADE ile gider; yine de sırayla siliyoruz.
  for (const t of ['order_lists', 'demands', 'products', 'customers', 'suppliers']) {
    await tabloyuBosalt(t)
  }
  degisti()
}

/**
 * JSON yedeği geri yükler (mevcut şirket verisini TAMAMEN değiştirir).
 * Kayıtlar id'siz eklenir; eski→yeni id eşlemesi kurularak taleplerin
 * müşteri/ürün bağları ve sipariş kalemlerinin liste bağları yeniden yazılır.
 */
export async function yedekYukle(json: string): Promise<void> {
  const veri = JSON.parse(json) as {
    products?: Product[]
    customers?: Customer[]
    suppliers?: Supplier[]
    demands?: Demand[]
    orderLists?: OrderList[]
    orderItems?: OrderItem[]
  }
  if (!veri || typeof veri !== 'object' || !Array.isArray(veri.products)) {
    throw new Error('Geçersiz yedek dosyası')
  }

  await tumVeriyiSil()

  // Müşteriler ve tedarikçiler: tek tek ekle, id eşlemesini topla.
  const musteriEsleme = new Map<number, number>()
  for (const m of veri.customers ?? []) {
    const yeni = await musteriApi.ekle({ ad: m.ad, telefon: m.telefon ?? '', email: m.email ?? '' })
    if (m.id !== undefined && yeni.id !== undefined) musteriEsleme.set(m.id, yeni.id)
  }
  for (const s of veri.suppliers ?? []) {
    await tedarikciApi.ekle({ ad: s.ad, telefon: s.telefon ?? '', email: s.email ?? '' })
  }

  // Ürünler: toplu ekle, sonra kart koduna göre id eşle.
  const urunler = veri.products ?? []
  await urunToptanEkle(urunler.map((u) => ({ ...u, id: undefined })))
  const yeniUrunler = await urunListele()
  const kodIdMap = new Map(yeniUrunler.map((u) => [u.kartKodu, u.id!]))
  const urunEsleme = new Map<number, number>()
  for (const u of urunler) {
    if (u.id !== undefined && kodIdMap.has(u.kartKodu)) urunEsleme.set(u.id, kodIdMap.get(u.kartKodu)!)
  }

  // Talepler: FK'leri yeni id'lere çevirerek toplu ekle.
  const talepler = (veri.demands ?? []).map((t) => ({
    ...t,
    id: undefined,
    customerId: musteriEsleme.get(t.customerId) ?? t.customerId,
    productId: t.productId !== null ? urunEsleme.get(t.productId) ?? null : null,
  }))
  if (talepler.length > 0) await talepToptanEkle(talepler)

  // Sipariş listeleri ve kalemleri.
  const listeEsleme = new Map<number, number>()
  for (const l of veri.orderLists ?? []) {
    const yeni = await listeEkle(l.ad)
    if (l.id !== undefined && yeni.id !== undefined) listeEsleme.set(l.id, yeni.id)
  }
  for (const k of veri.orderItems ?? []) {
    const listeId = listeEsleme.get(k.listeId)
    if (listeId === undefined) continue
    await kalemEkle({
      ...k,
      id: undefined,
      listeId,
      productId: k.productId !== null ? urunEsleme.get(k.productId) ?? null : null,
    })
  }

  degisti()
}
