import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SpotMap } from "@/components/SpotMap";
import { Button } from "@/components/ui/button";
import { fmtTime, money, useDemo, type Spot } from "@/lib/demo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Park — ParkItForward Detroit" },
      { name: "description", content: "Book a spot in Midtown Lot A, or release your spot early and send the rest to a Detroit nonprofit." },
      { property: "og:title", content: "ParkItForward Detroit" },
      { property: "og:description", content: "Leave early, give back. Released parking time funds Detroit nonprofits." },
    ],
  }),
  component: ParkPage,
});

function ParkPage() {
  const { userId, simTime, spots, bookings, refresh } = useDemo();
  const [sel, setSel] = useState<Spot | null>(null);
  const [hours, setHours] = useState(2);
  const [busy, setBusy] = useState(false);
  const now = simTime?.getTime() ?? 0;
  const active = bookings.find((b) => b.user_id === userId && b.status === "active" && new Date(b.end_time).getTime() > now);
  const activeSpot = spots.find((s) => s.id === active?.spot_id);

  const release = async () => {
    if (!active) return;
    setBusy(true);
    const { error } = await supabase.rpc("release_booking", { _booking_id: active.id, _user_id: userId });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Spot released! If someone books it, they pay a nonprofit you choose.");
    refresh();
  };

  const book = async () => {
    if (!sel) return;
    setBusy(true);
    const { error } = await supabase.rpc("book_spot", { _spot_id: sel.id, _user_id: userId, _hours: hours });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Booked spot ${sel.spot_number} · ${money(hours)} (simulated)`);
    setSel(null);
    refresh();
  };

  if (active && activeSpot) {
    const left = Math.max(0, Math.ceil((new Date(active.end_time).getTime() - now) / 36e5));
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">You're parked</h1>
        <div className="rounded-3xl bg-spot-booked p-6 text-primary-foreground">
          <p className="text-sm opacity-80">Midtown Lot A</p>
          <p className="font-display text-6xl font-bold">#{activeSpot.spot_number}</p>
          <p className="mt-2 text-sm">
            {fmtTime(active.start_time)} – {fmtTime(active.end_time)} · {money(Number(active.amount))}
          </p>
          <p className="mt-1 text-sm font-semibold">{left}h remaining</p>
        </div>
        <div className="rounded-3xl border bg-accent p-5">
          <h2 className="font-semibold text-accent-foreground">Leaving early?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Release your spot. If another driver books your remaining {left}h, 100% of what they pay goes to a Detroit nonprofit you choose.
          </p>
          <Button className="mt-4 w-full rounded-xl" size="lg" onClick={release} disabled={busy || left < 1}>
            Release spot & park it forward
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Find a spot to park</h1>
      <SpotMap spots={spots} selected={sel?.id} onSelect={(s) => (s.status === "booked" ? toast("That spot is taken") : setSel(s))} />
      {sel?.status === "released" && (
        <div className="rounded-2xl border bg-accent p-4 text-sm">
          Spot {sel.spot_number} was released — book it on <Link to="/find" className="font-semibold text-primary underline">Find</Link> to fund a nonprofit.
        </div>
      )}
      {sel?.status === "empty" && (
        <div className="rounded-3xl border p-5">
          <p className="font-semibold">Spot {sel.spot_number}</p>
          <div className="mt-3 flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => setHours((h) => Math.max(1, h - 1))}>−</Button>
            <span className="w-16 text-center font-semibold">{hours}h</span>
            <Button variant="outline" size="icon" onClick={() => setHours((h) => Math.min(12, h + 1))}>+</Button>
            <span className="ml-auto font-display text-xl font-bold">{money(hours)}</span>
          </div>
          <Button className="mt-4 w-full rounded-xl" size="lg" onClick={book} disabled={busy}>
            Pay {money(hours)} (simulated)
          </Button>
        </div>
      )}
    </div>
  );
}
