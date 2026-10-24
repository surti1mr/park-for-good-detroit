alter table public.bookings add column released_at timestamptz;
create or replace function public.release_booking(_booking_id uuid, _user_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare b bookings; now_t timestamptz; begin
  select sim_time into now_t from demo_clock where id=1;
  select * into b from bookings where id=_booking_id and user_id=_user_id and status='active';
  if b.id is null then raise exception 'No active booking'; end if;
  if not (now_t > b.start_time and now_t < b.end_time) then raise exception 'You can only release during your parking session'; end if;
  update bookings set status='released', released_at=now_t where id=b.id;
  update spots set status='released' where id=b.spot_id;
end $$;