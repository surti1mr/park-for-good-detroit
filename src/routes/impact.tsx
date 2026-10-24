import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { money, useDemo } from "@/lib/demo";

export const Route = createFileRoute("/impact")({
  head: () => ({
    meta: [
      { title: "Your impact — ParkItForward" },
      { name: "description", content: "See donations your released parking time has generated for Detroit nonprofits." },
      { property: "og:title", content: "Your impact — ParkItForward" },
      { property: "og:description", content: "Track donations from released parking spots." },
    ],
  }),
  component: ImpactPage,
});

function ImpactPage() {
  const { userId, simTime, donations, nonprofits, profiles, refresh } = useDemo();
  const me = profiles.find((p) => p.id === userId);
  const mine = donations.filter((d) => d.directed_by_user_id === userId);
  const total = mine.filter((d) => d.status !== "pending").reduce((a, d) => a + Number(d.amount), 0);
  const pending = mine.filter((d) => d.status === "pending");
  const allTotal = donations.filter((d) => d.status !== "pending").reduce((a, d) => a + Number(d.amount), 0);
  const npName = (id: string | null) => nonprofits.find((n) => n.id === id)?.name ?? "—";
  const sorted = [...nonprofits].sort((a, b) => (a.id === me?.priority_nonprofit_id ? -1 : b.id === me?.priority_nonprofit_id ? 1 : 0));

  const choose = async (donationId: string, npId: string) => {
    const { error } = await supabase.from("donations").update({ nonprofit_id: npId, status: "donated" }).eq("id", donationId);
    if (error) { toast.error(error.message); return; }
    toast.success(`Donated to ${npName(npId)} 💚`);
    refresh();
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Your impact</h1>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-primary p-5 text-primary-foreground">
          <p className="text-xs opacity-80">You've directed</p>
          <p className="font-display text-3xl font-bold">{money(total)}</p>
        </div>
        <div className="rounded-3xl bg-muted p-5">
          <p className="text-xs text-muted-foreground">Community total</p>
          <p className="font-display text-3xl font-bold">{money(allTotal)}</p>
        </div>
      </div>

      {pending.map((d) => {
        const daysLeft = simTime ? Math.max(0, 7 - Math.floor((simTime.getTime() - new Date(d.created_at).getTime()) / 864e5)) : 7;
        return (
          <div key={d.id} className="rounded-3xl border-2 border-primary p-5">
            <p className="font-semibold">Someone booked your spot! {money(Number(d.amount))} to give</p>
            <p className="mb-3 text-sm text-muted-foreground">
              Pick a nonprofit. In {daysLeft} day{daysLeft === 1 ? "" : "s"} it auto-donates to {npName(me?.priority_nonprofit_id ?? null)}.
            </p>
            <div className="space-y-2">
              {sorted.map((n) => (
                <button key={n.id} onClick={() => choose(d.id, n.id)} className="w-full rounded-2xl border p-3 text-left hover:border-primary">
                  <p className="text-sm font-semibold">
                    {n.name} {n.id === me?.priority_nonprofit_id && <span className="ml-1 rounded-full bg-accent px-2 py-0.5 text-[10px] text-accent-foreground">Your priority</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{n.description}</p>
                </button>
              ))}
            </div>
          </div>
        );
      })}

      <div>
        <h2 className="mb-2 font-semibold">History</h2>
        {mine.filter((d) => d.status !== "pending").length === 0 && (
          <p className="text-sm text-muted-foreground">No donations yet. Release a spot from Park to start.</p>
        )}
        {mine
          .filter((d) => d.status !== "pending")
          .map((d) => (
            <div key={d.id} className="flex items-center justify-between border-b py-3 text-sm">
              <div>
                <p className="font-medium">{npName(d.nonprofit_id)}</p>
                <p className="text-xs text-muted-foreground">{d.status === "auto_donated" ? "Auto-donated to your priority" : "You chose"}</p>
              </div>
              <p className="font-semibold text-primary">{money(Number(d.amount))}</p>
            </div>
          ))}
      </div>
    </div>
  );
}
