import { createFileRoute } from "@tanstack/react-router";
import { money, useDemo } from "@/lib/demo";
import { cn } from "@/lib/utils";
import { donatedTotal, detroitTotal } from "@/lib/impact";

export const Route = createFileRoute("/impact")({
  head: () => ({
    meta: [
      { title: "Your impact — ParkItForward" },
      { name: "description", content: "See donations your released parking time has generated for Detroit nonprofits." },
      { property: "og:title", content: "Your impact — ParkItForward" },
      { property: "og:description", content: "Track donations from released parking spots." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ImpactPage,
});

const label: Record<string, string> = { pending: "Pending", donated: "Donated", auto_donated: "Auto-donated" };

function ImpactPage() {
  const { userId, donations, bookings, nonprofits } = useDemo();
  const mine = donations.filter((d) => d.directed_by_user_id === userId);
  const directed = donatedTotal(mine);
  // Counts every spot the user released (stays counted after another driver takes it).
  const shared = bookings.filter((b) => b.user_id === userId && b.released_at).length;
  const detroit = detroitTotal(donations);
  const fmtDate = (s: string) => new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Detroit" });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Your impact</h1>
      <div className="rounded-3xl bg-foreground p-6 text-background">
        <p className="text-xs uppercase tracking-wide opacity-70">Detroit total this month</p>
        <p className="font-display text-4xl font-bold">{money(detroit)}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-primary p-5 text-primary-foreground">
          <p className="text-xs opacity-80">You've directed</p>
          <p className="font-display text-3xl font-bold">{money(directed)}</p>
        </div>
        <div className="rounded-3xl bg-muted p-5">
          <p className="text-xs text-muted-foreground">Spots shared</p>
          <p className="font-display text-3xl font-bold">{shared}</p>
        </div>
      </div>
      <div>
        <h2 className="mb-2 font-semibold">Your donations</h2>
        {mine.length === 0 && <p className="rounded-2xl bg-muted p-5 text-center text-sm text-muted-foreground">No donations yet. Release a spot to start.</p>}
        <div className="space-y-2">
          {mine.map((d) => (
            <div key={d.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-2xl border p-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{nonprofits.find((n) => n.id === d.nonprofit_id)?.name ?? "Not chosen yet"}</p>
                <p className="text-xs text-muted-foreground">{fmtDate(d.donated_at ?? d.created_at)}</p>
              </div>
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", d.status === "pending" ? "bg-muted text-muted-foreground" : "bg-accent text-accent-foreground")}>
                {label[d.status] ?? d.status}
              </span>
              <span className="col-start-2 font-display font-bold">{money(Number(d.amount))}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
