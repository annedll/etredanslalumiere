create extension if not exists pgcrypto;

-- ADMIN
create table if not exists public.app_admins (email text primary key);
alter table public.app_admins enable row level security;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.app_admins where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;
drop policy if exists admins_read on public.app_admins;
create policy admins_read on public.app_admins for select using (public.is_admin());

-- SETTINGS
create table if not exists public.app_settings (key text primary key, value jsonb, updated_at timestamptz default now());
alter table public.app_settings enable row level security;
drop policy if exists settings_read on public.app_settings;
create policy settings_read on public.app_settings for select using (true);
drop policy if exists settings_write on public.app_settings;
create policy settings_write on public.app_settings for all using (public.is_admin()) with check (public.is_admin());

-- PROFILES
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text, first_name text, last_name text, phone text,
  role text not null default 'client' check (role in ('client','admin')),
  marketing_consent boolean default false, created_at timestamptz default now()
);
alter table public.profiles add column if not exists email text;
alter table public.profiles enable row level security;
drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles for select using (id = auth.uid() or public.is_admin());
drop policy if exists profiles_upd on public.profiles;
create policy profiles_upd on public.profiles for update using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

create or replace function public.protect_profile_role() returns trigger language plpgsql as $$
begin
  if new.role is distinct from old.role and coalesce(auth.jwt() ->> 'role','') in ('anon','authenticated') then new.role := old.role; end if;
  return new;
end $$;
drop trigger if exists trg_protect_role on public.profiles;
create trigger trg_protect_role before update on public.profiles for each row execute function public.protect_profile_role();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email) on conflict (id) do update set email = excluded.email;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- OFFERINGS
create table if not exists public.offerings (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('soin','numerologie','formation','atelier','meditation')),
  title text not null, slug text unique not null, summary text, body text, duration_label text,
  modes text[] default '{cabinet}', image_url text, is_bookable_slot boolean default false,
  is_published boolean default true, sort_order int default 0, created_at timestamptz default now()
);
alter table public.offerings enable row level security;
-- Online deposit of each offer (empty = no deposit: full price only).
alter table public.offerings add column if not exists deposit_cents int;
drop policy if exists off_read on public.offerings;
create policy off_read on public.offerings for select using (is_published or public.is_admin());
drop policy if exists off_admin on public.offerings;
create policy off_admin on public.offerings for all using (public.is_admin()) with check (public.is_admin());

create table if not exists public.offering_prices (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid not null references public.offerings(id) on delete cascade,
  label text not null, amount_cents int not null default 0 check (amount_cents >= 0),
  stripe_price_id text, sort_order int default 0, created_at timestamptz default now()
);
alter table public.offering_prices enable row level security;
drop policy if exists price_read on public.offering_prices;
create policy price_read on public.offering_prices for select using (true);
drop policy if exists price_admin on public.offering_prices;
create policy price_admin on public.offering_prices for all using (public.is_admin()) with check (public.is_admin());

-- SESSIONS
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid not null references public.offerings(id) on delete cascade,
  starts_at timestamptz not null, ends_at timestamptz not null, location text, is_online boolean default false,
  capacity int not null default 10 check (capacity >= 0), seats_taken int not null default 0 check (seats_taken >= 0),
  price_id uuid references public.offering_prices(id) on delete set null, co_host text,
  status text not null default 'open' check (status in ('open','full','cancelled')), is_featured boolean default false,
  created_at timestamptz default now()
);
alter table public.sessions enable row level security;
drop policy if exists ses_read on public.sessions;
create policy ses_read on public.sessions for select using (true);
drop policy if exists ses_admin on public.sessions;
create policy ses_admin on public.sessions for all using (public.is_admin()) with check (public.is_admin());

-- REGISTRATIONS
create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','paid','cancelled','refunded')),
  is_deposit boolean default false, stripe_payment_id text, amount_cents int not null default 0, created_at timestamptz default now()
);
alter table public.registrations enable row level security;
drop policy if exists reg_read on public.registrations;
create policy reg_read on public.registrations for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists reg_admin on public.registrations;
create policy reg_admin on public.registrations for all using (public.is_admin()) with check (public.is_admin());

-- WAITLIST
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(), offering_id uuid references public.offerings(id) on delete cascade,
  email text not null check (length(email) <= 200 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'), created_at timestamptz default now()
);
alter table public.waitlist enable row level security;
drop policy if exists wl_insert on public.waitlist;
create policy wl_insert on public.waitlist for insert with check (true);
drop policy if exists wl_admin on public.waitlist;
create policy wl_admin on public.waitlist for all using (public.is_admin()) with check (public.is_admin());

-- AVAILABILITY & APPOINTMENTS
create table if not exists public.availability_slots (
  id uuid primary key default gen_random_uuid(), starts_at timestamptz not null, ends_at timestamptz not null,
  mode text default 'cabinet', is_booked boolean default false, created_at timestamptz default now()
);
alter table public.availability_slots enable row level security;
drop policy if exists slot_read on public.availability_slots;
create policy slot_read on public.availability_slots for select using (true);
drop policy if exists slot_admin on public.availability_slots;
create policy slot_admin on public.availability_slots for all using (public.is_admin()) with check (public.is_admin());

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  slot_id uuid references public.availability_slots(id) on delete set null,
  offering_id uuid references public.offerings(id) on delete set null,
  price_id uuid references public.offering_prices(id) on delete set null,
  mode text, first_name text not null, last_name text not null, email text not null, phone text not null,
  type text not null default 'callback' check (type in ('slot','callback')), message text,
  status text not null default 'new' check (status in ('new','confirmed','done','cancelled')),
  paid_online boolean default false, created_at timestamptz default now()
);
alter table public.appointments add column if not exists mode text;
alter table public.appointments enable row level security;
drop policy if exists apt_read on public.appointments;
create policy apt_read on public.appointments for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists apt_admin on public.appointments;
create policy apt_admin on public.appointments for all using (public.is_admin()) with check (public.is_admin());

-- EBOOKS & ORDERS
create table if not exists public.ebooks (
  id uuid primary key default gen_random_uuid(), title text not null, slug text unique not null, description text,
  cover_url text, file_path text, price_cents int not null default 0, stripe_price_id text, is_published boolean default false,
  created_at timestamptz default now()
);
alter table public.ebooks enable row level security;
drop policy if exists eb_read on public.ebooks;
create policy eb_read on public.ebooks for select using (is_published or public.is_admin());
drop policy if exists eb_admin on public.ebooks;
create policy eb_admin on public.ebooks for all using (public.is_admin()) with check (public.is_admin());

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  ebook_id uuid references public.ebooks(id) on delete set null,
  price_id uuid references public.offering_prices(id) on delete set null,
  item_type text not null check (item_type in ('ebook','meditation_card','pack')),
  amount_cents int not null default 0, stripe_session_id text, status text not null default 'pending' check (status in ('pending','paid','refunded')),
  withdrawal_waiver boolean default false, download_count int default 0, created_at timestamptz default now()
);
alter table public.orders add column if not exists price_id uuid references public.offering_prices(id) on delete set null;
alter table public.orders add column if not exists withdrawal_waiver boolean default false;
alter table public.orders enable row level security;
drop policy if exists ord_read on public.orders;
create policy ord_read on public.orders for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists ord_admin on public.orders;
create policy ord_admin on public.orders for all using (public.is_admin()) with check (public.is_admin());

-- MEDITATION CARDS
create table if not exists public.meditation_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references public.profiles(id) on delete cascade,
  sessions_used int not null default 0, credits int not null default 0, free_sessions_granted int not null default 0,
  updated_at timestamptz default now()
);
alter table public.meditation_cards add column if not exists credits int not null default 0;
alter table public.meditation_cards add column if not exists updated_at timestamptz default now();
alter table public.meditation_cards enable row level security;
drop policy if exists card_read on public.meditation_cards;
create policy card_read on public.meditation_cards for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists card_admin on public.meditation_cards;
create policy card_admin on public.meditation_cards for all using (public.is_admin()) with check (public.is_admin());
create or replace function public.card_compute() returns trigger language plpgsql as $$
begin new.free_sessions_granted := greatest(new.free_sessions_granted, floor(new.sessions_used / 10)); new.updated_at := now(); return new; end $$;
drop trigger if exists trg_card on public.meditation_cards;
create trigger trg_card before insert or update on public.meditation_cards for each row execute function public.card_compute();

-- POSTS, TESTIMONIALS, CONTACT, SOCIAL
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(), title text not null, slug text unique not null, excerpt text, body text,
  cover_url text, category text default 'soins', og_image_url text, published_at timestamptz default now(), is_published boolean default false,
  created_at timestamptz default now()
);
alter table public.posts enable row level security;
drop policy if exists post_read on public.posts;
create policy post_read on public.posts for select using ((is_published and published_at <= now()) or public.is_admin());
drop policy if exists post_admin on public.posts;
create policy post_admin on public.posts for all using (public.is_admin()) with check (public.is_admin());

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(), author_name text not null check (length(author_name) between 2 and 60),
  content text not null check (length(content) between 10 and 1500), offering_id uuid references public.offerings(id) on delete set null,
  consent_publish boolean not null default false, status text not null default 'pending' check (status in ('pending','approved')),
  created_at timestamptz default now()
);
alter table public.testimonials enable row level security;
drop policy if exists tes_read on public.testimonials;
create policy tes_read on public.testimonials for select using ((status = 'approved' and consent_publish) or public.is_admin());
drop policy if exists tes_insert on public.testimonials;
create policy tes_insert on public.testimonials for insert with check (status = 'pending' and consent_publish = true);
drop policy if exists tes_admin on public.testimonials;
create policy tes_admin on public.testimonials for all using (public.is_admin()) with check (public.is_admin());

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(), name text not null check (length(name) <= 100), email text not null check (length(email) <= 200),
  phone text check (length(phone) <= 30), subject text check (length(subject) <= 150), message text not null check (length(message) <= 3000),
  created_at timestamptz default now(), handled boolean default false
);
alter table public.contact_messages enable row level security;
drop policy if exists cm_insert on public.contact_messages;
create policy cm_insert on public.contact_messages for insert with check (handled = false);
drop policy if exists cm_admin on public.contact_messages;
create policy cm_admin on public.contact_messages for all using (public.is_admin()) with check (public.is_admin());

create table if not exists public.social_links (
  id uuid primary key default gen_random_uuid(), network text not null, url text not null, sort_order int default 0, is_active boolean default true
);
alter table public.social_links enable row level security;
drop policy if exists soc_read on public.social_links;
create policy soc_read on public.social_links for select using (is_active or public.is_admin());
drop policy if exists soc_admin on public.social_links;
create policy soc_admin on public.social_links for all using (public.is_admin()) with check (public.is_admin());

-- ANALYTICS, FEEDBACK, BETA
create table if not exists public.page_views (id bigserial primary key, path text check (length(path) <= 200), referrer text check (length(referrer) <= 300), created_at timestamptz default now());
alter table public.page_views enable row level security;
drop policy if exists pv_insert on public.page_views;
create policy pv_insert on public.page_views for insert with check (true);
drop policy if exists pv_read on public.page_views;
create policy pv_read on public.page_views for select using (public.is_admin());

create table if not exists public.feedback (id uuid primary key default gen_random_uuid(), message text not null check (length(message) <= 2000), note int check (note between 1 and 5), email text check (length(email) <= 200), created_at timestamptz default now());
alter table public.feedback enable row level security;
drop policy if exists fb_insert on public.feedback;
create policy fb_insert on public.feedback for insert with check (true);
drop policy if exists fb_read on public.feedback;
create policy fb_read on public.feedback for select using (public.is_admin());

create table if not exists public.beta_invites (code text primary key, email text, used_at timestamptz, created_at timestamptz default now());
alter table public.beta_invites add column if not exists id uuid default gen_random_uuid();
alter table public.beta_invites enable row level security;
drop policy if exists beta_admin on public.beta_invites;
create policy beta_admin on public.beta_invites for all using (public.is_admin()) with check (public.is_admin());
create or replace function public.redeem_beta_invite(p_code text) returns boolean language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  update public.beta_invites set used_at = now() where code = p_code and used_at is null returning true into ok;
  return coalesce(ok, false);
end $$;

-- HELPERS
create or replace function public.setting_num(p_key text, p_default numeric) returns numeric language sql stable security definer set search_path = public as $$
  select coalesce(nullif((select value #>> '{}' from public.app_settings where key = p_key), '')::numeric, p_default);
$$;

-- BOOKING (atomique)
create or replace function public.book_appointment(p_slot_id uuid, p_offering_id uuid, p_price_id uuid, p_mode text, p_first_name text, p_last_name text, p_email text, p_phone text, p_message text, p_marketing boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_ok uuid;
begin
  if length(coalesce(p_first_name,'')) not between 1 and 80 or length(coalesce(p_last_name,'')) not between 1 and 80 then raise exception 'invalid name'; end if;
  if p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(p_email) > 200 then raise exception 'invalid email'; end if;
  if length(coalesce(p_phone,'')) not between 6 and 30 or length(coalesce(p_message,'')) > 1000 then raise exception 'invalid input'; end if;
  if (select count(*) from public.appointments where lower(email) = lower(p_email) and created_at > now() - interval '1 hour') >= 5 then raise exception 'rate limit'; end if;
  if p_slot_id is not null then
    update public.availability_slots set is_booked = true where id = p_slot_id and not is_booked and starts_at > now() returning id into v_ok;
    if v_ok is null then raise exception 'slot taken'; end if;
  end if;
  insert into public.appointments (user_id, slot_id, offering_id, price_id, mode, first_name, last_name, email, phone, type, message)
  values (auth.uid(), p_slot_id, p_offering_id, p_price_id, left(p_mode, 20), trim(p_first_name), trim(p_last_name), trim(p_email), trim(p_phone), case when p_slot_id is null then 'callback' else 'slot' end, nullif(trim(p_message), ''))
  returning id into v_id;
  if auth.uid() is not null then
    update public.profiles set first_name = coalesce(first_name, trim(p_first_name)), last_name = coalesce(last_name, trim(p_last_name)), phone = coalesce(phone, trim(p_phone)), marketing_consent = marketing_consent or coalesce(p_marketing, false) where id = auth.uid();
  end if;
  return v_id;
end $$;
grant execute on function public.book_appointment(uuid,uuid,uuid,text,text,text,text,text,text,boolean) to anon, authenticated;

create or replace function public.cancel_my_appointment(p_id uuid) returns void language plpgsql security definer set search_path = public as $$
declare v_slot uuid;
begin
  update public.appointments set status = 'cancelled' where id = p_id and user_id = auth.uid() and status in ('new','confirmed') returning slot_id into v_slot;
  if v_slot is not null then update public.availability_slots set is_booked = false where id = v_slot; end if;
end $$;

create or replace function public.create_registration(p_session_id uuid, p_deposit boolean) returns json language plpgsql security definer set search_path = public as $$
declare s record; v_amount int; v_id uuid; v_dep int;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select se.*, p.amount_cents as price, o.kind, o.deposit_cents into s from public.sessions se left join public.offering_prices p on p.id = se.price_id join public.offerings o on o.id = se.offering_id where se.id = p_session_id for update of se;
  if s.id is null or s.status = 'cancelled' or s.starts_at < now() then raise exception 'not found'; end if;
  if s.status = 'full' or s.seats_taken >= s.capacity then raise exception 'full'; end if;
  v_amount := coalesce(s.price, 0);
  -- Deposit: the amount set on the offer (0 = none), else the default percentage of the price (Réglages → Informations).
  v_dep := coalesce(s.deposit_cents, round(v_amount * greatest(0, least(100, public.setting_num('deposit.percent', 0))) / 100.0)::int);
  if p_deposit and v_dep > 0 and v_dep < v_amount then
    v_amount := v_dep;
  else
    p_deposit := false;
  end if;
  if v_amount <= 0 then raise exception 'price missing'; end if;
  insert into public.registrations (session_id, user_id, amount_cents, is_deposit) values (p_session_id, auth.uid(), v_amount, coalesce(p_deposit, false)) returning id into v_id;
  return json_build_object('id', v_id, 'amount_cents', v_amount);
end $$;

create or replace function public.create_order(p_item_type text, p_ebook_id uuid, p_price_id uuid, p_waiver boolean) returns json language plpgsql security definer set search_path = public as $$
declare v_amount int; v_id uuid;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if p_item_type = 'ebook' then
    if not coalesce(p_waiver, false) then raise exception 'waiver required'; end if;
    select price_cents into v_amount from public.ebooks where id = p_ebook_id and is_published;
  elsif p_item_type = 'meditation_card' then
    v_amount := (public.setting_num('meditation.card_price', 110) * 100)::int;
  elsif p_item_type = 'pack' then
    select amount_cents into v_amount from public.offering_prices where id = p_price_id;
  else raise exception 'invalid item'; end if;
  if coalesce(v_amount, 0) <= 0 then raise exception 'price missing'; end if;
  insert into public.orders (user_id, ebook_id, price_id, item_type, amount_cents, withdrawal_waiver)
  values (auth.uid(), case when p_item_type = 'ebook' then p_ebook_id end, case when p_item_type = 'pack' then p_price_id end, p_item_type, v_amount, coalesce(p_waiver, false))
  returning id into v_id;
  return json_build_object('id', v_id, 'amount_cents', v_amount);
end $$;

create or replace function public.count_download(p_order_id uuid) returns void language sql security definer set search_path = public as $$
  update public.orders set download_count = download_count + 1 where id = p_order_id and user_id = auth.uid() and status = 'paid';
$$;

-- PAIEMENT CONFIRMÉ (écrit par la plateforme)
create or replace function public.on_stripe_payment() returns trigger language plpgsql security definer set search_path = public as $$
declare v_ref text := coalesce(new.reference, ''); v_id uuid; r record; o record; v_seat uuid;
begin
  if coalesce(new.status, 'paid') not in ('paid','complete','succeeded') then return new; end if;
  if v_ref like 'reg:%' then
    v_id := nullif(substr(v_ref, 5), '')::uuid;
    select * into r from public.registrations where id = v_id;
    if r.id is not null and r.status = 'pending' and new.amount >= r.amount_cents then
      update public.sessions set seats_taken = seats_taken + 1, status = case when seats_taken + 1 >= capacity then 'full' else status end where id = r.session_id and seats_taken < capacity returning id into v_seat;
      update public.registrations set status = 'paid', stripe_payment_id = new.stripe_session_id where id = v_id;
    end if;
  elsif v_ref like 'ord:%' then
    v_id := nullif(substr(v_ref, 5), '')::uuid;
    select * into o from public.orders where id = v_id;
    if o.id is not null and o.status = 'pending' and new.amount >= o.amount_cents then
      update public.orders set status = 'paid', stripe_session_id = new.stripe_session_id where id = v_id;
      if o.item_type = 'meditation_card' and o.user_id is not null then
        insert into public.meditation_cards (user_id, credits) values (o.user_id, 10)
        on conflict (user_id) do update set credits = public.meditation_cards.credits + 10;
      end if;
    end if;
  end if;
  return new;
exception when invalid_text_representation then return new;
end $$;
do $$ begin
  if to_regclass('public.stripe_payments') is not null then
    execute 'drop trigger if exists trg_stripe_payment on public.stripe_payments';
    execute 'create trigger trg_stripe_payment after insert on public.stripe_payments for each row execute function public.on_stripe_payment()';
  end if;
end $$;

-- RGPD
create or replace function public.delete_my_account() returns void language plpgsql security definer set search_path = public as $$
declare v uuid := auth.uid(); v_email text;
begin
  if v is null then return; end if;
  select email into v_email from auth.users where id = v;
  delete from public.appointments where user_id = v or lower(email) = lower(v_email);
  delete from public.waitlist where lower(email) = lower(v_email);
  delete from public.contact_messages where lower(email) = lower(v_email);
  delete from public.meditation_cards where user_id = v;
  delete from auth.users where id = v;
end $$;

create or replace function public.admin_delete_person(p_email text) returns void language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select id into v from auth.users where lower(email) = lower(p_email);
  delete from public.appointments where lower(email) = lower(p_email) or (v is not null and user_id = v);
  delete from public.waitlist where lower(email) = lower(p_email);
  delete from public.contact_messages where lower(email) = lower(p_email);
  delete from public.feedback where lower(email) = lower(p_email);
  if v is not null then delete from public.meditation_cards where user_id = v; delete from auth.users where id = v; end if;
end $$;

create or replace function public.purge_old_contacts() returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  delete from public.contact_messages where created_at < now() - interval '12 months';
end $$;

-- STORAGE
insert into storage.buckets (id, name, public) values ('public-assets', 'public-assets', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('ebooks', 'ebooks', false) on conflict (id) do nothing;
drop policy if exists pa_read on storage.objects;
create policy pa_read on storage.objects for select using (bucket_id = 'public-assets');
drop policy if exists pa_write on storage.objects;
create policy pa_write on storage.objects for insert with check (bucket_id = 'public-assets' and public.is_admin());
drop policy if exists pa_update on storage.objects;
create policy pa_update on storage.objects for update using (bucket_id = 'public-assets' and public.is_admin());
drop policy if exists pa_delete on storage.objects;
create policy pa_delete on storage.objects for delete using (bucket_id = 'public-assets' and public.is_admin());
drop policy if exists eb_file_read on storage.objects;
create policy eb_file_read on storage.objects for select using (
  bucket_id = 'ebooks' and (public.is_admin() or exists (
    select 1 from public.orders o join public.ebooks e on e.id = o.ebook_id
    where o.user_id = auth.uid() and o.status = 'paid' and e.file_path = storage.objects.name))
);
drop policy if exists eb_file_write on storage.objects;
create policy eb_file_write on storage.objects for insert with check (bucket_id = 'ebooks' and public.is_admin());
drop policy if exists eb_file_delete on storage.objects;
create policy eb_file_delete on storage.objects for delete using (bucket_id = 'ebooks' and public.is_admin());

-- DONNÉES INITIALES
insert into public.app_settings (key, value) values
('biz.name', to_jsonb('Être dans la Lumière'::text)),
('biz.practitioner', to_jsonb('Anne Kételair'::text)),
('biz.titles', to_jsonb('Thérapeute énergéticienne, Coach bien-être & Enseignante'::text)),
('biz.slogan', to_jsonb('Ouvrir une porte vers la libération'::text)),
('biz.address', to_jsonb('Place Abbé César Renard, 31'::text)),
('biz.postal', to_jsonb('7730'::text)),
('biz.city', to_jsonb('Bailleul (Estaimpuis)'::text)),
('biz.country', to_jsonb('Belgique'::text)),
('biz.phone', to_jsonb('+32 495 933 704'::text)),
('biz.email', to_jsonb('anneketelair.pro@gmail.com'::text)),
('home.hero.title', to_jsonb('Soins énergétiques, Reiki et méditation à Bailleul (Estaimpuis)'::text)),
('home.benefits', '["Se ressourcer","Sérénité","Gérer son stress","Se recentrer","Vie relationnelle","Clarté d''esprit","Apaisement et détente","Soulager ses douleurs","Développement personnel","Cheminer dans sa spiritualité"]'::jsonb),
('home.distance', to_jsonb('Soins possibles à distance et en visio, pour les humains, les animaux, les plantes, les maisons et les situations.'::text)),
('training.certificate', to_jsonb('Un syllabus et un certificat sont remis à chaque initiation.'::text)),
('health.warning', to_jsonb('Les soins énergétiques sont complémentaires et ne remplacent pas un avis, un diagnostic ou un traitement médical.'::text)),
('cancel.policy', to_jsonb('Merci de prévenir au moins 48 heures à l''avance en cas d''empêchement. Pour les formations, une date de report vous est proposée en priorité.'::text)),
('booking.mode', to_jsonb('slots'::text)),
('deposit.enabled', to_jsonb('false'::text)),
('deposit.amount', to_jsonb('50'::text)),
('meditation.card_price', to_jsonb('110'::text)),
('home.announce.enabled', to_jsonb('false'::text)),
('beta_mode', to_jsonb('false'::text))
on conflict (key) do nothing;

insert into public.social_links (network, url, sort_order)
select 'Facebook', 'https://www.facebook.com/search/top?q=Etre%20dans%20la%20lumi%C3%A8re', 1
where not exists (select 1 from public.social_links);

do $$
declare oid uuid;
  procedure_dummy int;
begin
  perform 1;
end $$;

create or replace function public._seed_offer(p_sort int, p_kind text, p_slug text, p_title text, p_summary text, p_body text, p_dur text, p_modes text[], p_prices jsonb)
returns void language plpgsql as $$
declare v uuid; p jsonb; i int := 0;
begin
  if exists (select 1 from public.offerings where slug = p_slug) then return; end if;
  insert into public.offerings (kind, slug, title, summary, body, duration_label, modes, is_bookable_slot, sort_order)
  values (p_kind, p_slug, p_title, p_summary, p_body, p_dur, p_modes, p_kind in ('soin','numerologie'), p_sort) returning id into v;
  for p in select * from jsonb_array_elements(p_prices) loop
    insert into public.offering_prices (offering_id, label, amount_cents, sort_order) values (v, p->>0, (p->>1)::int, i); i := i + 1;
  end loop;
end $$;

select public._seed_offer(1,'soin','consultation-soin-energetique','Consultation avec soin énergétique','Écoute, décodage biologique et soin énergétique en 1h30.','Écoute, bienveillance, empathie et accompagnement.

Décodage biologique : mettre des mots sur les maux.

Développement personnel et mantras, olfactif (huiles essentielles) et tirage d''oracle.','1h30','{cabinet,distance,visio}','[["1h30",8000],["Heure suivante",7000]]');
select public._seed_offer(2,'soin','accompagnement','Accompagnement','Un suivi sur plusieurs séances pour avancer pas à pas.','L''accompagnement réunit plusieurs consultations avec soin pour cheminer dans la durée, à votre rythme.','4 ou 7 séances','{cabinet,distance,visio}','[["4 séances",30000],["7 séances",49000]]');
select public._seed_offer(3,'soin','soin-energetique','Soin énergétique seul','Un temps de soin pour relâcher les tensions et se recentrer.','Le soin énergétique se reçoit au cabinet, à distance ou en visio, pour les humains, les animaux, les plantes, les maisons et les situations.','1h','{cabinet,distance,visio}','[["1 séance (1h)",6000],["4 séances",22000]]');
select public._seed_offer(4,'soin','genealogie-soin-energetique','Généalogie et soin énergétique','Prendre conscience de son arbre et de ses schémas répétitifs.','Prise de conscience de l''arbre généalogique et des schémas répétitifs, puis soin énergétique en complément, retour du soin et tirage d''une carte.','Sur rendez-vous','{cabinet,distance,visio}','[]');
select public._seed_offer(5,'numerologie','numerologie-metamorphose','Numérologie de la Métamorphose','Votre thème à partir de vos nom, prénoms et date de naissance.','Le thème est réalisé à partir de vos nom, prénoms et date de naissance, et vous recevez un mantra personnalisé.','Thème personnalisé','{cabinet,distance,visio}','[["Thème complet",13500],["Mantra de l''âme et vos 5 talents",4500]]');
select public._seed_offer(10,'formation','reiki-usui','Reiki Usui','Initiation en 4 degrés, jusqu''au degré de Maître-enseignant.','Le Reiki Usui est une méthode japonaise de soin énergétique par l''imposition des mains. Il se transmet en 4 degrés : le 1er degré sur 2 journées, le 2e degré sur 1 journée, le 3e degré ou Maîtrise sur 1 journée et le 4e degré, Maître-enseignant, sur 1 journée.','1 à 2 journées par degré','{cabinet}','[["1er degré (2 journées)",19500],["2e degré (1 journée)",26000],["3e degré, Maîtrise (1 journée)",24000],["4e degré, Maître-enseignant (1 journée)",24000]]');
select public._seed_offer(11,'formation','lahochi-13e-octave','Lahochi / 13e Octave','Une journée d''initiation à ce système de soin par les mains.','Le Lahochi, aussi appelé 13e Octave, est un système énergétique de soin par l''imposition des mains. L''initiation se déroule sur une journée.','1 journée','{cabinet}','[["1 journée",14500]]');
select public._seed_offer(12,'formation','triangle-dore-isis','Triangle Doré d''Isis','Une journée d''initiation au Triangle Doré d''Isis.','Le Triangle Doré d''Isis est un système énergétique enseigné en une journée.','1 journée','{cabinet}','[["1 journée",14500]]');
select public._seed_offer(13,'formation','shamballa','Shamballa','Initiation au système énergétique Shamballa.','Le Shamballa est un système énergétique transmis lors d''une initiation. Les dates et le tarif sont communiqués sur demande.','Sur demande','{cabinet}','[]');
select public._seed_offer(20,'atelier','pendule-radiesthesie','Initiation au pendule / Radiesthésie','Apprendre à utiliser le pendule, en journée ou en soirée.','Découverte de la radiesthésie et de l''usage du pendule, en journée complète ou en soirée de 3 heures.','1 journée ou 3h','{cabinet}','[["1 journée",12000],["Soirée (3h)",6000]]');
select public._seed_offer(21,'atelier','enfant-interieur','Journée sur l''Enfant Intérieur','Méditations, exercices et constellations, en duo avec Catherine Vandenbroucke.','Une journée pour rencontrer votre enfant intérieur : méditations, exercices et constellations, animée en duo avec Catherine Vandenbroucke.','1 journée','{cabinet}','[["1 journée",12000]]');
select public._seed_offer(22,'atelier','systeme-energetique','Initiation au système énergétique','Comprendre les bases du système énergétique.','Un atelier pour découvrir les bases du système énergétique du corps.','Atelier','{cabinet}','[["Atelier",12000]]');
select public._seed_offer(23,'atelier','art-therapie','Art-thérapie, connaissance de soi','3 heures pour mieux se connaître par la création.','Un atelier d''art-thérapie de 3 heures pour explorer la connaissance de soi par la création, sans aucun prérequis artistique.','3h','{cabinet}','[["3 heures",4500]]');
select public._seed_offer(30,'meditation','meditations-hebdomadaires','Méditations hebdomadaires','Méditation guidée à thème, olfactif et oracle, chaque semaine.','Chaque semaine, une heure de méditation guidée à thème, accompagnée d''huiles essentielles et d''un tirage d''oracle. La 11e séance est offerte grâce au carnet de fidélité.','1h','{cabinet}','[["1 séance",1100]]');

-- ===== Ajout du 2026-11-11 15:49 =====
-- Données de départ du flyer (rejouable : rien n'est dupliqué ni écrasé)

-- Réglages
insert into public.app_settings (key, value) values
('biz.name', '"Être dans la Lumière"'),
('biz.practitioner', '"Anne Kételair"'),
('biz.titles', '"Thérapeute énergéticienne, Coach bien-être & Enseignante"'),
('biz.slogan', '"Ouvrir une porte vers la libération"'),
('biz.domains', '"Méditation et chants sacrés, développement personnel, spiritualité, thérapies et soins énergétiques"'),
('biz.address', '"Place Abbé César Renard, 31"'),
('biz.postal', '"7730"'),
('biz.city', '"Bailleul (Estaimpuis)"'),
('biz.country', '"Belgique"'),
('biz.phone', '"+32 495 933 704"'),
('biz.email', '"anneketelair.pro@gmail.com"'),
('home.announce.enabled', '"false"'),
('home.announce.text', '"Méditation guidée chaque semaine : découvrez les prochaines dates dans l''agenda."'),
('home.hero.title', '"Soins énergétiques, Reiki et méditation à Bailleul (Estaimpuis)"'),
('home.hero.subtitle', '"Anne Kételair, thérapeute énergéticienne, coach bien-être et enseignante, vous accompagne au cabinet de Bailleul, à distance ou en visio, pour vous ressourcer, apaiser le stress et cheminer vers plus de clarté."'),
('home.benefits.title', '"Ce que les soins peuvent vous apporter"'),
('home.benefits', '["Se ressourcer","Sérénité","Gérer son stress","Se recentrer","Vie relationnelle","Clarté d''esprit","Apaisement et détente","Soulager ses douleurs","Développement personnel","Cheminer dans sa spiritualité"]'),
('home.distance', '"Soins possibles à distance et en visio, pour les humains, les animaux, les plantes, les maisons et les situations."'),
('training.certificate', '"Un syllabus et un certificat sont remis à chaque initiation."'),
('health.warning', '"Les soins énergétiques sont complémentaires et ne remplacent pas un avis, un diagnostic ou un traitement médical."'),
('cancel.policy', '"Merci de prévenir au moins 48 heures à l''avance en cas d''empêchement. Pour les formations, une date de report vous est proposée en priorité."'),
('booking.mode', '"slots"'),
('deposit.enabled', '"false"'),
('deposit.amount', '"50"'),
('meditation.card_price', '"110"'),
('beta_mode', '"false"')
on conflict (key) do nothing;

-- Offres
insert into public.offerings (kind, title, slug, summary, body, duration_label, modes, image_url, is_bookable_slot, is_published, sort_order)
select 'soin', 'Consultation avec soin énergétique', 'consultation-soin-energetique', 'Écoute, décodage biologique et soin énergétique en 1h30.', 'Écoute, bienveillance, empathie et accompagnement.

Décodage biologique : mettre des mots sur les maux.

Développement personnel et mantras, olfactif (huiles essentielles) et tirage d''oracle.', '1h30', '{cabinet,distance,visio}', 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=900&q=80', true, true, 1
where not exists (select 1 from public.offerings where slug = 'consultation-soin-energetique');

insert into public.offerings (kind, title, slug, summary, body, duration_label, modes, image_url, is_bookable_slot, is_published, sort_order)
select 'soin', 'Accompagnement', 'accompagnement', 'Un suivi sur plusieurs séances pour avancer pas à pas.', 'L''accompagnement réunit plusieurs consultations avec soin pour cheminer dans la durée, à votre rythme.', '4 ou 7 séances', '{cabinet,distance,visio}', 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=900&q=80', true, true, 2
where not exists (select 1 from public.offerings where slug = 'accompagnement');

insert into public.offerings (kind, title, slug, summary, body, duration_label, modes, image_url, is_bookable_slot, is_published, sort_order)
select 'soin', 'Soin énergétique seul', 'soin-energetique', 'Un temps de soin pour relâcher les tensions et se recentrer.', 'Le soin énergétique se reçoit au cabinet, à distance ou en visio, pour les humains, les animaux, les plantes, les maisons et les situations.', '1h', '{cabinet,distance,visio}', 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=900&q=80', true, true, 3
where not exists (select 1 from public.offerings where slug = 'soin-energetique');

insert into public.offerings (kind, title, slug, summary, body, duration_label, modes, image_url, is_bookable_slot, is_published, sort_order)
select 'soin', 'Généalogie et soin énergétique', 'genealogie-soin-energetique', 'Prendre conscience de son arbre et de ses schémas répétitifs.', 'Prise de conscience de l''arbre généalogique et des schémas répétitifs, puis soin énergétique en complément, retour du soin et tirage d''une carte.', 'Sur rendez-vous', '{cabinet,distance,visio}', 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=900&q=80', true, true, 4
where not exists (select 1 from public.offerings where slug = 'genealogie-soin-energetique');

insert into public.offerings (kind, title, slug, summary, body, duration_label, modes, image_url, is_bookable_slot, is_published, sort_order)
select 'numerologie', 'Numérologie de la Métamorphose', 'numerologie-metamorphose', 'Votre thème à partir de vos nom, prénoms et date de naissance.', 'Le thème est réalisé à partir de vos nom, prénoms et date de naissance, et vous recevez un mantra personnalisé.', 'Thème personnalisé', '{cabinet,distance,visio}', 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=900&q=80', true, true, 5
where not exists (select 1 from public.offerings where slug = 'numerologie-metamorphose');

insert into public.offerings (kind, title, slug, summary, body, duration_label, modes, image_url, is_bookable_slot, is_published, sort_order)
select 'formation', 'Reiki Usui', 'reiki-usui', 'Initiation en 4 degrés, jusqu''au degré de Maître-enseignant.', 'Le Reiki Usui est une méthode japonaise de soin énergétique par l''imposition des mains. Il se transmet en 4 degrés : le 1er degré sur 2 journées, le 2e degré sur 1 journée, le 3e degré ou Maîtrise sur 1 journée et le 4e degré, Maître-enseignant, sur 1 journée.', '1 à 2 journées par degré', '{cabinet}', 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=900&q=80', false, true, 10
where not exists (select 1 from public.offerings where slug = 'reiki-usui');

insert into public.offerings (kind, title, slug, summary, body, duration_label, modes, image_url, is_bookable_slot, is_published, sort_order)
select 'formation', 'Lahochi / 13e Octave', 'lahochi-13e-octave', 'Une journée d''initiation à ce système de soin par les mains.', 'Le Lahochi, aussi appelé 13e Octave, est un système énergétique de soin par l''imposition des mains. L''initiation se déroule sur une journée.', '1 journée', '{cabinet}', 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=900&q=80', false, true, 11
where not exists (select 1 from public.offerings where slug = 'lahochi-13e-octave');

insert into public.offerings (kind, title, slug, summary, body, duration_label, modes, image_url, is_bookable_slot, is_published, sort_order)
select 'formation', 'Triangle Doré d''Isis', 'triangle-dore-isis', 'Une journée d''initiation au Triangle Doré d''Isis.', 'Le Triangle Doré d''Isis est un système énergétique enseigné en une journée.', '1 journée', '{cabinet}', 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=900&q=80', false, true, 12
where not exists (select 1 from public.offerings where slug = 'triangle-dore-isis');

insert into public.offerings (kind, title, slug, summary, body, duration_label, modes, image_url, is_bookable_slot, is_published, sort_order)
select 'formation', 'Shamballa', 'shamballa', 'Initiation au système énergétique Shamballa.', 'Le Shamballa est un système énergétique transmis lors d''une initiation. Les dates et le tarif sont communiqués sur demande.', 'Sur demande', '{cabinet}', 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=900&q=80', false, true, 13
where not exists (select 1 from public.offerings where slug = 'shamballa');

insert into public.offerings (kind, title, slug, summary, body, duration_label, modes, image_url, is_bookable_slot, is_published, sort_order)
select 'atelier', 'Initiation au pendule / Radiesthésie', 'pendule-radiesthesie', 'Apprendre à utiliser le pendule, en journée ou en soirée.', 'Découverte de la radiesthésie et de l''usage du pendule, en journée complète ou en soirée de 3 heures.', '1 journée ou 3h', '{cabinet}', 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=900&q=80', false, true, 20
where not exists (select 1 from public.offerings where slug = 'pendule-radiesthesie');

insert into public.offerings (kind, title, slug, summary, body, duration_label, modes, image_url, is_bookable_slot, is_published, sort_order)
select 'atelier', 'Journée sur l''Enfant Intérieur', 'enfant-interieur', 'Méditations, exercices et constellations, en duo avec Catherine Vandenbroucke.', 'Une journée pour rencontrer votre enfant intérieur : méditations, exercices et constellations, animée en duo avec Catherine Vandenbroucke.', '1 journée', '{cabinet}', 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=900&q=80', false, true, 21
where not exists (select 1 from public.offerings where slug = 'enfant-interieur');

insert into public.offerings (kind, title, slug, summary, body, duration_label, modes, image_url, is_bookable_slot, is_published, sort_order)
select 'atelier', 'Initiation au système énergétique', 'systeme-energetique', 'Comprendre les bases du système énergétique.', 'Un atelier pour découvrir les bases du système énergétique du corps.', 'Atelier', '{cabinet}', 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=900&q=80', false, true, 22
where not exists (select 1 from public.offerings where slug = 'systeme-energetique');

insert into public.offerings (kind, title, slug, summary, body, duration_label, modes, image_url, is_bookable_slot, is_published, sort_order)
select 'atelier', 'Art-thérapie, connaissance de soi', 'art-therapie', '3 heures pour mieux se connaître par la création.', 'Un atelier d''art-thérapie de 3 heures pour explorer la connaissance de soi par la création, sans aucun prérequis artistique.', '3h', '{cabinet}', 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=900&q=80', false, true, 23
where not exists (select 1 from public.offerings where slug = 'art-therapie');

insert into public.offerings (kind, title, slug, summary, body, duration_label, modes, image_url, is_bookable_slot, is_published, sort_order)
select 'meditation', 'Méditations hebdomadaires', 'meditations-hebdomadaires', 'Méditation guidée à thème, olfactif et oracle, chaque semaine.', 'Chaque semaine, une heure de méditation guidée à thème, accompagnée d''huiles essentielles et d''un tirage d''oracle. La 11e séance est offerte grâce au carnet de fidélité.', '1h', '{cabinet}', 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=900&q=80', false, true, 30
where not exists (select 1 from public.offerings where slug = 'meditations-hebdomadaires');

-- Tarifs (ajoutés seulement si le libellé n'existe pas déjà pour l'offre)
insert into public.offering_prices (offering_id, label, amount_cents, sort_order)
select o.id, v.label, v.amount, v.ord
from public.offerings o
join (values
  ('consultation-soin-energetique', '1h30', 8000, 0),
  ('consultation-soin-energetique', 'Heure suivante', 7000, 1),
  ('accompagnement', '4 séances', 30000, 0),
  ('accompagnement', '7 séances', 49000, 1),
  ('soin-energetique', '1 séance (1h)', 6000, 0),
  ('soin-energetique', '4 séances', 22000, 1),
  ('numerologie-metamorphose', 'Thème complet', 13500, 0),
  ('numerologie-metamorphose', 'Mantra de l''âme et vos 5 talents', 4500, 1),
  ('reiki-usui', '1er degré (2 journées)', 19500, 0),
  ('reiki-usui', '2e degré (1 journée)', 26000, 1),
  ('reiki-usui', '3e degré, Maîtrise (1 journée)', 24000, 2),
  ('reiki-usui', '4e degré, Maître-enseignant (1 journée)', 24000, 3),
  ('lahochi-13e-octave', '1 journée', 14500, 0),
  ('triangle-dore-isis', '1 journée', 14500, 0),
  ('pendule-radiesthesie', '1 journée', 12000, 0),
  ('pendule-radiesthesie', 'Soirée (3h)', 6000, 1),
  ('enfant-interieur', '1 journée', 12000, 0),
  ('systeme-energetique', 'Atelier', 12000, 0),
  ('art-therapie', '3 heures', 4500, 0),
  ('meditations-hebdomadaires', '1 séance', 1100, 0)
) as v(slug, label, amount, ord) on o.slug = v.slug
where not exists (select 1 from public.offering_prices p where p.offering_id = o.id and p.label = v.label);

-- Réseau social de départ
insert into public.social_links (network, url, sort_order, is_active)
select 'Facebook', 'https://www.facebook.com/search/top?q=Etre%20dans%20la%20lumi%C3%A8re', 1, true
where not exists (select 1 from public.social_links where network = 'Facebook');

-- ===== Ajout du 2026-11-11 16:20 =====
-- Aucun changement de base de données nécessaire pour cette correction.
select 1;

-- ===== Ajout du 2026-11-11 16:22 =====
-- Aucun changement de base de données nécessaire.
select 1;

-- ===== Ajout du 2026-11-11 16:39 =====
-- Refonte visuelle uniquement : aucune modification de la base de données.
select 1;

-- ===== Ajout du 2026-11-11 16:52 =====
-- Aucun changement de base de données pour cette modification.
select 1;

-- ===== Ajout du 2026-11-11 16:54 =====
select 1;

-- ===== Ajout du 2026-11-11 17:23 =====
-- Aucun changement de base de données pour cette mise à jour.
select 1;

-- ===== Ajout du 2026-11-11 17:26 =====
-- Textes sans répétition : mise à jour uniquement si l'ancienne valeur par défaut est encore en place
update public.app_settings set value = to_jsonb('Anne Kételair vous accompagne au cabinet, à distance ou en visio pour vous ressourcer, apaiser le stress et retrouver de la clarté.'::text)
where key = 'home.hero.subtitle' and value = to_jsonb('Anne Kételair, thérapeute énergéticienne, coach bien-être et enseignante, vous accompagne au cabinet de Bailleul, à distance ou en visio, pour vous ressourcer, apaiser le stress et cheminer vers plus de clarté.'::text);

update public.app_settings set value = to_jsonb('Prête à vous offrir un temps pour vous ?'::text)
where key = 'home.cta.title' and value = to_jsonb('Prête à ouvrir une porte vers la libération ?'::text);

update public.app_settings set value = to_jsonb('Pendule et radiesthésie, journée sur l''enfant intérieur, art-thérapie, initiation au système énergétique et séances guidées chaque semaine.'::text)
where key = 'ateliers.intro' and value = to_jsonb('Pendule et radiesthésie, journée sur l''enfant intérieur, art-thérapie, initiation au système énergétique et méditations guidées chaque semaine.'::text);

-- ===== Ajout du 2026-11-11 17:33 =====
-- Fixe le chemin de recherche des fonctions signalées (sans modifier leur contenu)
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('protect_profile_role', 'card_compute', '_seed_offer')
  loop
    execute format('alter function %s set search_path = public', r.sig);
  end loop;
end $$;

-- ===== Ajout du 2026-11-11 17:44 =====
-- Aucune modification de la base pour cette mise à niveau.
select 1;

-- ===== Ajout du 2026-11-11 17:54 =====
-- Aucun changement de base de données nécessaire pour l'espace Gestion.
select 1;

-- ===== Ajout du 2026-11-11 18:02 =====
-- Aucun changement de base de données nécessaire.

-- ===== Ajout du 2026-11-11 18:09 =====
alter table public.page_views enable row level security;
drop policy if exists "page_views_admin_delete" on public.page_views;
create policy "page_views_admin_delete" on public.page_views for delete using (public.is_admin());

-- ===== Ajout du 2026-11-11 18:13 =====
-- Coordonnées : on retire les valeurs écrites en dur pour laisser le kit de marque (informations légales) s'appliquer.
delete from public.app_settings where key = 'biz.email' and value::text like '%anneketelair.pro@gmail.com%';
delete from public.app_settings where key = 'biz.phone' and value::text like '%495 933 704%';

-- ===== Ajout du 2026-11-11 18:17 =====
-- Les coordonnées viennent désormais du kit de marque (brand.legal) : on retire les valeurs écrites en dur.
delete from public.app_settings
where key in ('biz.phone', 'biz.email')
   or value::text ilike '%495%933%704%'
   or value::text ilike '%anneketelair%';

-- ===== Ajout du 2026-11-11 18:45 =====
-- Aucun changement de base de données n'est nécessaire pour cette correction.
select 1;

-- ===== Ajout du 2026-11-11 18:48 =====
-- Aucun changement de base de données pour cette étape.
select 1;

-- ===== Ajout du 2026-11-11 18:56 =====
select 1;

-- ===== Ajout du 2026-11-11 19:36 =====
-- Les coordonnées viennent désormais uniquement du kit de marque (Informations légales)
delete from public.app_settings where key in ('biz.phone', 'biz.email');
delete from public.app_settings
where value::text like '%495 933 704%'
   or value::text like '%495933704%'
   or value::text like '%495.93.37.04%'
   or value::text like '%0495 93 37 04%';

-- ===== Ajout du 2026-11-11 19:52 =====
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists phone text;
drop policy if exists profiles_self_update_basic on public.profiles;
create policy profiles_self_update_basic on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ===== Ajout du 2026-11-11 20:19 =====
-- Aucun changement de base de données pour cette mise à niveau.
select 1;

-- ===== Ajout du 2026-11-11 21:16 =====
-- Aucune modification de la base pour cette mise à jour.
select 1;

-- ===== Ajout du 2026-11-11 21:36 =====
do $$
begin
  if not exists (select 1 from public.app_settings where key = 'demo_seeded') then

    -- Offres
    insert into public.offerings (kind, title, slug, summary, body, duration_label, modes, image_url, is_bookable_slot, is_published, sort_order)
    select v.kind, v.title, v.slug, v.summary, v.body, v.duration_label, v.modes, v.image_url, v.bookable, true, v.sort_order
    from (values
      ('soin','Consultation avec soin énergétique','consultation-soin-energetique','Écoute, décodage biologique et soin énergétique en 1h30.',E'Écoute, bienveillance, empathie et accompagnement.\n\nDécodage biologique : mettre des mots sur les maux.\n\nDéveloppement personnel et mantras, olfactif (huiles essentielles) et tirage d''oracle.','1h30',array['cabinet','distance','visio'],'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=900&auto=format&q=70',true,1),
      ('soin','Accompagnement','accompagnement','Un suivi sur plusieurs séances pour avancer pas à pas.','L''accompagnement réunit plusieurs consultations avec soin pour cheminer dans la durée, à votre rythme.','4 ou 7 séances',array['cabinet','distance','visio'],'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=900&auto=format&q=70',true,2),
      ('soin','Soin énergétique seul','soin-energetique','Un temps de soin pour relâcher les tensions et se recentrer.','Le soin énergétique se reçoit au cabinet, à distance ou en visio, pour les humains, les animaux, les plantes, les maisons et les situations.','1h',array['cabinet','distance','visio'],'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=900&auto=format&q=70',true,3),
      ('soin','Généalogie et soin énergétique','genealogie-soin-energetique','Prendre conscience de son arbre et de ses schémas répétitifs.','Prise de conscience de l''arbre généalogique et des schémas répétitifs, puis soin énergétique en complément, retour du soin et tirage d''une carte.','Sur rendez-vous',array['cabinet','distance','visio'],'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=900&auto=format&q=70',true,4),
      ('numerologie','Numérologie de la Métamorphose','numerologie-metamorphose','Votre thème à partir de vos nom, prénoms et date de naissance.','Le thème est réalisé à partir de vos nom, prénoms et date de naissance, et vous recevez un mantra personnalisé.','Thème personnalisé',array['cabinet','distance','visio'],'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=900&auto=format&q=70',true,5),
      ('formation','Reiki Usui','reiki-usui','Initiation en 4 degrés, jusqu''au degré de Maître-enseignant.','Le Reiki Usui est une méthode japonaise de soin énergétique par l''imposition des mains. Il se transmet en 4 degrés : le 1er degré sur 2 journées, le 2e degré sur 1 journée, le 3e degré ou Maîtrise sur 1 journée et le 4e degré, Maître-enseignant, sur 1 journée.','1 à 2 journées par degré',array['cabinet'],'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=900&auto=format&q=70',false,10),
      ('formation','Lahochi / 13e Octave','lahochi-13e-octave','Une journée d''initiation à ce système de soin par les mains.','Le Lahochi, aussi appelé 13e Octave, est un système énergétique de soin par l''imposition des mains. L''initiation se déroule sur une journée.','1 journée',array['cabinet'],'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=900&auto=format&q=70',false,11),
      ('formation','Triangle Doré d''Isis','triangle-dore-isis','Une journée d''initiation au Triangle Doré d''Isis.','Le Triangle Doré d''Isis est un système énergétique enseigné en une journée.','1 journée',array['cabinet'],'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=900&auto=format&q=70',false,12),
      ('formation','Shamballa','shamballa','Initiation au système énergétique Shamballa.','Le Shamballa est un système énergétique transmis lors d''une initiation. Les dates et le tarif sont communiqués sur demande.','Sur demande',array['cabinet'],'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=900&auto=format&q=70',false,13),
      ('atelier','Initiation au pendule / Radiesthésie','pendule-radiesthesie','Apprendre à utiliser le pendule, en journée ou en soirée.','Découverte de la radiesthésie et de l''usage du pendule, en journée complète ou en soirée de 3 heures.','1 journée ou 3h',array['cabinet'],'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=900&auto=format&q=70',false,20),
      ('atelier','Journée sur l''Enfant Intérieur','enfant-interieur','Méditations, exercices et constellations, en duo avec Catherine Vandenbroucke.','Une journée pour rencontrer votre enfant intérieur : méditations, exercices et constellations, animée en duo avec Catherine Vandenbroucke.','1 journée',array['cabinet'],'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=900&auto=format&q=70',false,21),
      ('atelier','Initiation au système énergétique','systeme-energetique','Comprendre les bases du système énergétique.','Un atelier pour découvrir les bases du système énergétique du corps.','Atelier',array['cabinet'],'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=900&auto=format&q=70',false,22),
      ('atelier','Art-thérapie, connaissance de soi','art-therapie','3 heures pour mieux se connaître par la création.','Un atelier d''art-thérapie de 3 heures pour explorer la connaissance de soi par la création, sans aucun prérequis artistique.','3h',array['cabinet'],'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=900&auto=format&q=70',false,23),
      ('meditation','Méditations hebdomadaires','meditations-hebdomadaires','Méditation guidée à thème, olfactif et oracle, chaque semaine.','Chaque semaine, une heure de méditation guidée à thème, accompagnée d''huiles essentielles et d''un tirage d''oracle. La 11e séance est offerte grâce au carnet de fidélité.','1h',array['cabinet'],'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=900&auto=format&q=70',false,30)
    ) as v(kind,title,slug,summary,body,duration_label,modes,image_url,bookable,sort_order)
    where not exists (select 1 from public.offerings o where o.slug = v.slug);

    -- Tarifs
    insert into public.offering_prices (offering_id, label, amount_cents, sort_order)
    select o.id, v.label, v.amt, v.ord
    from (values
      ('consultation-soin-energetique','1h30',8000,0),('consultation-soin-energetique','Heure suivante',7000,1),
      ('accompagnement','4 séances',30000,0),('accompagnement','7 séances',49000,1),
      ('soin-energetique','1 séance (1h)',6000,0),('soin-energetique','4 séances',22000,1),
      ('numerologie-metamorphose','Thème complet',13500,0),('numerologie-metamorphose','Mantra de l''âme et vos 5 talents',4500,1),
      ('reiki-usui','1er degré (2 journées)',19500,0),('reiki-usui','2e degré (1 journée)',26000,1),('reiki-usui','3e degré, Maîtrise (1 journée)',24000,2),('reiki-usui','4e degré, Maître-enseignant (1 journée)',24000,3),
      ('lahochi-13e-octave','1 journée',14500,0),('triangle-dore-isis','1 journée',14500,0),
      ('pendule-radiesthesie','1 journée',12000,0),('pendule-radiesthesie','Soirée (3h)',6000,1),
      ('enfant-interieur','1 journée',12000,0),('systeme-energetique','Atelier',12000,0),('art-therapie','3 heures',4500,0),
      ('meditations-hebdomadaires','1 séance',1100,0)
    ) as v(slug,label,amt,ord)
    join public.offerings o on o.slug = v.slug
    where not exists (select 1 from public.offering_prices p where p.offering_id = o.id and p.label = v.label);

    -- Sessions d'exemple
    insert into public.sessions (offering_id, starts_at, ends_at, location, is_online, capacity, seats_taken, price_id, co_host, status, is_featured)
    select o.id, date_trunc('day', now()) + (v.d || ' days')::interval + (v.h || ' hours')::interval,
           date_trunc('day', now()) + (v.d || ' days')::interval + ((v.h + v.dur) || ' hours')::interval,
           'Place Abbé César Renard, 31, 7730 Bailleul', false, v.cap, v.taken,
           (select p.id from public.offering_prices p where p.offering_id = o.id order by p.sort_order offset v.pi limit 1),
           v.co, 'open', false
    from (values
      ('meditations-hebdomadaires',0,4,19,1,12,5,''),
      ('meditations-hebdomadaires',0,11,19,1,12,2,''),
      ('reiki-usui',0,20,9,8,8,5,''),
      ('pendule-radiesthesie',1,15,18,3,10,3,''),
      ('enfant-interieur',0,30,9,8,12,4,'Catherine Vandenbroucke')
    ) as v(slug,pi,d,h,dur,cap,taken,co)
    join public.offerings o on o.slug = v.slug;

    -- Créneaux de disponibilité
    insert into public.availability_slots (starts_at, ends_at, mode, is_booked)
    select date_trunc('day', now()) + (d || ' days')::interval + ((10 + (i % 3) * 2) || ' hours')::interval,
           date_trunc('day', now()) + (d || ' days')::interval + ((11 + (i % 3) * 2) || ' hours')::interval,
           'cabinet', false
    from (values (2,0),(3,1),(5,2),(6,3),(9,4)) as s(d,i);

    -- Articles
    insert into public.posts (title, slug, excerpt, body, cover_url, category, og_image_url, published_at, is_published)
    select v.title, v.slug, v.excerpt, v.body, v.cover, v.cat, '', now() - (v.ago || ' days')::interval, true
    from (values
      ('Reiki : à quoi sert le niveau 1 ?','reiki-niveau-1','Le premier degré de Reiki Usui permet de recevoir l''énergie et d''apprendre à se soigner soi-même et ses proches.',E'Le 1er degré de Reiki Usui est la porte d''entrée de la pratique. Il se déroule sur deux journées, au cabinet de Bailleul.\n\nPendant l''initiation, vous apprenez à poser les mains sur vous-même et sur vos proches, à reconnaître les sensations et à installer une pratique quotidienne.\n\nUn syllabus et un certificat vous sont remis. Vous pouvez ensuite poursuivre avec le 2e degré, à votre rythme.','https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=900&auto=format&q=70','reiki',10),
      ('Méditation : un rendez-vous hebdomadaire pour se recentrer','meditation-se-recentrer','Une heure par semaine pour poser ses valises, respirer et retrouver un peu de clarté.',E'La méditation guidée à thème est un moment simple : on s''installe, on respire, on se laisse guider.\n\nChaque séance est accompagnée d''un olfactif et d''un tirage d''oracle, pour repartir avec un mot ou une intention.\n\nLe carnet de fidélité vous offre la 11e séance.','https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=900&auto=format&q=70','meditation',3)
    ) as v(title,slug,excerpt,body,cover,cat,ago)
    where not exists (select 1 from public.posts p where p.slug = v.slug);

    -- E-books
    insert into public.ebooks (title, slug, description, cover_url, price_cents, is_published)
    select v.title, v.slug, v.descr, v.cover, v.price, true
    from (values
      ('Méditer au quotidien','mediter-au-quotidien','Un petit guide pour installer une pratique de méditation simple, quelques minutes par jour.','https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=900&auto=format&q=70',1200),
      ('Premiers pas en numérologie','premiers-pas-numerologie','Comprendre les bases de la numérologie de la Métamorphose et calculer son nombre de chemin de vie.','https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=900&auto=format&q=70',1500)
    ) as v(title,slug,descr,cover,price)
    where not exists (select 1 from public.ebooks e where e.slug = v.slug);

    -- Réseaux sociaux
    insert into public.social_links (network, url, sort_order, is_active)
    select 'Facebook', 'https://www.facebook.com/search/top?q=Etre%20dans%20la%20lumi%C3%A8re', 1, true
    where not exists (select 1 from public.social_links where network = 'Facebook');

    insert into public.app_settings (key, value) values ('demo_seeded', '"true"');
  end if;
end $$;

-- ===== Ajout du 2026-11-11 21:40 =====
-- Aucun changement de base de données pour cette mise à jour.
select 1;

-- ===== Ajout du 2026-11-11 21:43 =====
-- Aucun changement de base de données nécessaire.
select 1;

-- Socle Usin : gestion des administrateurs depuis l'app et téléchargement des données (RGPD).
drop policy if exists admins_write on public.app_admins;
create policy admins_write on public.app_admins for all using (public.is_admin()) with check (public.is_admin());
create or replace function public.export_my_data() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'profil', (select to_jsonb(p) from public.profiles p where p.id = auth.uid()),
    'rendez_vous', coalesce((select jsonb_agg(to_jsonb(a)) from public.appointments a where a.user_id = auth.uid()), '[]'::jsonb),
    'inscriptions', coalesce((select jsonb_agg(to_jsonb(r)) from public.registrations r where r.user_id = auth.uid()), '[]'::jsonb),
    'commandes', coalesce((select jsonb_agg(to_jsonb(o)) from public.orders o where o.user_id = auth.uid()), '[]'::jsonb),
    'carnet_meditation', (select to_jsonb(m) from public.meditation_cards m where m.user_id = auth.uid())
  );
$$;
revoke all on function public.export_my_data() from public;
grant execute on function public.export_my_data() to authenticated;

-- ---------------------------------------------------------------- 2026-11 : deposits per offer, places, no more meditation card
-- One time: the former single deposit (formations) becomes the deposit of each formation.
do $$ begin
  if not exists (select 1 from public.app_settings where key = 'deposit.migrated') then
    if (select value #>> '{}' from public.app_settings where key = 'deposit.enabled') = 'true' then
      update public.offerings set deposit_cents = (public.setting_num('deposit.amount', 50) * 100)::int where kind = 'formation' and deposit_cents is null;
    end if;
    insert into public.app_settings (key, value) values ('deposit.migrated', '"true"'::jsonb) on conflict (key) do nothing;
  end if;
end $$;

-- Places (cabinet, salle, extérieur…), chosen for each session of the agenda.
create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null, address text not null default '',
  is_active boolean default true, sort_order int default 0, created_at timestamptz default now()
);
alter table public.places enable row level security;
drop policy if exists places_read on public.places;
create policy places_read on public.places for select using (is_active or public.is_admin());
drop policy if exists places_admin on public.places;
create policy places_admin on public.places for all using (public.is_admin()) with check (public.is_admin());
-- The meditation card is over: texts that mentioned it.
update public.offerings set body = replace(body, ' La 11e séance est offerte grâce au carnet de fidélité.', '') where body like '%carnet de fidélité%';
update public.posts set body = replace(body, E'\n\nLe carnet de fidélité vous offre la 11e séance.', '') where body like '%carnet de fidélité%';
update public.app_settings set value = to_jsonb('Chaque semaine, une méditation guidée à thème d''une heure (11 €), avec olfactif et oracle.'::text)
where key = 'faq.6.a' and value #>> '{}' like '%carnet de fidélité%';
