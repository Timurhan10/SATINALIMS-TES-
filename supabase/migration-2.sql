-- ============================================================================
-- Göç 2: davet kodu üretim düzeltmesi + yönetim özellikleri
-- Supabase Dashboard > SQL Editor > New query'ye TAMAMINI yapıştırıp Run deyin.
-- ============================================================================

-- 1) DÜZELTME: kod üretimi artık eklenti (pgcrypto) gerektirmiyor.
--    Eski sürüm gen_random_bytes'a dayanıyordu; Supabase bu fonksiyonu ayrı
--    şemaya kurduğu için "Kod üret" sunucuda hata veriyordu.
create or replace function public.rastgele_kod()
returns text language sql volatile as $$
  select upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8))
$$;

-- 2) Şirket askıya alma altyapısı
alter table public.orgs add column if not exists is_active boolean not null default true;

-- 3) Platform yöneticileri artık tabloda tutulur (e-posta sabiti kalktı)
create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.app_admins enable row level security;
drop policy if exists self_read on public.app_admins;
create policy self_read on public.app_admins for select to authenticated
  using (user_id = auth.uid());

alter table public.invite_codes add column if not exists admin_yapar boolean not null default false;
update public.invite_codes set admin_yapar = true where code = 'KURUCU2026';

-- Mevcut platform yöneticisini taşı (KURUCU2026'yı kullanan hesap):
insert into public.app_admins (user_id)
  select used_by from public.invite_codes where code = 'KURUCU2026' and used_by is not null
  on conflict do nothing;

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from app_admins where user_id = auth.uid())
$$;

create or replace function public.admin_miyim()
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_platform_admin()
$$;

-- 4) Askıya alınan şirketin tüm veri erişimi kapanır (RLS bu fonksiyona bakar)
create or replace function public.current_org_id()
returns uuid language sql stable security definer set search_path = public as $$
  select m.org_id
  from org_members m join orgs o on o.id = m.org_id
  where m.user_id = auth.uid() and o.is_active
  limit 1
$$;

-- 5) uyeligim artık aktiflik bilgisini de döndürür (dönüş tipi değişti → önce drop)
drop function if exists public.uyeligim();
create function public.uyeligim()
returns table (org_id uuid, rol text, org_ad text, aktif boolean)
language sql stable security definer set search_path = public as $$
  select m.org_id, m.rol, o.ad, o.is_active
  from org_members m join orgs o on o.id = m.org_id
  where m.user_id = auth.uid()
$$;

-- 6) kurulus_olustur: admin_yapar işaretli kodla kurulan hesap platform yöneticisi olur
create or replace function public.kurulus_olustur(davet_kodu text, sirket_adi text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
  v_code text;
  v_admin boolean;
begin
  if auth.uid() is null then raise exception 'GIRIS_GEREKLI'; end if;
  if exists (select 1 from org_members where user_id = auth.uid()) then
    raise exception 'ZATEN_UYE';
  end if;
  if coalesce(trim(sirket_adi), '') = '' then raise exception 'SIRKET_ADI_BOS'; end if;

  update invite_codes set used_by = auth.uid(), used_at = now()
    where code = upper(trim(davet_kodu)) and used_by is null
    returning code, admin_yapar into v_code, v_admin;
  if v_code is null then raise exception 'KOD_GECERSIZ'; end if;

  insert into orgs (ad) values (trim(sirket_adi)) returning id into v_org;
  update invite_codes set org_id = v_org where code = v_code;
  insert into org_members (org_id, user_id, rol, email)
    values (v_org, auth.uid(), 'owner', coalesce(auth.jwt()->>'email', ''));
  if v_admin then
    insert into app_admins (user_id) values (auth.uid()) on conflict do nothing;
  end if;
  return v_org;
end $$;

-- 7) Şirket sahibi: üye çıkarma
create or replace function public.uye_cikar(hedef uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from org_members where user_id = auth.uid() and rol = 'owner') then
    raise exception 'SADECE_SAHIP';
  end if;
  if hedef = auth.uid() then raise exception 'CIKARILAMAZ'; end if;
  delete from org_members
    where org_id = public.current_org_id() and user_id = hedef and rol = 'member';
  if not found then raise exception 'CIKARILAMAZ'; end if;
end $$;

-- 8) Şirket sahibi: şirket adını değiştirme
create or replace function public.sirket_adi_degistir(yeni_ad text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(trim(yeni_ad), '') = '' then raise exception 'SIRKET_ADI_BOS'; end if;
  if not exists (select 1 from org_members where user_id = auth.uid() and rol = 'owner') then
    raise exception 'SADECE_SAHIP';
  end if;
  update orgs set ad = trim(yeni_ad) where id = public.current_org_id();
end $$;

-- 9) Platform yöneticisi: şirket listesi + askıya alma
create or replace function public.org_listele()
returns table (org_id uuid, org_ad text, olusturma timestamptz, aktif boolean, uye_sayisi bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'YETKISIZ'; end if;
  return query
    select o.id, o.ad, o.created_at, o.is_active, count(m.user_id)::bigint
    from orgs o left join org_members m on m.org_id = o.id
    group by o.id
    order by o.created_at desc;
end $$;

create or replace function public.org_aktiflik(hedef uuid, aktif boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'YETKISIZ'; end if;
  update orgs set is_active = org_aktiflik.aktif where id = hedef;
end $$;
