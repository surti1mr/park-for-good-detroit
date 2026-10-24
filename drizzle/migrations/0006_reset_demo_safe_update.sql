CREATE OR REPLACE FUNCTION public.reset_demo() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE today_start timestamptz; BEGIN
 today_start := (date_trunc('day', now() AT TIME ZONE 'America/Detroit') + interval '9 hours') AT TIME ZONE 'America/Detroit';
 PERFORM id FROM demo_clock WHERE id=1 FOR UPDATE;
 PERFORM id FROM spots ORDER BY spot_number FOR UPDATE;
 DELETE FROM donations WHERE id IS NOT NULL;
 UPDATE bookings SET parent_booking_id=NULL WHERE is_demo_seed;
 DELETE FROM bookings WHERE is_demo_seed=false;
 UPDATE demo_clock SET sim_time=today_start WHERE id=1;
 UPDATE spots SET status=CASE WHEN spot_number IN (3,7,9,12,14) THEN 'booked' ELSE 'empty' END WHERE id IS NOT NULL;
 UPDATE bookings b SET user_id=CASE WHEN s.spot_number=14 THEN '11111111-1111-1111-1111-111111111111'::uuid ELSE '33333333-3333-3333-3333-333333333333'::uuid END, start_time=today_start,end_time=today_start+interval '12 hours',amount=12.00,status='active',released_at=NULL,created_at=today_start FROM spots s WHERE b.spot_id=s.id AND b.is_demo_seed;
 INSERT INTO bookings(spot_id,user_id,start_time,end_time,amount,status,is_demo_seed) SELECT s.id,CASE WHEN s.spot_number=14 THEN '11111111-1111-1111-1111-111111111111'::uuid ELSE '33333333-3333-3333-3333-333333333333'::uuid END,today_start,today_start+interval '12 hours',12.00,'active',true FROM spots s WHERE s.spot_number IN (3,7,9,12,14) AND NOT EXISTS(SELECT 1 FROM bookings b WHERE b.spot_id=s.id AND b.is_demo_seed);
END $$;
GRANT EXECUTE ON FUNCTION public.reset_demo() TO anon,authenticated,service_role;