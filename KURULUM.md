# Bulut Kurulumu (Supabase) — Adım Adım

Bu rehber, sistemi **satılabilir çok şirketli** hale getiren bulut kurulumunu anlatır.
Toplam süre: ~10 dakika. Kredi kartı gerekmez, ücretsiz planla başlar.

---

## 1. Supabase hesabı açın

1. Tarayıcıda **https://supabase.com** adresine gidin.
2. **Start your project** düğmesine tıklayın.
3. E-posta adresinizle (hotmail olur) ücretsiz kayıt olun ve e-postanızı doğrulayın.

## 2. Yeni proje oluşturun

1. **New project** düğmesine tıklayın.
2. Şu alanları doldurun:
   - **Project name:** `paslanmaz-takip`
   - **Database password:** Güçlü bir şifre yazın ve **bir yere not edin** (bu şifre size lazım olmaz ama kaybolmasın).
   - **Region:** **Europe (Frankfurt) — eu-central-1** (Türkiye'ye en yakın)
3. **Create new project** deyin ve 1-2 dakika hazırlanmasını bekleyin.

## 3. Veritabanı şemasını kurun (tek yapıştırma)

1. Sol menüden **SQL Editor**'ü açın.
2. **New query** deyin.
3. Bu repodaki **`supabase/schema.sql`** dosyasının içeriğinin **TAMAMINI** kopyalayıp yapıştırın.
4. Sağ alttaki **Run** düğmesine basın. "Success. No rows returned" görmelisiniz.

## 4. E-posta onayını kapatın

Kayıt zaten davet koduyla kısıtlı olduğu için e-posta onayına gerek yok:

1. Sol menü: **Authentication → Sign In / Providers** (bazı sürümlerde "Providers").
2. **Email** sağlayıcısına tıklayın.
3. **Confirm email** anahtarını **KAPATIN** → **Save**.

## 5. Bağlantı bilgilerini kopyalayın

1. Sol menü: **Project Settings → API** (bazı sürümlerde "API Keys" / "Data API").
2. Şu iki değeri kopyalayın:
   - **Project URL** — `https://xxxxxxxx.supabase.co` biçiminde
   - **anon public** anahtarı — uzun bir metin (`eyJ...`)
3. Bu iki değeri Claude'a yapıştırın → `src/supabaseConfig.ts` dosyasına işlenir,
   push edilir ve site otomatik yayınlanır.

> Not: "anon" anahtarın herkese açık olması **normaldir ve güvenlidir** —
> verileri koruyan şey satır güvenliği (RLS) kurallarıdır; her şirket yalnız
> kendi verisini görebilir.

## 6. İlk şirketinizi kurun

1. Site yayınlanınca uygulamayı açın.
2. **Yeni şirket kur** sekmesinde:
   - E-posta: `timurhan.duzgun.20@hotmail.com` (platform yöneticisi olarak tanımlı adres)
   - Şifre: kendi belirleyeceğiniz şifre (en az 6 karakter)
   - Davet kodu: **`KURUCU2026`**
   - Şirket adı: kendi şirketinizin adı
3. Giriş yaptığınızda sol menüde **Platform Yönetimi** sayfasını göreceksiniz —
   burası yalnız size görünür.

## 7. Satış: davet kodu üretme

- **Platform Yönetimi** sayfasından istediğiniz kadar tek kullanımlık davet kodu üretin.
- Sattığınız her şirkete **bir kod** verin; onlar site linkine girip
  **"Yeni şirket kur"** sekmesinde kendi e-posta + şifre + kod + şirket adıyla kayıt olur.
- Kodun kullanılıp kullanılmadığını aynı sayfadan takip edersiniz.

### Şirket içinde birden çok kullanıcı

Şirket sahibi **Ayarlar → Şirket** kartından **katılım kodu** üretir;
mesai arkadaşı giriş ekranındaki **"Şirkete katıl"** sekmesinde bu kodla kayıt olur
ve aynı şirket verisini görür.

## 8. Eski verilerinizi taşıma (isteğe bağlı)

Tarayıcı içi eski sürümü kullanıyorduysanız:

1. Eski sürümde: **Ayarlar → Yedek indir (JSON)**.
2. Yeni sürümde giriş yaptıktan sonra: **Ayarlar → Yedeği geri yükle** ile aynı dosyayı seçin.

---

## Bilinmesi gerekenler

- **İnternet gerekir:** Veriler artık bulutta; internet olmadan uygulama açılmaz.
- **Ücretsiz plan sınırları:** 500 MB veritabanı (yüz binlerce kayıt), 2 aktif proje.
  Proje **~1 hafta hiç kullanılmazsa** Supabase duraklatır — Dashboard'dan tek tıkla
  **Restore** edilir. Günlük kullanımda bu sorun olmaz.
- **Şifre sıfırlama:** Şimdilik Supabase Dashboard'dan yapılır:
  **Authentication → Users** → kullanıcıyı bulun → ⋮ menüsü → **Send password recovery**.
- **Yedek:** Veriler Supabase'te güvende; yine de arada **Ayarlar → Yedek indir** iyi alışkanlıktır.
