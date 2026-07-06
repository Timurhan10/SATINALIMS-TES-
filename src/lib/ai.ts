// Opsiyonel AI özellikleri — kullanıcı kendi Anthropic API anahtarını
// Ayarlar'dan girer (tarayıcıda saklanır, hiçbir sunucuya gönderilmez).
// Anahtar yoksa bu modüldeki özellikler arayüzde gizlenir; sistem tam çalışır.
import Anthropic from '@anthropic-ai/sdk'
import { ayarOku } from '../db'

export const AI_ANAHTAR_KEY = 'anthropicApiKey'

export async function aiAnahtarVarMi(): Promise<boolean> {
  return (await ayarOku(AI_ANAHTAR_KEY)).trim().length > 0
}

async function istemci(): Promise<Anthropic> {
  const anahtar = (await ayarOku(AI_ANAHTAR_KEY)).trim()
  if (!anahtar) throw new Error('AI anahtarı tanımlı değil (Ayarlar sayfasından girin).')
  return new Anthropic({ apiKey: anahtar, dangerouslyAllowBrowser: true })
}

export interface AiUrunCozumu {
  aciklama: string
  grup: string
  standart: string
  standartAdi: string
  olcu: number | null
  boyMm: number | null
  kalite: 'A2' | 'A4' | '420' | ''
}

const URUN_SEMASI = {
  type: 'object',
  properties: {
    aciklama: { type: 'string', description: 'Ürünün standart katalog açıklaması, Türkçe, BÜYÜK HARF' },
    grup: { type: 'string', description: 'Ürün grubu: İMBUS, CİVATA, VİDA, SOMUN, SETİSKUR, SEGMAN, PUL, GÜJON, RONDELA, MARİN, NOZUL, HIRDAVAT veya benzeri' },
    standart: { type: 'string', description: 'DIN standardı, örn. "DIN 933"; bilinmiyorsa boş' },
    standartAdi: { type: 'string', description: 'Standardın Türkçe adı, örn. "ALTIKÖŞE CİVATA TAM DİŞ"' },
    olcu: { type: ['number', 'null'], description: 'Metrik ölçü (M8 → 8); yoksa null' },
    boyMm: { type: ['number', 'null'], description: 'Boy mm; yoksa null' },
    kalite: { type: 'string', enum: ['A2', 'A4', '420', ''], description: 'Paslanmaz kalitesi' },
  },
  required: ['aciklama', 'grup', 'standart', 'standartAdi', 'olcu', 'boyMm', 'kalite'],
  additionalProperties: false,
} as const

/** Katalogda olmayan ürünü doğal dilden çözümler (claude-haiku-4-5). */
export async function urunCozumle(serbestMetin: string): Promise<AiUrunCozumu> {
  const client = await istemci()
  const yanit = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    system:
      'Paslanmaz çelik bağlantı elemanları (cıvata, somun, vida, pul, segman...) konusunda uzman bir katalog asistanısın. ' +
      'Kullanıcının serbest metnini yapılandırılmış ürün kaydına çevir. Türkçe karakterleri doğru kullan.',
    messages: [{ role: 'user', content: `Şu ürün talebini çözümle: "${serbestMetin}"` }],
    output_config: { format: { type: 'json_schema', schema: URUN_SEMASI } },
  })
  if (yanit.stop_reason === 'refusal') throw new Error('AI bu isteği çözümleyemedi.')
  const blok = yanit.content.find((b) => b.type === 'text')
  if (!blok || blok.type !== 'text') throw new Error('AI yanıtı boş döndü.')
  return JSON.parse(blok.text) as AiUrunCozumu
}

/** Rapor verilerinden Türkçe, eyleme dönük yönetici özeti üretir (claude-opus-4-8). */
export async function yoneticiOzeti(raporJson: string): Promise<string> {
  const client = await istemci()
  const stream = client.messages.stream({
    model: 'claude-opus-4-8',
    max_tokens: 2048,
    thinking: { type: 'adaptive' },
    system:
      'Paslanmaz bağlantı elemanı satan bir firmanın satınalma/veri danışmanısın. ' +
      'Sana verilen talep raporunu incele ve TÜRKÇE, kısa, eyleme dönük bir yönetici özeti yaz: ' +
      'hangi ürünler stoğa alınmalı, hangi ürünler en çok soruluyor, kayıpların ana nedeni ne, somut öneriler neler. ' +
      'Madde işaretleri kullan, 250 kelimeyi geçme.',
    messages: [{ role: 'user', content: `Dönem raporu verisi (JSON):\n${raporJson}` }],
  })
  const mesaj = await stream.finalMessage()
  if (mesaj.stop_reason === 'refusal') throw new Error('AI özeti oluşturulamadı.')
  return mesaj.content
    .filter((b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
}
