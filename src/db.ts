// Dexie (IndexedDB) şeması — tüm veri KULLANICININ TARAYICISINDA saklanır.
import Dexie, { type EntityTable } from 'dexie'
import type {
  Customer, Demand, OrderItem, OrderList, Product, Setting, Supplier,
} from './types'

export const db = new Dexie('paslanmazTalepDB') as Dexie & {
  products: EntityTable<Product, 'id'>
  customers: EntityTable<Customer, 'id'>
  suppliers: EntityTable<Supplier, 'id'>
  demands: EntityTable<Demand, 'id'>
  orderLists: EntityTable<OrderList, 'id'>
  orderItems: EntityTable<OrderItem, 'id'>
  settings: EntityTable<Setting, 'key'>
}

db.version(1).stores({
  products: '++id, &kartKodu, grup, standart, kalite, olcu, inCatalog',
  customers: '++id, ad',
  suppliers: '++id, ad',
  demands: '++id, tarih, customerId, productId, durum, createdAt',
  orderLists: '++id, createdAt',
  orderItems: '++id, listeId, productId',
  settings: 'key',
})

export async function ayarOku(key: string): Promise<string> {
  const s = await db.settings.get(key)
  return s?.value ?? ''
}

export async function ayarYaz(key: string, value: string): Promise<void> {
  await db.settings.put({ key, value })
}

/** Tüm veriyi JSON'a döker (yedekleme). */
export async function yedekAl(): Promise<string> {
  const [products, customers, suppliers, demands, orderLists, orderItems, settings] =
    await Promise.all([
      db.products.toArray(), db.customers.toArray(), db.suppliers.toArray(),
      db.demands.toArray(), db.orderLists.toArray(), db.orderItems.toArray(),
      db.settings.toArray(),
    ])
  return JSON.stringify(
    { surum: 1, tarih: new Date().toISOString(), products, customers, suppliers, demands, orderLists, orderItems, settings },
    null, 2,
  )
}

/** JSON yedeği geri yükler (mevcut veriyi TAMAMEN değiştirir). */
export async function yedekYukle(json: string): Promise<void> {
  const veri = JSON.parse(json)
  if (!veri || typeof veri !== 'object' || !Array.isArray(veri.products)) {
    throw new Error('Geçersiz yedek dosyası')
  }
  await db.transaction('rw', db.tables, async () => {
    for (const t of db.tables) await t.clear()
    await db.products.bulkAdd(veri.products ?? [])
    await db.customers.bulkAdd(veri.customers ?? [])
    await db.suppliers.bulkAdd(veri.suppliers ?? [])
    await db.demands.bulkAdd(veri.demands ?? [])
    await db.orderLists.bulkAdd(veri.orderLists ?? [])
    await db.orderItems.bulkAdd(veri.orderItems ?? [])
    await db.settings.bulkPut(veri.settings ?? [])
  })
}

export async function tumVeriyiSil(): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    for (const t of db.tables) await t.clear()
  })
}
