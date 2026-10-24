import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Heart } from "lucide-react";
import { bookSpot } from "@/lib/api.functions";
import { SpotMap } from "@/components/SpotMap";
import { Button } from "@/components/ui/button";
import { fmtTime, money, useDemo } from "@/lib/demo";

export const Route = createFileRoute("/find")({
  head: () => ({
    meta: [
      { title: "Find released spots — ParkItForward" },
      { name: "description", content: "Book parking time other drivers released early. Every dollar goes to a Detroit nonprofit." },
      { property: "og:title", content: "Find released spots — ParkItForward" },
      { property: "og:description", content: "Book released parking time; 100% goes to a Detroit nonprofit." },
    ],
  }),
  component: FindPage,
});

function FindPage() {
  const { userId, simTime, spots, bookings, refresh } = useDemo();
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [hours, setHours] = useState(2);
  const selSpot = spots.find((x) => x.id === sel && x.status === "empty");
  const bookEmpty = async () => {
    if (!selSpot) return;
    setBusy(true);
    const error = await bookSpot({ data: { spotId: selSpot.id, userId, hours } }).then(() => null, (e: Error) => e);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Booked spot ${selSpot.spot_number} · ${money(hours)} (simulated)`);
    setSel(null);
    refresh();
  };
  const now = simTime?.getTime() ?? 0;
  const released = spots
    .filter((s) => s.status === "released")
    .map((s) => ({ s, b: bookings.find((b) => b.spot_id === s.id && b.status === "released") }))
    .filter((x) => x.b && new Date(x.b.end_time).getTime() > now);

  const book = async (spotId: string) => {
    setBusy(true);
    const error = await bookSpot({ data: { spotId, userId, hours: 1 } }).then(() => null, (e: Error) => e);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Booked! Your payment is going to a Detroit nonprofit 💚");
    refresh();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Find a spot</h1>
      <SpotMap spots={spots} selected={sel ?? undefined} onSelect={(x) => setSel(x.status === "empty" ? x.id : null)} />
      {selSpot && (
        <div className="rounded-3xl border p-5">
          <p className="font-semibold">Spot {selSpot.spot_number} · $1/hr</p>
          <div className="mt-3 flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => setHours((h) => Math.max(1, h - 1))}>−</Button>
            <span className="w-16 text-center font-semibold">{hours}h</span>
            <Button variant="outline" size="icon" onClick={() => setHours((h) => Math.min(12, h + 1))}>+</Button>
            <span className="ml-auto font-display text-xl font-bold">{money(hours)}</span>
          </div>
          <Button className="mt-4 w-full rounded-xl" size="lg" onClick={bookEmpty} disabled={busy}>
            Pay {money(hours)} (simulated)
          </Button>
        </div>
      )}
      <h2 className="pt-2 font-semibold">Shared spots</h2>
      {released.length === 0 && (
        <p className="rounded-2xl bg-muted p-5 text-center text-sm text-muted-foreground">No released spots right now. Green spots appear here live.</p>
      )}
      {released.map(({ s, b }) => {
        const hrs = Math.ceil((new Date(b!.end_time).getTime() - now) / 36e5);
        const own = b!.user_id === userId;
        return (
          <div key={s.id} className="rounded-3xl border-2 border-primary bg-accent p-5">
            <div className="flex items-baseline justify-between">
              <p className="font-display text-3xl font-bold text-accent-foreground">#{s.spot_number}</p>
              <p className="font-display text-xl font-bold">{money(hrs)}</p>
            </div>
            <p className="text-sm text-muted-foreground">Until {fmtTime(b!.end_time)} · {hrs}h left</p>
            <p className="mt-2 flex items-center gap-1 text-sm font-medium text-accent-foreground">
              <Heart className="h-4 w-4 fill-current" /> 100% goes to a Detroit nonprofit
            </p>
            <Button className="mt-4 w-full rounded-xl" size="lg" disabled={busy || own} onClick={() => book(s.id)}>
              {own ? "You released this spot" : `Book & donate ${money(hrs)} (simulated)`}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
