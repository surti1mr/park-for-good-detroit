create table public.nonprofits (id uuid primary key default gen_random_uuid(), name text not null, description text not null, tags text[] not null default '{}');
create table public.profiles (id uuid primary key default gen_random_uuid(), name text not null, email text, interests text[] not null default '{}', interest_text text, priority_nonprofit_id uuid references public.nonprofits(id));
create table public.spots (id uuid primary key default gen_random_uuid(), lot_name text not null default 'Midtown Lot A', spot_number int not null, status text not null default 'empty' check (status in ('empty','booked','released')));
create table public.bookings (id uuid primary key default gen_random_uuid(), spot_id uuid not null references public.spots(id), user_id uuid not null references public.profiles(id), start_time timestamptz not null, end_time timestamptz not null, amount numeric(10,2) not null, status text not null default 'active' check (status in ('active','released','completed')), created_at timestamptz not null default now());
create table public.donations (id uuid primary key default gen_random_uuid(), booking_id uuid not null references public.bookings(id), directed_by_user_id uuid not null references public.profiles(id), amount numeric(10,2) not null, nonprofit_id uuid references public.nonprofits(id), status text not null default 'pending' check (status in ('pending','donated','auto_donated')), created_at timestamptz not null);
create table public.demo_clock (id int primary key default 1, sim_time timestamptz not null);

do $$ declare t text; begin foreach t in array array['nonprofits','profiles','spots','bookings','donations','demo_clock'] loop
  execute format('grant select, insert, update, delete on public.%I to anon, authenticated', t);
  execute format('grant all on public.%I to service_role', t);
  execute format('alter table public.%I enable row level security', t);
  execute format('create policy "demo read" on public.%I for select to anon, authenticated using (true)', t);
end loop; end $$;
create policy "demo update profile" on public.profiles for update to anon, authenticated using (true) with check (true);
create policy "demo update donation" on public.donations for update to anon, authenticated using (status='pending') with check (true);

insert into public.nonprofits (name, description, tags) values
('Gleaners Community Food Bank','Distributes nutritious food to hungry families across Southeast Michigan.','{food}'),
('Forgotten Harvest','Rescues surplus food and delivers it to pantries and shelters in metro Detroit.','{food}'),
('Capuchin Soup Kitchen','Provides meals, shelter support, and hope to Detroiters in need.','{food,housing}'),
('Covenant House Michigan','Offers shelter and support for youth facing homelessness.','{youth,housing}'),
('Alternatives For Girls','Helps homeless and high-risk girls and young women stay safe and thrive.','{youth,housing}'),
('The Greening of Detroit','Plants trees and builds green spaces to create a healthier Detroit.','{environment}'),
('Detroit Riverfront Conservancy','Develops and maintains the riverfront as a vibrant public space for all.','{environment,community}'),
('Michigan Humane','Rescues, heals, and rehomes animals in need across Michigan.','{animals}'),
('Covenant Community Care','Delivers affordable, faith-based health care to underserved Detroiters.','{health}'),
('Detroit Area Agency on Aging','Helps older adults live independently with dignity and good health.','{seniors,health}');

insert into public.demo_clock (id, sim_time) values (1, (current_date + time '09:00') at time zone 'America/Detroit');

insert into public.profiles (id, name, email, interests, priority_nonprofit_id) values
('11111111-1111-1111-1111-111111111111','Driver 1','driver1@demo.app','{food}',(select id from public.nonprofits where name='Gleaners Community Food Bank')),
('22222222-2222-2222-2222-222222222222','Driver 2','driver2@demo.app','{environment}',(select id from public.nonprofits where name='The Greening of Detroit')),
('33333333-3333-3333-3333-333333333333','Other Driver','other@demo.app','{}',null);

insert into public.spots (spot_number, status) select n, case when n in (3,7,9,12,14) then 'booked' else 'empty' end from generate_series(1,15) n;

insert into public.bookings (spot_id, user_id, start_time, end_time, amount)
select s.id, case when s.spot_number=14 then '11111111-1111-1111-1111-111111111111'::uuid else '33333333-3333-3333-3333-333333333333'::uuid end,
 c.sim_time, c.sim_time + interval '12 hours', 12.00
from public.spots s, public.demo_clock c where s.spot_number in (3,7,9,12,14);

-- RPCs
create or replace function public.sync_state() returns void language plpgsql security definer set search_path=public as $$
declare now_t timestamptz; begin
  select sim_time into now_t from demo_clock where id=1;
  update spots set status='empty' where id in (select spot_id from bookings where status in ('active','released') and end_time <= now_t)
    and not exists (select 1 from bookings b where b.spot_id=spots.id and b.status='active' and b.end_time > now_t);
  update bookings set status='completed' where status='active' and end_time <= now_t;
  update bookings set status='completed' where status='released' and end_time <= now_t;
  update donations d set status='auto_donated', nonprofit_id=p.priority_nonprofit_id from profiles p
    where d.status='pending' and d.directed_by_user_id=p.id and p.priority_nonprofit_id is not null and d.created_at + interval '7 days' <= now_t;
end $$;

create or replace function public.set_clock(_time timestamptz) returns void language plpgsql security definer set search_path=public as $$
begin update demo_clock set sim_time=_time where id=1; perform sync_state(); end $$;

create or replace function public.release_booking(_booking_id uuid, _user_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare b bookings; now_t timestamptz; begin
  select sim_time into now_t from demo_clock where id=1;
  select * into b from bookings where id=_booking_id and user_id=_user_id and status='active';
  if b.id is null then raise exception 'No active booking'; end if;
  if b.end_time <= now_t + interval '1 hour' then raise exception 'Less than 1 hour left'; end if;
  update bookings set status='released' where id=b.id;
  update spots set status='released' where id=b.spot_id;
end $$;

create or replace function public.book_spot(_spot_id uuid, _user_id uuid, _hours int) returns uuid language plpgsql security definer set search_path=public as $$
declare s spots; now_t timestamptz; rel bookings; new_id uuid; hrs numeric; begin
  select sim_time into now_t from demo_clock where id=1;
  select * into s from spots where id=_spot_id for update;
  if s.status='booked' then raise exception 'Spot already booked'; end if;
  if exists (select 1 from bookings where user_id=_user_id and status='active' and end_time > now_t) then raise exception 'You already have an active booking'; end if;
  if s.status='released' then
    select * into rel from bookings where spot_id=_spot_id and status='released' and end_time > now_t order by end_time desc limit 1;
    if rel.user_id=_user_id then raise exception 'You released this spot'; end if;
    hrs := ceil(extract(epoch from (rel.end_time - now_t))/3600);
    insert into bookings (spot_id,user_id,start_time,end_time,amount) values (_spot_id,_user_id,now_t,rel.end_time,hrs*1.00) returning id into new_id;
    insert into donations (booking_id,directed_by_user_id,amount,created_at) values (new_id, rel.user_id, hrs*1.00, now_t);
    update bookings set status='completed' where id=rel.id;
  else
    if _hours < 1 or _hours > 12 then raise exception 'Choose 1-12 hours'; end if;
    insert into bookings (spot_id,user_id,start_time,end_time,amount) values (_spot_id,_user_id,now_t,now_t + make_interval(hours=>_hours),_hours*1.00) returning id into new_id;
  end if;
  update spots set status='booked' where id=_spot_id;
  return new_id;
end $$;

grant execute on function public.set_clock(timestamptz), public.release_booking(uuid,uuid), public.book_spot(uuid,uuid,int), public.sync_state() to anon, authenticated;

alter publication supabase_realtime add table public.spots, public.bookings, public.donations, public.demo_clock, public.profiles;