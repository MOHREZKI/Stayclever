-- Profiles table for authenticated users
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null,
  email text not null unique,
  role text not null check (role in ('owner', 'manager', 'staff')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy "Public read own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Authenticated read profiles" on public.profiles
  for select using (auth.role() = 'authenticated');

create policy "Users insert own profile" on public.profiles
  for insert
  with check (auth.uid() = id);

create policy "Users update own profile" on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Owner manage profiles" on public.profiles
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'owner'
    )
  );

-- Activities per user
create table if not exists public.user_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  created_at timestamptz default now()
);

alter table public.user_activities enable row level security;

create policy "Users read own activities" on public.user_activities
  for select using (auth.uid() = user_id);

create policy "Insert own activities" on public.user_activities
  for insert with check (auth.uid() = user_id);

create policy "Owner read activities" on public.user_activities
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'owner'
    )
  );

-- Room types
create table if not exists public.room_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

alter table public.room_types enable row level security;

create policy "All roles read room_types" on public.room_types
  for select using (true);

create policy "Owner manage room_types" on public.room_types
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'owner'
    )
  );

-- Rooms
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  type_id uuid references public.room_types(id),
  price numeric not null,
  status text not null check (status in ('available', 'occupied', 'cleaning', 'reserved')),
  reservation_date date,
  check_out_date date,
  created_at timestamptz default now()
);

alter table public.rooms enable row level security;

create policy "All roles read rooms" on public.rooms for select using (true);

create policy "Manager or owner manage rooms" on public.rooms
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('owner', 'manager')
    )
  );

-- Guests
create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text,
  check_in date not null,
  check_out date not null,
  room_id uuid references public.rooms(id),
  nights integer not null,
  price_per_night numeric not null,
  total_price numeric not null,
  payment_method text,
  payment_status text check (payment_status in ('paid', 'unpaid')),
  booking_status text check (booking_status in ('reservation', 'checked-in', 'checked-out')),
  received_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

alter table public.guests enable row level security;

create policy "All roles read guests" on public.guests for select using (true);

create policy "Manager or owner manage guests" on public.guests
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('owner', 'manager')
    )
  );


-- Restaurant menu items
create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('breakfast', 'menu')),
  price numeric not null,
  description text,
  created_at timestamptz default now()
);

alter table public.menu_items enable row level security;

create policy "All roles read menu" on public.menu_items for select using (true);

create policy "Manager or owner manage menu" on public.menu_items
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('owner', 'manager')
    )
  );

-- Facilities
create table if not exists public.facilities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  icon text,
  created_at timestamptz default now()
);

alter table public.facilities enable row level security;

create policy "All roles read facilities" on public.facilities for select using (true);

create policy "Owner manage facilities" on public.facilities
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'owner'
    )
  );

-- Financial transactions
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('income', 'expense')),
  amount numeric not null,
  description text not null,
  date date not null,
  category text not null,
  created_at timestamptz default now()
);

alter table public.transactions enable row level security;

create policy "All roles read transactions" on public.transactions for select using (true);

create policy "Owner manage transactions" on public.transactions
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'owner'
    )
  );

create or replace view public.report_daily_cashflow as
with latest as (
  select coalesce(max(date), timezone('Asia/Jakarta', now())::date) as max_date
  from public.transactions
)
select
  d::date as date,
  coalesce((select sum(amount) from public.transactions where type = 'income' and date = d), 0) as income,
  coalesce((select sum(amount) from public.transactions where type = 'expense' and date = d), 0) as expense
from latest,
  generate_series((max_date - interval '6 day')::date, max_date, interval '1 day') as d;

-- Dashboard metrics (materialized view example)
create or replace view public.dashboard_metrics as
select
  coalesce((select count(*) from public.guests where booking_status in ('reservation', 'checked-in')), 0) as total_guests,
  coalesce((select count(*) from public.rooms where status = 'available'), 0) as available_rooms,
  coalesce((
    select sum(amount)
    from public.transactions
    where type = 'income'
      and date = timezone('Asia/Jakarta', now())::date
  ), 0) as revenue_today,
  coalesce((select round((count(*) filter (where status = 'occupied')::numeric / nullif(count(*), 0)) * 100, 2) from public.rooms), 0) as occupancy_rate;

create or replace view public.report_monthly_summary as
select
  to_char(date_trunc('month', coalesce(i.date, e.date)), 'YYYY-MM') as period,
  coalesce(sum(i.amount), 0) as revenue,
  coalesce(sum(e.amount), 0) as expenses,
  coalesce(sum(i.amount), 0) - coalesce(sum(e.amount), 0) as profit
from (
  select date, sum(amount) as amount
  from public.transactions
  where type = 'income'
  group by date
) i
full outer join (
  select date, sum(amount) as amount
  from public.transactions
  where type = 'expense'
  group by date
) e on date_trunc('month', i.date) = date_trunc('month', e.date)
group by 1;

alter view public.dashboard_metrics set (security_invoker = true);
alter view public.report_monthly_summary set (security_invoker = true);
alter view public.report_daily_cashflow set (security_invoker = true);

grant select on public.dashboard_metrics to authenticated, anon;
grant select on public.report_monthly_summary to authenticated, anon;
grant select on public.report_daily_cashflow to authenticated, anon;
