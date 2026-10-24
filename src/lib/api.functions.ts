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
    simTime: check(c)!.sim_time,
    spots: check(spots) ?? [],
    bookings: check(bookings) ?? [],
    donations: check(donations) ?? [],
    nonprofits: check(nonprofits) ?? [],
    profiles: check(profiles) ?? [],
  };
});

export const setClock = createServerFn({ method: "POST" })
  .inputValidator((d: { time: string }) => d)
  .handler(async ({ data }) => {
    check(await db().rpc("set_clock", { _time: data.time }));
    return true;
  });

export const resetDemo = createServerFn({ method: "POST" }).handler(async () => {
  check(await db().rpc("reset_demo"));
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
  .inputValidator((d: { donationId: string; userId: string; nonprofitId: string }) => d)
  .handler(async ({ data }) => {
    check(await db().rpc("choose_donation", { _donation_id: data.donationId, _user_id: data.userId, _nonprofit_id: data.nonprofitId }));
    return true;
  });

export const rankForUser = createServerFn({ method: "POST" })
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ data }) => {
    const s = db();
    const p = check(await s.from("profiles").select("interests, interest_text").eq("id", data.userId).single());
    const nps = check(await s.from("nonprofits").select("id, name, description, tags")) ?? [];
    const { rankNonprofits, completeRanking } = await import("./match.server");
    try {
      if (!p) throw new Error("Profile not found");
      return { matches: await rankNonprofits(p.interests, p.interest_text ?? "", nps), fallback: false };
    } catch (e) {
      console.error("ranking failed", e);
      return { matches: completeRanking([], nps), fallback: true };
    }
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

export const signUp = createServerFn({ method: "POST" })
  .inputValidator((d: { name: string; email: string }) => {
    const name = String(d.name ?? "").trim().slice(0, 80);
    const email = String(d.email ?? "").trim().toLowerCase().slice(0, 200);
    if (!name) throw new Error("Please enter your name");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Please enter a valid email");
    return { name, email };
  })
  .handler(async ({ data }) => {
    const s = db();
    const existing = check(await s.from("profiles").select("id").ilike("email", data.email).maybeSingle());
    if (existing) return { id: existing.id, existing: true };
    const row = check(await s.from("profiles").insert({ name: data.name, email: data.email }).select("id").single());
    return { id: row!.id, existing: false };
  });

export const saveInterests = createServerFn({ method: "POST" })
  .inputValidator((d: { userId: string; interests: string[]; interestText: string }) => ({
    userId: d.userId,
    interests: (d.interests ?? []).map(String).slice(0, 10),
    interestText: String(d.interestText ?? "").slice(0, 500),
  }))
  .handler(async ({ data }) => {
    check(await db().from("profiles").update({ interests: data.interests, interest_text: data.interestText }).eq("id", data.userId));
    return true;
  });

export const setPriority = createServerFn({ method: "POST" })
  .inputValidator((d: { userId: string; nonprofitId: string }) => d)
  .handler(async ({ data }) => {
    check(await db().from("profiles").update({ priority_nonprofit_id: data.nonprofitId }).eq("id", data.userId));
    return true;
  });

export const findMatches = createServerFn({ method: "POST" })
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ data }) => {
    const { matchNonprofits } = await import("./match.server");
    const s = db();
    const profile = check(await s.from("profiles").select("interests, interest_text").eq("id", data.userId).single());
    const nonprofits = check(await s.from("nonprofits").select("id, name, description, tags")) ?? [];
    return matchNonprofits(profile!.interests, profile!.interest_text ?? "", nonprofits);
  });

export const getCauseSummary = createServerFn({ method: "POST" })
  .inputValidator((d: { spotId: string; amount: number }) => d)
  .handler(async ({ data }) => {
    const s = db();
    const rel = check(
      await s.from("bookings").select("user_id").eq("spot_id", data.spotId).eq("status", "released").order("end_time", { ascending: false }).limit(1).maybeSingle(),
    );
    const fallback = `Your $${data.amount} will likely support a Detroit nonprofit chosen by the driver who shared this spot.`;
    if (!rel) return { text: fallback };
    const prof = check(await s.from("profiles").select("priority_nonprofit_id").eq("id", rel.user_id).single());
    if (!prof?.priority_nonprofit_id) return { text: fallback };
    const np = check(await s.from("nonprofits").select("name, description, tags").eq("id", prof.priority_nonprofit_id).single());
    try {
      const { summarizeCause } = await import("./match.server");
      if (!np) return { text: fallback, fallback: true };
      return { text: (await summarizeCause(np, data.amount)) || fallback, fallback: false };
    } catch (e) {
      console.error("cause summary failed", e);
      return { text: fallback, fallback: true };
    }
  });
