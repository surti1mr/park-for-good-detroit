import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Heart, Sparkles } from "lucide-react";
import { bookSpot, getCauseSummary } from "@/lib/api.functions";
import { SpotMap } from "@/components/SpotMap";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { fmtTime, money, useDemo } from "@/lib/demo";
import { releasedPrice } from "@/lib/pricing";

export const Route = createFileRoute("/find")({
  head: () => ({
    meta: [
      { title: "Find released spots — ParkItForward" },
      { name: "description", content: "Book parking time other drivers released early. Every dollar goes to a Detroit nonprofit." },
      { property: "og:title", content: "Find released spots — ParkItForward" },
      { property: "og:description", content: "Book released parking time; 100% goes to a Detroit nonprofit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FindPage,
});

type Step = "sheet" | "confirm" | "done";

function FindPage() {
  const { userId, simTime, spots, bookings, refresh } = useDemo();
  const [selId, setSelId] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("sheet");
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryFallback, setSummaryFallback] = useState(false);
  const [done, setDone] = useState<{ n: number; end: string; total: number; empty?: boolean } | null>(null);

  const spot = spots.find((s) => s.id === selId);
  const [hrs, setHrs] = useState(2);
  const isEmpty = spot?.status === "empty";
  const rel = spot ? bookings.find((b) => b.spot_id === spot.id && b.status === "released") : undefined;
  const now = simTime ?? new Date();
  const { hours, total } = rel ? releasedPrice(now, rel.end_time) : { hours: 0, total: 0 };
  const own = rel?.user_id === userId;

  useEffect(() => {
    if (step !== "confirm" || !spot) return;
    setSummary(null);
    setSummaryFallback(false);
    let live = true;
    getCauseSummary({ data: { spotId: spot.id, amount: total } }).then(
      (r) => { if (live) { setSummary(r.text); setSummaryFallback("fallback" in r && r.fallback === true); } },
      () => { if (live) { setSummary(`Your $${total} will likely support a Detroit nonprofit.`); setSummaryFallback(true); } },
    );
    return () => { live = false; };
  }, [step, spot?.id, total]);

  const tap = (id: string, status: string) => {
    if (status === "booked") { toast("Not available for sharing."); return; }
    setSelId(id); setStep("sheet");
  };

  const close = () => { setSelId(null); setStep("sheet"); setDone(null); };

  const pay = async () => {
    if (!spot || !rel) return;
    setBusy(true);
    const err = await bookSpot({ data: { spotId: spot.id, userId, hours } }).then(() => null, (e: Error) => e);
    setBusy(false);
    if (err) {
      toast.error(/booked/i.test(err.message) ? "Someone just booked this spot." : err.message);
      refresh();
      if (/booked|no longer/i.test(err.message)) close();
      return;
    }
    setDone({ n: spot.spot_number, end: rel.end_time, total });
    setStep("done");
    refresh();
  };

  const bookEmpty = async () => {
    if (!spot) return;
    setBusy(true);
    const err = await bookSpot({ data: { spotId: spot.id, userId, hours: hrs } }).then(() => null, (e: Error) => e);
    setBusy(false);
    if (err) { toast.error(/booked/i.test(err.message) ? "Someone just booked this spot." : err.message); refresh(); return; }
    setDone({ n: spot.spot_number, end: new Date(now.getTime() + hrs * 36e5).toISOString(), total: hrs, empty: true });
    setStep("done");
    refresh();
  };

  const open = selId !== null && (step === "done" || !!rel || isEmpty);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Find a spot</h1>
      <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-2xl border px-4 py-3 text-xs font-medium">
        <Legend c="bg-spot-empty" l="Empty" />
        <Legend c="bg-spot-booked" l="Booked" />
        <Legend c="bg-spot-released" l="Released · bookable" />
      </div>
      <SpotMap spots={spots} selected={selId ?? undefined} onSelect={(s) => tap(s.id, s.status)} />
      <p className="text-center text-sm text-muted-foreground">Tap a gray spot to park, or a green spot to book time another driver shared.</p>

      <Sheet open={open} onOpenChange={(o) => !o && close()}>
        <SheetContent side="bottom" className="mx-auto max-h-[90dvh] max-w-md overflow-y-auto rounded-t-3xl pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {step === "done" && done ? (
            <div className="space-y-4 py-4 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
              <SheetHeader><SheetTitle className="text-center">You're parked at Spot {done.n} until {fmtTime(done.end)}.</SheetTitle>
                <SheetDescription className="text-center">{done.empty ? `Paid ${money(done.total)} (simulated). Leaving early? Release it from the Park tab.` : `Your ${money(done.total)} is going to a Detroit nonprofit.`}</SheetDescription></SheetHeader>
              <Button asChild className="w-full rounded-xl" size="lg"><Link to="/" onClick={close}>Go to Park</Link></Button>
            </div>
          ) : spot && isEmpty ? (
            <div className="space-y-4 py-2">
              <SheetHeader>
                <SheetTitle>Spot {spot.spot_number} · $1/hr</SheetTitle>
                <SheetDescription>Starts now ({fmtTime(now)}). Choose how long you'll park.</SheetDescription>
              </SheetHeader>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" onClick={() => setHrs((h) => Math.max(1, h - 1))}>−</Button>
                <span className="w-16 text-center font-semibold">{hrs} hr</span>
                <Button variant="outline" size="icon" onClick={() => setHrs((h) => Math.min(12, h + 1))}>+</Button>
                <span className="ml-auto font-display text-xl font-bold">{money(hrs)}</span>
              </div>
              <p className="text-xs text-muted-foreground">Until {fmtTime(new Date(now.getTime() + hrs * 36e5))}</p>
              <Button className="w-full rounded-xl" size="lg" disabled={busy} onClick={bookEmpty}>Pay {money(hrs)} (simulated)</Button>
            </div>
          ) : spot && rel && step === "sheet" ? (
            <div className="space-y-4 py-2">
              <SheetHeader>
                <SheetTitle>Spot {spot.spot_number} · open until {fmtTime(rel.end_time)} · $1/hr</SheetTitle>
                <SheetDescription>100% of what you pay goes to a Detroit nonprofit.</SheetDescription>
              </SheetHeader>
              <Button className="w-full rounded-xl" size="lg" disabled={own || hours < 1} onClick={() => setStep("confirm")}>
                {own ? "You released this spot" : "Book this spot"}
              </Button>
            </div>
          ) : spot && rel ? (
            <div className="space-y-4 py-2">
              <SheetHeader>
                <SheetTitle>Confirm booking · Spot {spot.spot_number}</SheetTitle>
                <SheetDescription>{spot.lot_name}</SheetDescription>
              </SheetHeader>
              <div className="rounded-2xl bg-muted p-4 text-sm">
                <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3"><span>Time</span><span className="text-right font-semibold">{fmtTime(now)} – {fmtTime(rel.end_time)}</span></div>
                <div className="mt-1 flex justify-between"><span>{hours} hr × $1</span><span className="font-display text-xl font-bold">{money(total)}</span></div>
                <p className="mt-2 text-xs text-muted-foreground">Payment is final. 100% goes to a Detroit nonprofit.</p>
              </div>
              <div className="rounded-2xl border-2 border-primary bg-accent p-4 text-sm text-accent-foreground">
                <p className="mb-1 flex items-center gap-1 font-semibold"><Sparkles className="h-4 w-4" /> Where your money goes</p>
                {summary ?? <span className="animate-pulse text-muted-foreground">Writing a quick summary…</span>}
                {summaryFallback && <p role="status" className="mt-2 text-xs text-muted-foreground">AI summary is unavailable right now. You can still book; 100% goes to a Detroit nonprofit.</p>}
              </div>
              <Button className="w-full rounded-xl" size="lg" disabled={busy} onClick={pay}>
                <Heart className="h-4 w-4 fill-current" /> {busy ? "Processing…" : `Pay ${money(total)}`}
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setStep("sheet")}>Back</Button>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Legend({ c, l }: { c: string; l: string }) {
  return <span className="flex items-center gap-1"><span className={`h-3 w-3 rounded ${c}`} /> {l}</span>;
}
