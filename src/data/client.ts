// Supabase istemcisi — config boşken uygulama "Kurulum bekleniyor" ekranında kalır,
// bu durumda istemciye hiç dokunulmaz.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../supabaseConfig'

export function hasConfig(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0
}

let istemci: SupabaseClient | null = null

export function supabase(): SupabaseClient {
  if (!istemci) {
    if (!hasConfig()) throw new Error('Supabase yapılandırması eksik')
    istemci = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }
  return istemci
}

/** RPC hata kodlarını kullanıcıya gösterilecek Türkçe metne çevirir. */
export function hataMesaji(e: unknown): string {
  const m = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e)
  if (m.includes('KOD_GECERSIZ')) return 'Kod geçersiz veya daha önce kullanılmış.'
  if (m.includes('ZATEN_UYE')) return 'Bu hesap zaten bir şirkete üye.'
  if (m.includes('SIRKET_ADI_BOS')) return 'Şirket adı boş olamaz.'
  if (m.includes('SADECE_SAHIP')) return 'Bu işlemi yalnızca şirket sahibi yapabilir.'
  if (m.includes('YETKISIZ')) return 'Bu işlem için yetkiniz yok.'
  if (m.includes('GIRIS_GEREKLI')) return 'Önce giriş yapmalısınız.'
  if (m.includes('Invalid login credentials')) return 'E-posta veya şifre hatalı.'
  if (m.includes('User already registered')) return 'Bu e-posta ile zaten kayıt olunmuş. Giriş yapmayı deneyin.'
  if (m.includes('Password should be at least')) return 'Şifre en az 6 karakter olmalı.'
  if (m.includes('valid email')) return 'Geçerli bir e-posta adresi girin.'
  if (m.toLowerCase().includes('fetch') || m.toLowerCase().includes('network')) {
    return 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.'
  }
  return m
}
