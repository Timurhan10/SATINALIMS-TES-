import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import {
  BarChart3, ClipboardList, Contact, KeyRound, LayoutDashboard, ListOrdered,
  LogOut, Moon, Package, Settings, Sun, Truck,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import Panel from './pages/Panel'
import Talepler from './pages/Talepler'
import Katalog from './pages/Katalog'
import DinListesi from './pages/DinListesi'
import Raporlar from './pages/Raporlar'
import SiparisListeleri from './pages/SiparisListeleri'
import Musteriler from './pages/Musteriler'
import Tedarikciler from './pages/Tedarikciler'
import Ayarlar from './pages/Ayarlar'
import Giris from './pages/Giris'
import OrgKurulum from './pages/OrgKurulum'
import KurulumBekleniyor from './pages/KurulumBekleniyor'
import YeniSifre from './pages/YeniSifre'
import Admin from './pages/Admin'
import { ToastAlani } from './components/Toast'
import Logo from './components/Logo'
import { useAuth } from './auth/AuthContext'
import { hasConfig } from './data/client'

const MENU = [
  { yol: '/panel', ad: 'Panel', Ikon: LayoutDashboard },
  { yol: '/talepler', ad: 'Talepler', Ikon: ClipboardList },
  { yol: '/katalog', ad: 'Katalog', Ikon: Package },
  { yol: '/din', ad: 'DIN Listesi', Ikon: ListOrdered },
  { yol: '/raporlar', ad: 'Raporlar', Ikon: BarChart3 },
  { yol: '/siparisler', ad: 'Sipariş Listeleri', Ikon: Truck },
  { yol: '/musteriler', ad: 'Müşteriler', Ikon: Contact },
  { yol: '/tedarikciler', ad: 'Tedarikçiler', Ikon: Contact },
  { yol: '/ayarlar', ad: 'Ayarlar', Ikon: Settings },
]

function temaTercihi(): 'light' | 'dark' {
  const kayit = document.documentElement.dataset.theme
  if (kayit === 'dark' || kayit === 'light') return kayit
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function AskidaEkrani() {
  const { uyelik, cikisYap } = useAuth()
  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="kart max-w-md w-full p-6 md:p-8 text-center">
        <div className="mb-4">
          <Logo boyut="buyuk" />
        </div>
        <h1 className="font-semibold mb-2">Hesabınız askıya alındı</h1>
        <p className="text-sm text-ink-2 leading-relaxed mb-4">
          <strong>{uyelik?.orgAd}</strong> şirketinin erişimi geçici olarak durduruldu.
          Verileriniz silinmedi; erişimi yeniden açmak için sistem sağlayıcınızla iletişime geçin.
        </p>
        <button className="btn btn-ikincil" onClick={cikisYap}>
          <LogOut size={15} aria-hidden /> Çıkış yap
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const [tema, setTema] = useState<'light' | 'dark'>(temaTercihi)
  const { session, uyelik, adminMi, sifreYenileme, yukleniyor, cikisYap } = useAuth()

  useEffect(() => {
    document.documentElement.dataset.theme = tema
    localStorage.setItem('tema', tema)
  }, [tema])

  // ---- kimlik kapısı ----
  if (!hasConfig()) return <KurulumBekleniyor />
  if (yukleniyor) {
    return (
      <div className="min-h-screen grid place-items-center text-ink-3 text-sm">Yükleniyor…</div>
    )
  }
  if (!session) {
    return (
      <>
        <Giris />
        <ToastAlani />
      </>
    )
  }
  if (sifreYenileme) {
    return (
      <>
        <YeniSifre />
        <ToastAlani />
      </>
    )
  }
  if (!uyelik) {
    return (
      <>
        <OrgKurulum />
        <ToastAlani />
      </>
    )
  }
  if (!uyelik.aktif) {
    return (
      <>
        <AskidaEkrani />
        <ToastAlani />
      </>
    )
  }

  return (
    <div className="min-h-screen md:flex">
      {/* Sol menü */}
      <aside className="md:w-60 md:min-h-screen md:flex md:flex-col shrink-0 bg-surface border-b md:border-b-0 md:border-r border-line">
        <div className="flex items-center justify-between gap-2 px-5 py-4">
          <div className="leading-tight">
            <Logo />
            <div className="text-xs text-ink-3 truncate max-w-44 mt-0.5" title={uyelik.orgAd}>{uyelik.orgAd}</div>
          </div>
          {/* Mobil: tema + çıkış (masaüstünde alttaki blok görünür) */}
          <div className="flex gap-1.5 md:hidden">
            <button
              className="btn btn-ikincil btn-kucuk"
              onClick={() => setTema(tema === 'dark' ? 'light' : 'dark')}
              aria-label="Tema değiştir"
            >
              {tema === 'dark' ? <Sun size={15} aria-hidden /> : <Moon size={15} aria-hidden />}
            </button>
            <button className="btn btn-ikincil btn-kucuk" onClick={cikisYap} aria-label="Çıkış yap">
              <LogOut size={15} aria-hidden />
            </button>
          </div>
        </div>
        <nav className="flex md:block overflow-x-auto px-3 pb-3 md:pb-4 gap-1">
          {MENU.map(({ yol, ad, Ikon }) => (
            <NavLink
              key={yol}
              to={yol}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap md:mb-0.5 ${
                  isActive
                    ? 'bg-accent-soft text-accent'
                    : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
                }`
              }
            >
              <Ikon size={17} aria-hidden />
              {ad}
            </NavLink>
          ))}
          {adminMi && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap md:mb-0.5 ${
                  isActive
                    ? 'bg-accent-soft text-accent'
                    : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
                }`
              }
            >
              <KeyRound size={17} aria-hidden />
              Platform Yönetimi
            </NavLink>
          )}
        </nav>
        <div className="hidden md:block px-5 py-4 mt-auto border-t border-line">
          <div className="text-xs text-ink-3 truncate mb-2" title={session.user.email ?? ''}>
            {session.user.email}
          </div>
          <div className="flex gap-2">
            <button
              className="btn btn-ikincil btn-kucuk"
              onClick={() => setTema(tema === 'dark' ? 'light' : 'dark')}
              aria-label="Tema değiştir"
            >
              {tema === 'dark' ? <Sun size={15} aria-hidden /> : <Moon size={15} aria-hidden />}
            </button>
            <button className="btn btn-ikincil btn-kucuk" onClick={cikisYap}>
              <LogOut size={15} aria-hidden /> Çıkış
            </button>
          </div>
        </div>
      </aside>

      {/* İçerik */}
      <main className="flex-1 min-w-0 px-4 md:px-8 py-6 max-w-[1200px]">
        <Routes>
          <Route path="/" element={<Navigate to="/panel" replace />} />
          <Route path="/panel" element={<Panel />} />
          <Route path="/talepler" element={<Talepler />} />
          <Route path="/katalog" element={<Katalog />} />
          <Route path="/din" element={<DinListesi />} />
          <Route path="/raporlar" element={<Raporlar />} />
          <Route path="/siparisler" element={<SiparisListeleri />} />
          <Route path="/musteriler" element={<Musteriler />} />
          <Route path="/tedarikciler" element={<Tedarikciler />} />
          <Route path="/ayarlar" element={<Ayarlar tema={tema} setTema={setTema} />} />
          {adminMi && <Route path="/admin" element={<Admin />} />}
          <Route path="*" element={<Navigate to="/panel" replace />} />
        </Routes>
      </main>
      <ToastAlani />
    </div>
  )
}
