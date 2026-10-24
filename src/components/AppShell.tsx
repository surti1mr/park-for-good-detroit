import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Car, MapPin, Heart, User, SlidersHorizontal, X, RotateCcw, Loader2 } from "lucide-react";
import { setClock as setClockFn, resetDemo } from "@/lib/api.functions";
import { Button } from "@/components/ui/button";
import { Welcome } from "@/components/Welcome";
import { DRIVERS, atHour, fmtTime, useDemo } from "@/lib/demo";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const NAV = [
  { to: "/", label: "Park", icon: Car },
  { to: "/find", label: "Find", icon: MapPin },
  { to: "/impact", label: "Impact", icon: Heart },
  { to: "/profile", label: "Profile", icon: User },
] as const;

function DemoPanel({ onClose }: { onClose: () => void }) {
  const [resetting, setResetting] = useState(false);
  const navigate = useNavigate();
  const { userId, setUserId, simTime, refresh, profiles } = useDemo();
  const others = profiles.filter((p) => !DRIVERS.some((d) => d.id === p.id) && p.email !== "other@demo.app");
  const roles = [...DRIVERS, ...others.map((p) => ({ id: p.id, label: p.name }))];
  const base = simTime ?? new Date();
  const curHour = simTime ? Number(simTime.toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "America/Detroit" })) : -1;
  const setClock = async (iso: string, label: string) => {
    try { await setClockFn({ data: { time: iso } }); } catch (e) { toast.error((e as Error).message); return; }
    toast.success(`Clock set: ${label}`);
    await refresh();
  };
  return (
    <div className="fixed right-3 top-16 z-[100] max-h-[calc(100dvh-6rem)] w-72 max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-2xl border bg-card p-4 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Demo controls</h3>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close demo controls"><X className="h-4 w-4" /></Button>
      </div>
      <p className="mb-1 text-xs text-muted-foreground">Role</p>
      <div className="mb-4 grid grid-cols-2 gap-2">
        {roles.map((d) => (
          <Button variant="outline"
            key={d.id}
            onClick={() => setUserId(d.id)}
            className={cn(
              "rounded-xl border px-3 py-2 text-sm font-medium",
              userId === d.id ? "border-primary bg-accent text-accent-foreground" : "bg-background",
            )}
          >
            <span className="block truncate">{d.label}</span>
          </Button>
        ))}
        <Link to="/signup" onClick={onClose} className="col-span-2 rounded-xl border border-dashed px-3 py-2 text-center text-sm font-medium text-primary">
          + Sign up a new user
        </Link>
      </div>
      <p className="mb-1 text-xs text-muted-foreground">Clock · {simTime ? fmtTime(simTime) : "…"}</p>
      <div className="grid grid-cols-3 gap-2">
        {[9, 13, 15, 21].map((h) => (
          <Button variant="secondary"
            key={h}
            type="button"
            onClick={() => setClock(atHour(base, h), h > 12 ? `${h - 12}:00 PM` : `${h}:00 AM`)}
            className={cn(
              "cursor-pointer rounded-xl px-2 py-2 text-xs font-medium active:scale-95",
              curHour === h ? "bg-primary text-primary-foreground" : "bg-secondary",
            )}
          >
            {h > 12 ? `${h - 12}:00 PM` : `${h}:00 AM`}
          </Button>
        ))}
        <Button variant="secondary"
          type="button"
          onClick={() => setClock(new Date(base.getTime() + 7 * 864e5).toISOString(), "+7 days")}
          className="cursor-pointer rounded-xl active:scale-95 bg-secondary px-2 py-2 text-xs font-medium"
        >
          +7 days
        </Button>
      </div>
      <Button variant="outline" className="mt-4 w-full" disabled={resetting} onClick={async () => {
        setResetting(true);
        try {
          await resetDemo();
          localStorage.removeItem("pif-seen-auto");
          const driver = DRIVERS[0];
          if (driver) setUserId(driver.id);
          await refresh();
          await navigate({ to: "/" });
          toast.success("Demo reset — Driver 1 is parked at Spot 14 at 9:00 AM.");
          onClose();
        } catch (e) { toast.error((e as Error).message); }
        finally { setResetting(false); }
      }}>{resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} {resetting ? "Resetting…" : "Reset demo"}</Button>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { userId, simTime, profiles, identityReady } = useDemo();
  const location = useLocation();
  const who = profiles.find((p) => p.id === userId)?.name ?? DRIVERS.find((d) => d.id === userId)?.label;
  if (!identityReady) return <div className="grid min-h-screen place-items-center"><Loader2 aria-label="Loading ParkItForward" className="h-7 w-7 animate-spin text-primary" /></div>;
  if (!userId && location.pathname !== "/signup") return <Welcome />;
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background">
      <header className="relative sticky top-0 z-40 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b bg-background/90 px-4 py-3 backdrop-blur">
        <div className="min-w-0">
          <p className="font-display text-lg font-bold leading-none">
            Park<span className="text-primary">It</span>Forward
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {who} · {simTime ? fmtTime(simTime) : ""}
          </p>
        </div>
        <Button variant="outline"
          onClick={() => setOpen((o) => !o)}
          className="shrink-0 gap-1 rounded-full px-3 text-xs font-medium"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" /> Demo
        </Button>
        {open && <DemoPanel onClose={() => setOpen(false)} />}
      </header>
      <main className="min-w-0 flex-1 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-4">{children}</main>
      {userId && <nav className="fixed bottom-0 left-1/2 z-40 grid w-full max-w-md -translate-x-1/2 grid-cols-4 border-t bg-background pb-[env(safe-area-inset-bottom)]">
        {NAV.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: true }}
            className="flex flex-col items-center gap-1 py-3 text-xs text-muted-foreground"
            activeProps={{ className: "text-primary font-semibold" }}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}
      </nav>}
    </div>
  );
}
