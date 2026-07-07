// Oturum + şirket üyeliği durumu: tüm uygulama bu bağlamın arkasında çalışır.
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { hasConfig, supabase } from '../data/client'
import { adminMiyim } from '../data/api'

export interface Uyelik {
  orgId: string
  rol: 'owner' | 'member'
  orgAd: string
  aktif: boolean // false = şirket askıya alınmış
}

interface AuthDurum {
  session: Session | null
  uyelik: Uyelik | null
  adminMi: boolean
  sifreYenileme: boolean // şifre sıfırlama bağlantısından gelindi
  yukleniyor: boolean
  uyelikYenile: () => Promise<void>
  sifreYenilemeTamam: () => void
  cikisYap: () => Promise<void>
}

const AuthContext = createContext<AuthDurum>({
  session: null,
  uyelik: null,
  adminMi: false,
  sifreYenileme: false,
  yukleniyor: true,
  uyelikYenile: async () => {},
  sifreYenilemeTamam: () => {},
  cikisYap: async () => {},
})

async function uyelikGetir(): Promise<Uyelik | null> {
  const { data, error } = await supabase().rpc('uyeligim')
  if (error) throw new Error(error.message)
  const satir = (data as Array<{ org_id: string; rol: string; org_ad: string; aktif: boolean }> | null)?.[0]
  if (!satir) return null
  return { orgId: satir.org_id, rol: satir.rol as Uyelik['rol'], orgAd: satir.org_ad, aktif: satir.aktif !== false }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [uyelik, setUyelik] = useState<Uyelik | null>(null)
  const [adminMi, setAdminMi] = useState(false)
  const [sifreYenileme, setSifreYenileme] = useState(false)
  const [yukleniyor, setYukleniyor] = useState(hasConfig())

  const uyelikYenile = useCallback(async () => {
    try {
      const [u, a] = await Promise.all([uyelikGetir(), adminMiyim().catch(() => false)])
      setUyelik(u)
      setAdminMi(a)
    } catch (e) {
      console.error(e)
      setUyelik(null)
      setAdminMi(false)
    }
  }, [])

  useEffect(() => {
    if (!hasConfig()) return

    let aktif = true

    supabase()
      .auth.getSession()
      .then(async ({ data }) => {
        if (!aktif) return
        setSession(data.session)
        if (data.session) await uyelikYenile()
        if (aktif) setYukleniyor(false)
      })
      .catch(() => {
        if (aktif) setYukleniyor(false)
      })

    const { data: dinleyici } = supabase().auth.onAuthStateChange((olay, yeniSession) => {
      if (!aktif) return
      setSession(yeniSession)
      if (olay === 'PASSWORD_RECOVERY') setSifreYenileme(true)
      if (!yeniSession) {
        setUyelik(null)
        setAdminMi(false)
        setSifreYenileme(false)
      }
    })

    return () => {
      aktif = false
      dinleyici.subscription.unsubscribe()
    }
  }, [uyelikYenile])

  const sifreYenilemeTamam = useCallback(() => setSifreYenileme(false), [])

  const cikisYap = useCallback(async () => {
    await supabase().auth.signOut()
    setSession(null)
    setUyelik(null)
    setAdminMi(false)
    setSifreYenileme(false)
  }, [])

  return (
    <AuthContext.Provider
      value={{ session, uyelik, adminMi, sifreYenileme, yukleniyor, uyelikYenile, sifreYenilemeTamam, cikisYap }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthDurum {
  return useContext(AuthContext)
}
