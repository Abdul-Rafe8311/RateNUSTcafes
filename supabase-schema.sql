-- ─────────────────────────────────────────────────────────────────
--  Concordia Eats — Full Supabase Schema
--  Paste into: Supabase Dashboard → SQL Editor → Run
-- ─────────────────────────────────────────────────────────────────

-- 1. Profiles
create table if not exists public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  name       text not null,
  department text not null,
  created_at timestamptz default now()
);

-- 2. Cafe reviews (one per user per cafe)
create table if not exists public.reviews (
  id         uuid primary key default gen_random_uuid(),
  cafe_id    text not null check (cafe_id in ('1','2','3')),
  user_id    uuid not null references auth.users on delete cascade,
  department text not null,
  rating     integer not null check (rating >= 1 and rating <= 5),
  comment    text default '',
  created_at timestamptz default now(),
  unique(cafe_id, user_id)
);

-- 3. Per-item ratings (upsert — user can update their own rating)
create table if not exists public.item_reviews (
  id         uuid primary key default gen_random_uuid(),
  cafe_id    text not null check (cafe_id in ('1','2','3')),
  item_id    text not null,
  user_id    uuid not null references auth.users on delete cascade,
  department text not null,
  rating     integer not null check (rating >= 1 and rating <= 5),
  created_at timestamptz default now(),
  unique(item_id, user_id)
);

-- 4. RLS
alter table public.profiles    enable row level security;
alter table public.reviews     enable row level security;
alter table public.item_reviews enable row level security;

-- Profiles policies
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- Reviews policies
create policy "reviews_select" on public.reviews for select using (true);
create policy "reviews_insert" on public.reviews for insert with check (auth.uid() = user_id);

-- Item reviews policies
create policy "item_reviews_select" on public.item_reviews for select using (true);
create policy "item_reviews_insert" on public.item_reviews for insert with check (auth.uid() = user_id);
create policy "item_reviews_update" on public.item_reviews for update using (auth.uid() = user_id);

-- 5. Trigger: auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, department)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'Student'),
    coalesce(new.raw_user_meta_data->>'department', 'NUST')
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
