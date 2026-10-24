import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { getState } from "@/lib/api.functions";
import type { Database } from "@/integrations/supabase/types";

type T = Database["public"]["Tables"];
export type Spot = T["spots"]["Row"];
export type Booking = T["bookings"]["Row"];
export type Donation = T["donations"]["Row"];
export type Nonprofit = T["nonprofits"]["Row"];
export type Profile = T["profiles"]["Row"];

export const DRIVERS = [
  { id: "11111111-1111-1111-1111-111111111111", label: "Driver 1" },
  { id: "22222222-2222-2222-2222-222222222222", label: "Driver 2" },
];

type Ctx = {
  userId: string;
  setUserId: (id: string) => void;
  simTime: Date | null;
  spots: Spot[];
  bookings: Booking[];
  donations: Donation[];
  nonprofits: Nonprofit[];
  profiles: Profile[];
  loading: boolean;
  refresh: () => Promise<void>;
};

const DemoCtx = createContext<Ctx | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [userId, setUserIdState] = useState<string>(DRIVERS[0]!.id);
  const [simTime, setSimTime] = useState<Date | null>(null);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [nonprofits, setNonprofits] = useState<Nonprofit[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("pif-role");
    if (saved && DRIVERS.some((d) => d.id === saved)) setUserIdState(saved);
  }, []);

  const setUserId = (id: string) => {
    localStorage.setItem("pif-role", id);
    setUserIdState(id);
  };

  const refresh = useCallback(async () => {
    try {
      const st = await getState();
      setSimTime(new Date(st.simTime));
      setSpots(st.spots);
      setBookings(st.bookings);
      setDonations(st.donations);
      setNonprofits(st.nonprofits);
      setProfiles(st.profiles);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  // Poll so other devices' changes show up within ~2 seconds.
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 2000);
    return () => clearInterval(t);
  }, [refresh]);

  return (
    <DemoCtx.Provider
      value={{ userId, setUserId, simTime, spots, bookings, donations, nonprofits, profiles, loading, refresh }}
    >
      {children}
    </DemoCtx.Provider>
  );
}

export function useDemo() {
  const c = useContext(DemoCtx);
  if (!c) throw new Error("useDemo outside DemoProvider");
  return c;
}

export const fmtTime = (d: Date | string) =>
  new Date(d).toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Detroit" });
export const money = (n: number) => `$${Number(n).toFixed(2)}`;

/** Build a Detroit-local timestamp for the sim day at a given hour. */
export function atHour(base: Date, hour: number) {
  const day = base.toLocaleDateString("en-CA", { timeZone: "America/Detroit" });
  const offset = base.toLocaleString("en-US", { timeZone: "America/Detroit", timeZoneName: "shortOffset" }).split("GMT")[1] || "-4";
  const sign = offset.startsWith("-") ? "-" : "+";
  const hh = String(Math.abs(parseInt(offset))).padStart(2, "0");
  return `${day}T${String(hour).padStart(2, "0")}:00:00${sign}${hh}:00`;
}
