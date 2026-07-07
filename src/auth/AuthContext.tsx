// Oturum + şirket üyeliği durumu: tüm uygulama bu bağlamın arkasında çalışır.
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { hasConfig, supabase } from '../data/client'

export interface Uyelik {
  orgId: string
  rol: 'owner' | 'member'
  orgAd: string
}

interface AuthDurum {
  session: Session | null
  uyelik: Uyelik | null
  yukleniyor: boolean
  uyelikYenile: () => Promise<void>
  cikisYap: () => Promise<void>
}

const AuthContext = createContext<AuthDurum>({
  session: null,
  uyelik: null,
  yukleniyor: true,
  uyelikYenile: async () => {},
  cikisYap: async () => {},
})

async function uyelikGetir(): Promise<Uyelik | null> {
  const { data, error } = await supabase().rpc('uyeligim')
  if (error) throw new Error(error.message)
  const satir = (data as Array<{ org_id: string; rol: string; org_ad: string }> | null)?.[0]
  if (!satir) return null
  return { orgId: satir.org_id, rol: satir.rol as Uyelik['rol'], orgAd: satir.org_ad }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [uyelik, setUyelik] = useState<Uyelik | null>(null)
  const [yukleniyor, setYukleniyor] = useState(hasConfig())

  const uyelikYenile = useCallback(async () => {
    try {
      setUyelik(await uyelikGetir())
    } catch (e) {
      console.error(e)
      setUyelik(null)
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

    const { data: dinleyici } = supabase().auth.onAuthStateChange((_olay, yeniSession) => {
      if (!aktif) return
      setSession(yeniSession)
      if (!yeniSession) setUyelik(null)
    })

    return () => {
      aktif = false
      dinleyici.subscription.unsubscribe()
    }
  }, [uyelikYenile])

  const cikisYap = useCallback(async () => {
    await supabase().auth.signOut()
    setSession(null)
    setUyelik(null)
  }, [])

  return (
    <AuthContext.Provider value={{ session, uyelik, yukleniyor, uyelikYenile, cikisYap }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthDurum {
  return useContext(AuthContext)
}
