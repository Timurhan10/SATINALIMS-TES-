-- Talep başına "kaç adet soruldu" alanı.
-- Supabase Dashboard > SQL Editor > New query'ye yapıştırıp Run deyin.
alter table public.demands add column if not exists adet integer not null default 1;
