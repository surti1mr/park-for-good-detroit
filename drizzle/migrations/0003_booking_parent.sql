ALTER TABLE public.bookings ADD COLUMN parent_booking_id uuid REFERENCES public.bookings(id);
create or replace function public.book_spot(_spot_id uuid, _user_id uuid, _hours int) returns uuid language plpgsql security definer set search_path=public as $$
declare s spots; now_t timestamptz; rel bookings; new_id uuid; hrs numeric; begin
  select sim_time into now_t from demo_clock where id=1;
  select * into s from spots where id=_spot_id for update;
  if s.status='booked' then raise exception 'Someone just booked this spot.'; end if;
  if exists (select 1 from bookings where user_id=_user_id and status='active' and end_time > now_t) then raise exception 'You already have an active parking session'; end if;
  if s.status='released' then
    select * into rel from bookings where spot_id=_spot_id and status='released' and end_time > now_t order by end_time desc limit 1;
    if rel.id is null then raise exception 'This spot is no longer shared.'; end if;
    if rel.user_id=_user_id then raise exception 'You can''t book a spot you released.'; end if;
    hrs := ceil(extract(epoch from (rel.end_time - now_t))/3600);
    insert into bookings (spot_id,user_id,start_time,end_time,amount,status,parent_booking_id) values (_spot_id,_user_id,now_t,rel.end_time,hrs*1.00,'active',rel.id) returning id into new_id;
    insert into donations (booking_id,directed_by_user_id,amount,nonprofit_id,status,created_at) values (new_id, rel.user_id, hrs*1.00, null, 'pending', now_t);
    update bookings set status='completed' where id=rel.id;
  else
    if _hours < 1 or _hours > 12 then raise exception 'Choose 1-12 hours'; end if;
    insert into bookings (spot_id,user_id,start_time,end_time,amount) values (_spot_id,_user_id,now_t,now_t + make_interval(hours=>_hours),_hours*1.00) returning id into new_id;
  end if;
  update spots set status='booked' where id=_spot_id;
  return new_id;
end $$;