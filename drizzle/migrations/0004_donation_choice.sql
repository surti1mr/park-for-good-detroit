ALTER TABLE public.donations ADD COLUMN donated_at timestamptz;
create or replace function public.sync_state() returns void language plpgsql security definer set search_path=public as $$
declare now_t timestamptz; begin
  select sim_time into now_t from demo_clock where id=1;
  update spots set status='empty' where id in (select spot_id from bookings where status in ('active','released') and end_time <= now_t)
    and not exists (select 1 from bookings b where b.spot_id=spots.id and b.status='active' and b.end_time > now_t);
  update bookings set status='completed' where status='active' and end_time <= now_t;
  update bookings set status='completed' where status='released' and end_time <= now_t;
  update donations d set status='auto_donated', nonprofit_id=p.priority_nonprofit_id, donated_at=now_t
    from profiles p, bookings b
    where d.status='pending' and d.directed_by_user_id=p.id and b.id=d.booking_id
      and p.priority_nonprofit_id is not null and now_t >= b.end_time + interval '7 days';
end $$;
create or replace function public.choose_donation(_donation_id uuid, _user_id uuid, _nonprofit_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare now_t timestamptz; d donations; e timestamptz; begin
  select sim_time into now_t from demo_clock where id=1;
  select * into d from donations where id=_donation_id and directed_by_user_id=_user_id for update;
  if d.id is null then raise exception 'Donation not found'; end if;
  if d.status <> 'pending' then raise exception 'This donation was already sent'; end if;
  select end_time into e from bookings where id=d.booking_id;
  if now_t < e then raise exception 'You can choose after the parking time ends'; end if;
  if not exists (select 1 from nonprofits where id=_nonprofit_id) then raise exception 'Unknown nonprofit'; end if;
  update donations set nonprofit_id=_nonprofit_id, status='donated', donated_at=now_t where id=_donation_id;
end $$;
grant execute on function public.choose_donation(uuid,uuid,uuid) to anon, authenticated;