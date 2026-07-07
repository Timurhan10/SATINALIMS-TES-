// Tid Business marka logosu — arka plansız, temaya uyumlu:
// lacivert kısım --logo-ink (koyu temada açık tona döner), turkuaz sabit.
// Görsel dosya yerine metin+CSS ile çizilir: her boyutta keskin, beyaz kutu sorunu yok.

interface Props {
  boyut?: 'kucuk' | 'buyuk'
  slogan?: boolean
}

export default function Logo({ boyut = 'kucuk', slogan = false }: Props) {
  const buyuk = boyut === 'buyuk'
  return (
    <div className={buyuk ? 'inline-block text-center' : 'inline-block'} aria-label="Tid Business">
      <div
        className={`font-extrabold tracking-tight leading-none select-none ${buyuk ? 'text-5xl' : 'text-[26px]'}`}
        style={{ color: 'var(--logo-ink)' }}
      >
        T
        <span className="relative inline-block">
          {/* Türkçe noktasız ı + üstüne turkuaz nokta = markadaki renkli i */}
          ı
          <span
            className="absolute rounded-full"
            style={{
              background: 'var(--logo-teal)',
              width: '0.17em',
              height: '0.17em',
              left: '50%',
              transform: 'translateX(-50%)',
              top: '0.04em',
            }}
            aria-hidden
          />
        </span>
        d
        <span
          className={`font-semibold tracking-normal align-baseline ${buyuk ? 'text-2xl ml-1.5' : 'text-sm ml-1'}`}
          style={{ color: 'var(--logo-teal)' }}
        >
          Business
        </span>
      </div>
      {slogan && (
        <div className={`mt-2 font-medium ${buyuk ? 'text-sm' : 'text-xs'}`} style={{ color: 'var(--logo-ink)', opacity: 0.75 }}>
          Unutulan malzeme yok, kaybolan talep yok
        </div>
      )}
    </div>
  )
}
