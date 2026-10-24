import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function db() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

function check<T>(r: { data: T; error: { message: string } | null }) {
  if (r.error) throw new Error(r.error.message);
  return r.data;
}

export const getState = createServerFn({ method: "GET" }).handler(async () => {
  const s = db();
  const [c, spots, bookings, donations, nonprofits, profiles] = await Promise.all([
    s.from("demo_clock").select("*").eq("id", 1).single(),
    s.from("spots").select("*").order("spot_number"),
    s.from("bookings").select("*").order("created_at", { ascending: false }),
    s.from("donations").select("*").order("created_at", { ascending: false }),
    s.from("nonprofits").select("*").order("name"),
    s.from("profiles").select("*"),
  ]);
  return {
    simTime: check(c).sim_time,
    spots: check(spots),
    bookings: check(bookings),
    donations: check(donations),
    nonprofits: check(nonprofits),
    profiles: check(profiles),
  };
});

export const setClock = createServerFn({ method: "POST" })
  .inputValidator((d: { time: string }) => d)
  .handler(async ({ data }) => {
    check(await db().rpc("set_clock", { _time: data.time }));
    return true;
  });

export const releaseBooking = createServerFn({ method: "POST" })
  .inputValidator((d: { bookingId: string; userId: string }) => d)
  .handler(async ({ data }) => {
    check(await db().rpc("release_booking", { _booking_id: data.bookingId, _user_id: data.userId }));
    return true;
  });

export const bookSpot = createServerFn({ method: "POST" })
  .inputValidator((d: { spotId: string; userId: string; hours: number }) => d)
  .handler(async ({ data }) => {
    check(await db().rpc("book_spot", { _spot_id: data.spotId, _user_id: data.userId, _hours: data.hours }));
    return true;
  });

export const chooseDonation = createServerFn({ method: "POST" })
  .inputValidator((d: { donationId: string; nonprofitId: string }) => d)
  .handler(async ({ data }) => {
    check(
      await db().from("donations").update({ nonprofit_id: data.nonprofitId, status: "donated" }).eq("id", data.donationId).eq("status", "pending"),
    );
    return true;
  });

export const saveProfile = createServerFn({ method: "POST" })
  .inputValidator((d: { userId: string; interests: string[]; interestText: string; priority: string | null }) => d)
  .handler(async ({ data }) => {
    check(
      await db()
        .from("profiles")
        .update({ interests: data.interests, interest_text: data.interestText, priority_nonprofit_id: data.priority })
        .eq("id", data.userId),
    );
    return true;
  });
