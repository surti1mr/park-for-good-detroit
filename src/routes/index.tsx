import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Clock, Heart, CheckCircle2 } from "lucide-react";
import { releaseBooking } from "@/lib/api.functions";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { fmtTime, money, useDemo } from "@/lib/demo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Park — ParkItForward Detroit" },
      { name: "description", content: "See your parking session and release your spot early to fund a Detroit nonprofit." },
      { property: "og:title", content: "ParkItForward Detroit" },
      { property: "og:description", content: "Leave early, give back. Released parking time funds Detroit nonprofits." },
    ],
  }),
  component: ParkPage,
});

function ParkPage() {
  const { userId, simTime, spots, bookings, profiles, nonprofits, refresh } = useDemo();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [justReleased, setJustReleased] = useState<string | null>(null);
  const now = simTime?.getTime() ?? 0;
  const me = profiles.find((p) => p.id === userId);
  const priority = nonprofits.find((n) => n.id === me?.priority_nonprofit_id)?.name ?? "your Priority Nonprofit";

  const active = bookings.find((b) => b.user_id === userId && b.status === "active");
  // Released session still running (shared, or already taken by another driver).
  const shared = bookings.find(
    (b) => b.user_id === userId && b.released_at && b.status !== "active" && new Date(b.end_time).getTime() > now,
  );
  const session = active ?? shared;
  const spot = spots.find((s) => s.id === session?.spot_id);

  const canRelease =
    !!active && now > new Date(active.start_time).getTime() && now < new Date(active.end_time).getTime();

  const release = async () => {
    if (!active) return;
    setBusy(true);
    try {
      await releaseBooking({ data: { bookingId: active.id, userId } });
      setJustReleased(active.id);
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
    setBusy(false);
    setConfirm(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-3 text-sm">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">Current time</span>
        <span className="ml-auto font-semibold">{simTime ? fmtTime(simTime) : "…"}</span>
      </div>

      {!session || !spot ? (
        <div className="rounded-3xl border p-8 text-center">
          <h1 className="text-xl font-bold">No active parking session</h1>
          <p className="mt-1 text-sm text-muted-foreground">Find an open or shared spot nearby.</p>
          <Button asChild className="mt-5 rounded-xl" size="lg">
            <Link to="/find">Find a spot</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className={session.status === "active" ? "rounded-3xl bg-spot-booked p-6 text-primary-foreground" : "rounded-3xl bg-spot-released p-6 text-primary-foreground"}>
            <div className="flex items-center justify-between text-sm">
              <span className="opacity-90">{spot.lot_name}</span>
              <span className="rounded-full bg-background/20 px-3 py-1 text-xs font-semibold">
                {session.status === "active"
                  ? "Parked"
                  : session.status === "released"
                    ? "Shared · waiting for a driver"
                    : "Shared · a driver took your spot"}
              </span>
            </div>
            <p className="font-display text-6xl font-bold">#{spot.spot_number}</p>
            <p className="mt-2 text-sm">
              {fmtTime(session.start_time)} – {fmtTime(session.end_time)}
            </p>
            <p className="text-sm">Paid {money(Number(session.amount))}</p>
          </div>

          {justReleased === session.id && session.status !== "active" && (
            <div className="rounded-3xl border-2 border-primary bg-accent p-5">
              <p className="flex items-center gap-2 font-semibold text-accent-foreground">
                <CheckCircle2 className="h-5 w-5" /> Your spot is shared until {fmtTime(session.end_time)}.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Donations will default to <span className="font-semibold text-foreground">{priority}</span> unless you choose another after{" "}
                {fmtTime(session.end_time)}.
              </p>
            </div>
          )}

          {canRelease && (
            <div className="rounded-3xl border bg-accent p-5">
              <h2 className="flex items-center gap-2 font-semibold text-accent-foreground">
                <Heart className="h-4 w-4" /> Leaving early?
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">Share your remaining time — whoever parks pays a Detroit nonprofit.</p>
              <Button className="mt-4 w-full rounded-xl" size="lg" onClick={() => setConfirm(true)}>
                I'm leaving early
              </Button>
            </div>
          )}
        </>
      )}

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Release your spot?</AlertDialogTitle>
            <AlertDialogDescription>
              You won't get a refund. If someone parks here before {active ? fmtTime(active.end_time) : ""}, 100% of what they pay goes to a Detroit
              nonprofit you choose.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                release();
              }}
            >
              Release spot
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
