-- ═══════════════════════════════════════════════════════════════════
--  Concordia Eats — AI Chatbot Database Setup
--  Paste into: Supabase Dashboard → SQL Editor → Run
--
--  Creates: cafes, menu_items, chat_logs
--  Safe to re-run: every statement is idempotent (upserts, not duplicates)
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Tables ──────────────────────────────────────────────────────

-- Cafes: the 4 Concordia-campus cafes at NUST H-12
create table if not exists public.cafes (
  id          integer primary key,          -- 1–4, matches the cafe ids used across the app
  name        text    not null,
  location    text    not null,
  rating      numeric(2,1) not null default 0 check (rating >= 0 and rating <= 5),
  description text    default '',
  created_at  timestamptz not null default now()
);

-- Menu items: what the chatbot answers price questions from
create table if not exists public.menu_items (
  id           bigint generated always as identity primary key,
  cafe_id      integer not null references public.cafes(id) on delete cascade,
  item_name    text    not null,
  category     text    not null,            -- biryani | main | beverages | snacks | sandwiches | desserts
  price        numeric(8,2) not null check (price >= 0),
  description  text    default '',
  is_available boolean not null default true,
  created_at   timestamptz not null default now(),
  -- lets the seed below re-run as an upsert instead of duplicating rows
  unique (cafe_id, item_name)
);

-- Chat logs: optional analytics, written only when the API route is given a userId
create table if not exists public.chat_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    text,                          -- nullable: anonymous chats are not attributed
  message    text not null,
  response   text not null,
  created_at timestamptz not null default now()
);

-- ── 2. Indexes ─────────────────────────────────────────────────────
create index if not exists menu_items_cafe_id_idx   on public.menu_items (cafe_id);
create index if not exists menu_items_category_idx  on public.menu_items (category);
create index if not exists menu_items_item_name_idx on public.menu_items (item_name);
-- case-insensitive item lookups ("BIRYANI" → "Chicken Biryani")
create index if not exists menu_items_item_name_lower_idx on public.menu_items (lower(item_name));
create index if not exists chat_logs_user_id_idx    on public.chat_logs (user_id);
create index if not exists chat_logs_created_at_idx on public.chat_logs (created_at desc);

-- ── 3. Row Level Security ──────────────────────────────────────────
alter table public.cafes      enable row level security;
alter table public.menu_items enable row level security;
alter table public.chat_logs  enable row level security;

-- Cafes + menus are public read-only data (anon key can select, nobody can write)
drop policy if exists "cafes_public_read" on public.cafes;
create policy "cafes_public_read" on public.cafes
  for select using (true);

drop policy if exists "menu_items_public_read" on public.menu_items;
create policy "menu_items_public_read" on public.menu_items
  for select using (true);

-- Chat logs: NO public select policy on purpose — conversations stay private.
-- The API route writes them with the service role key, which bypasses RLS.
-- A signed-in user may read back their own history (used by nothing yet, but safe).
drop policy if exists "chat_logs_own_read" on public.chat_logs;
create policy "chat_logs_own_read" on public.chat_logs
  for select using (auth.uid()::text = user_id);

-- ── 4. Seed: the 4 cafes ───────────────────────────────────────────
insert into public.cafes (id, name, location, rating, description) values
  (1, 'Concordia 1', 'Near NBS Ground', 4.2,
     'Quick bites, great chai, and a chill vibe between classes. The go-to spot when you have 10 minutes between lectures.'),
  (2, 'Concordia 2', 'Near SEECS', 4.5,
     'Fuel for late-night lab sessions. The favorite of CS and EE students — always packed after 8 pm, somehow still manages fast service.'),
  (3, 'Concordia 3', 'In front of NUST Main Office', 3.9,
     'The most central cafe on campus. Always buzzing with students from every department. Great for a quick bite or a long hangout.'),
  (4, 'Ratro Cafe', 'Near Liaquat Hostel', 4.3,
     'Hostel-side favourite for BBQ, jumbo rolls and pizza. Big portions, late hours, and the shakes menu everyone ends up ordering from.')
on conflict (id) do update set
  name        = excluded.name,
  location    = excluded.location,
  rating      = excluded.rating,
  description = excluded.description;

-- ── 5. Seed: menu items (prices in PKR) ────────────────────────────
insert into public.menu_items (cafe_id, item_name, category, price, description) values
  -- Concordia 1 — Near NBS Ground
  (1, 'Chicken Biryani',        'biryani',    280, 'House biryani, served with raita'),
  (1, 'Chicken Pulao',          'main',       280, 'Lighter alternative to the biryani'),
  (1, 'Chicken Haleem',         'main',       200, 'Slow-cooked, best in winter'),
  (1, 'Chicken Cheese Sandwich','sandwiches', 150, 'Grilled, with melted cheese'),
  (1, 'Aloo Samosa',            'snacks',      50, 'Cheapest snack on campus'),
  (1, 'Chicken Butter Patties', 'snacks',     120, 'Flaky pastry, chicken filling'),
  (1, 'Cardamom Tea',           'beverages',  110, 'The chai C1 is known for'),
  (1, 'Brownie',                'desserts',   200, 'Dense chocolate brownie'),

  -- Concordia 2 — Near SEECS
  (2, 'Chicken Roll Paratha Spicy',      'main',       260, 'Spicy paratha roll, SEECS favourite'),
  (2, 'Afghani Burger Single',           'main',       250, 'Afghani-style burger with fries inside'),
  (2, 'Chicken Mayo Sandwich',           'sandwiches', 200, 'Cold sandwich, quick grab'),
  (2, 'Chicken Cheese Croissant Sandwich','sandwiches',250, 'Croissant base, chicken and cheese'),
  (2, 'Small Fries',                     'snacks',     130, 'Regular salted fries'),
  (2, 'Chicken Patties',                 'snacks',     150, 'Baked fresh through the day'),
  (2, 'Green Tea',                       'beverages',   50, 'Cheapest drink at C2'),
  (2, 'Chocolate Brownie',               'desserts',   250, 'Served warm on request'),

  -- Concordia 3 — In front of NUST Main Office
  (3, 'Chicken Biryani',      'biryani',    280, 'The most ordered plate at C3'),
  (3, 'Chicken Qorma',        'main',       280, 'Served with naan or rice'),
  (3, 'Chicken Chow Mein',    'main',       300, 'Large portion, good for sharing'),
  (3, 'Egg Fried Rice',       'main',       240, 'Simple, fast, filling'),
  (3, 'Chicken Sandwich',     'sandwiches', 250, 'Toasted club-style sandwich'),
  (3, 'Masala Fries',         'snacks',     130, 'C3 speciality — heavily spiced'),
  (3, 'Cappuccino Medium',    'beverages',  200, 'Proper espresso machine coffee'),
  (3, 'Cone Ice Cream Medium','desserts',   150, 'Soft serve, three sizes available'),

  -- Ratro Cafe — Near Liaquat Hostel
  (4, 'Chicken Tikka Roll',      'main',       280, 'Grilled tikka in paratha'),
  (4, 'Chicken Roll Paratha',    'main',       270, 'The standard roll, cheapest of the lot'),
  (4, 'Chicken Shawarma',        'main',       250, 'Open till late for hostel students'),
  (4, 'Chicken Tikka Sandwich',  'sandwiches', 250, 'Tikka filling, toasted'),
  (4, 'Club Sandwich',           'sandwiches', 350, 'Three layers, comes with fries'),
  (4, 'Fries',                   'snacks',     160, 'Plain salted fries'),
  (4, 'Samosa Chaat (Single)',   'snacks',     110, 'Crushed samosa with chutney and dahi'),
  (4, 'Doodh Pati',              'beverages',   90, 'Full-milk chai, hostel staple'),
  (4, 'Dates Shake',             'beverages',  230, 'Most popular of the 11 shake flavours')
on conflict (cafe_id, item_name) do update set
  category    = excluded.category,
  price       = excluded.price,
  description = excluded.description;

-- ── 6. Verify ──────────────────────────────────────────────────────
-- Expect: 4 rows, with item counts 8, 8, 8, 9
select c.id, c.name, c.location, c.rating, count(m.id) as menu_items
from public.cafes c
left join public.menu_items m on m.cafe_id = c.id
group by c.id, c.name, c.location, c.rating
order by c.id;
