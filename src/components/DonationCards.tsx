import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Gift, Hourglass, X } from "lucide-react";
import { chooseDonation, rankForUser } from "@/lib/api.functions";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { fmtTime, money, useDemo, type Donation } from "@/lib/demo";
import { cn } from "@/lib/utils";

const SEEN_KEY = "pif-seen-auto";

export function DonationCards() {
  const { userId, simTime, donations, bookings, nonprofits, profiles, refresh } = useDemo();
  const me = profiles.find((p) => p.id === userId);
  const priorityName = nonprofits.find((n) => n.id === me?.priority_nonprofit_id)?.name ?? "your Priority Nonprofit";
  const now = simTime?.getTime() ?? 0;
  const endOf = (d: Donation) => bookings.find((b) => b.id === d.booking_id)?.end_time;
  const pending = donations.filter((d) => d.directed_by_user_id === userId && d.status === "pending");
  const ready = pending.filter((d) => { const e = endOf(d); return e && now >= new Date(e).getTime(); });
  const waiting = pending.filter((d) => { const e = endOf(d); return e && now < new Date(e).getTime(); });

  const [seen, setSeen] = useState<string[]>([]);
  useEffect(() => { setSeen(JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]")); }, []);
  const autos = donations.filter((d) => d.directed_by_user_id === userId && d.status === "auto_donated" && !seen.includes(d.id));
  const dismiss = (id: string) => { const n = [...seen, id]; setSeen(n); localStorage.setItem(SEEN_KEY, JSON.stringify(n)); };

  const [open, setOpen] = useState<Donation | null>(null);
  const [ranked, setRanked] = useState<{ id: string; reason: string }[] | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [thanks, setThanks] = useState<{ amount: number; name: string } | null>(null);

  const openChoice = (d: Donation) => {
    setOpen(d); setThanks(null); setPick(me?.priority_nonprofit_id ?? null); setRanked(null); setFallback(false);
    rankForUser({ data: { userId } }).then((r) => { setRanked(r.matches); setFallback(r.fallback); }, () => { setFallback(true); setRanked(nonprofits.map((n) => ({ id: n.id, reason: n.description }))); });
  };
  // Priority first, labeled; rest in AI order.
  const list = ranked
    ? [...ranked].sort((a, b) => (a.id === me?.priority_nonprofit_id ? -1 : b.id === me?.priority_nonprofit_id ? 1 : 0))
    : null;

  const donate = async () => {
    if (!open || !pick) return;
    setBusy(true);
    const err = await chooseDonation({ data: { donationId: open.id, userId, nonprofitId: pick } }).then(() => null, (e: Error) => e);
    setBusy(false);
    if (err) { toast.error(err.message); return; }
    setThanks({ amount: Number(open.amount), name: nonprofits.find((n) => n.id === pick)?.name ?? "" });
    refresh();
  };

  return (
    <>
      {autos.map((d) => (
        <div key={d.id} className="flex items-start gap-3 rounded-3xl border-2 border-primary bg-accent p-4 text-sm text-accent-foreground">
          <Gift className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="flex-1 font-medium">
            {money(Number(d.amount))} was donated to {nonprofits.find((n) => n.id === d.nonprofit_id)?.name ?? priorityName} (your priority).
          </p>
          <Button variant="ghost" size="icon" aria-label="Dismiss" onClick={() => dismiss(d.id)}><X className="h-4 w-4" /></Button>
        </div>
      ))}
      {ready.map((d) => (
        <Button key={d.id} onClick={() => openChoice(d)} className="h-auto w-full flex-col items-start whitespace-normal rounded-3xl bg-primary p-5 text-left text-primary-foreground">
          <p className="font-display text-lg font-bold">Your released spot raised {money(Number(d.amount))}. Choose where it goes.</p>
          <p className="mt-1 text-sm opacity-90">If you don't choose within 7 days, it goes to {priorityName}.</p>
        </Button>
      ))}
      {waiting.map((d) => (
        <div key={d.id} className="flex items-center gap-3 rounded-3xl border p-4 text-sm">
          <Hourglass className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold">{money(Number(d.amount))}</span>
          <span className="min-w-0 text-muted-foreground">Pending · you'll choose after {fmtTime(endOf(d) ?? d.created_at)}</span>
        </div>
      ))}

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent side="bottom" className="mx-auto max-h-[90vh] max-w-md overflow-y-auto rounded-t-3xl">
          {thanks ? (
            <div className="space-y-4 py-6 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
              <SheetHeader>
                <SheetTitle className="text-center">{money(thanks.amount)} is going to {thanks.name}.</SheetTitle>
                <SheetDescription className="text-center">Thank you for sharing your spot.</SheetDescription>
              </SheetHeader>
              <Button className="w-full rounded-xl" size="lg" onClick={() => setOpen(null)}>Done</Button>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              <SheetHeader>
                <SheetTitle>Choose where {open ? money(Number(open.amount)) : ""} goes</SheetTitle>
                <SheetDescription>Ranked for your interests.</SheetDescription>
              </SheetHeader>
              {!list && <p className="animate-pulse py-6 text-center text-sm text-muted-foreground">Finding the best fits for you…</p>}
              {fallback && <p role="status" className="text-sm text-muted-foreground">AI matching is unavailable right now. You can still choose any nonprofit below.</p>}
              {list?.map((m) => {
                const n = nonprofits.find((x) => x.id === m.id);
                if (!n) return null;
                return (
                  <Button variant="outline" key={m.id} onClick={() => setPick(m.id)}
                    className={cn("h-auto w-full flex-col items-start whitespace-normal rounded-2xl border-2 p-3 text-left", pick === m.id ? "border-primary bg-accent" : "border-border")}>
                    <p className="text-sm font-semibold">
                      {n.name}
                      {n.id === me?.priority_nonprofit_id && <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">Your priority</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{m.reason}</p>
                  </Button>
                );
              })}
              <Button className="sticky bottom-0 w-full rounded-xl" size="lg" disabled={!pick || busy} onClick={donate}>
                {busy ? "Sending…" : `Donate ${open ? money(Number(open.amount)) : ""}`}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
