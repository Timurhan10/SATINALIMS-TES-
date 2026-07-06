# 🔩 Paslanmaz Talep Takip

**Paslanmaz bağlantı elemanı (cıvata, somun, vida, pul, segman…) satan firmalar için talep & satınalma takip / raporlama uygulaması.**

Çoğu firma yalnızca *sattığını* kaydeder. Bu uygulama müşterinin **sorduğu ama verilemeyen** talebi de kaydeder — böylece şu sorulara veriyle cevap verirsiniz:

- Hangi ürün kaç kez soruldu?
- Neyi stoğa almalıyız?
- En çok neyi satıyoruz?
- Talepleri neden kaybediyoruz?

> Amaç stok yönetmek değil, **veri kontrolü**.

## 🌐 Canlı Kullanım (GitHub Pages)

Uygulama tamamen tarayıcıda çalışır; **tüm veriler sizin tarayıcınızda (IndexedDB) saklanır**, hiçbir sunucuya gönderilmez. Sayfa herkese açık olsa bile içinde sizin verileriniz yoktur.

**Yayınlamak için (tek seferlik, ~2 dakika):**

1. GitHub'da repo sayfası → **Settings → Pages**
2. **Source**: `GitHub Actions` seçin
3. Repo **public** olmalı (ücretsiz planda Pages şartı). Private kalacaksa alternatif: Actions'taki build artifact'ini indirip `index.html`'i çift tıklayarak açın — uygulama `file://` ile de çalışır.
4. Bu dalı `main`'e birleştirin (veya dal push'u workflow'u zaten tetikler)

Adres: **https://timurhan10.github.io/SATINALIMS-TES-/**

## ✨ Özellikler

| Sayfa | Ne yapar |
|---|---|
| **Panel** | KPI'lar (toplam talep, karşılama %, verilemeyen), durum dağılımı, "stoğa eklenmeli" listesi |
| **Talepler** | Akıllı arama + çoklu seçim; **firma zorunlu**, müşteri adı yazarken otomatik öneri; Verildi/Verilmedi + kayıp nedeni; satır içi anında durum güncelleme |
| **Katalog** | Excel içe aktarma (sürükle-bırak), arama + grup + kalite filtreleri, ürün düzeltme, elle ürün ekleme. **Stok yok.** |
| **DIN Listesi** | DIN kodları büyükten küçüğe; ürün ve talep sayılarıyla; tıklayınca ürünler açılır |
| **Raporlar** | En çok sorulan / verilen / stoğa eklenmeli / kayıp nedeni dağılımı; grafik; CSV; AI yönetici özeti |
| **Sipariş Listeleri** | Kalıcı listeler; ürün ekle; tedarikçiye göndermek için **gerçek .xlsx** indir (FİYAT sütunu boş) |
| **Müşteriler / Tedarikçiler** | Basit rehberler |
| **Ayarlar** | Açık/koyu tema, AI anahtarı, JSON yedek al / geri yükle, örnek veri, tümünü sil |

## 🔍 Akıllı Arama (çekirdek değer)

Serbest metni yapılandırılmış imzaya çevirir ve katalogda skorla eşleştirir:

| Yazdığınız | Anladığı |
|---|---|
| `imbus a2` | Tüm İMBUS A2 ürünleri (A4 **çıkmaz** — kalite STRICT) |
| `933 8*30` | DIN 933, M8×30 — tam eşleşme varsa yalnız onlar |
| `471/10` | MİL SEGMANI DIN 471, ölçü 10 (X bilinen DIN ise standart) |
| `1/2 civata` | 1/2" inç cıvata |
| `somun 8` | SOMUN M8 |
| `4,8*16` | Ölçü 4,8 boy 16 (ondalık destekli) |

Sıralama: kalite (A2 → A4 → 420) → ölçü → boy → standart.

## 📥 Katalog Excel Formatı

4 kolon, ilk sayfa (başlık satırı olabilir):

```
Kart Kodu | Açıklama | Grup Kodu | Özel Kod 1 (DIN xxx + standart adı)
```

- cp1254 kaynaklı bozuk Türkçe karakterler (Ý→İ, Þ→Ş, Ð→Ğ) otomatik düzeltilir
- Kalite (A2/A4/420) ve ölçü/boy açıklamadan otomatik çıkarılır
- **Katalog sayfasına dosyayı sürükleyip bırakmanız yeterli**

## 🤖 AI Özellikleri (opsiyonel)

Ayarlar'a kendi [Anthropic API anahtarınızı](https://console.anthropic.com) girerseniz:

1. **Ürün çözümleme** — katalogda olmayan talebi doğal dilden ürün kartına çevirir (claude-haiku-4-5)
2. **Yönetici özeti** — dönem raporundan Türkçe, eyleme dönük özet (claude-opus-4-8)

Anahtar yalnızca tarayıcınızda saklanır. Anahtar yoksa sistem eksiksiz çalışır; yalnızca bu iki yardımcı gizlenir.

## 💾 Verileriniz

- Tüm veri tarayıcıda (IndexedDB) — internete gönderilmez
- **Ayarlar → Yedek indir** ile JSON yedek alın; başka bilgisayara taşıyabilirsiniz
- Tarayıcı verilerini silerseniz uygulama verisi de silinir — düzenli yedek alın

## 🛠 Geliştirme

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # parser birim testleri
npm run build    # üretim derlemesi (dist/)
```

Teknolojiler: Vite + React 18 + TypeScript, Tailwind CSS v4, Dexie (IndexedDB), Recharts, SheetJS, lucide-react, Anthropic SDK.
