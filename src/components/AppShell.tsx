import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Car, MapPin, Heart, User, SlidersHorizontal, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
  const { userId, setUserId, simTime, refresh } = useDemo();
  const base = simTime ?? new Date();
  const curHour = simTime ? Number(simTime.toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "America/Detroit" })) : -1;
  const setClock = async (iso: string, label: string) => {
    const { error } = await supabase.rpc("set_clock", { _time: iso });
    if (error) { toast.error(error.message); return; }
    toast.success(`Clock set: ${label}`);
    await refresh();
  };
  return (
    <div className="fixed right-3 top-14 z-[100] w-72 rounded-2xl border bg-card p-4 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Demo controls</h3>
        <button onClick={onClose} aria-label="Close"><X className="h-4 w-4" /></button>
      </div>
      <p className="mb-1 text-xs text-muted-foreground">Role</p>
      <div className="mb-4 grid grid-cols-2 gap-2">
        {DRIVERS.map((d) => (
          <button
            key={d.id}
            onClick={() => setUserId(d.id)}
            className={cn(
              "rounded-xl border px-3 py-2 text-sm font-medium",
              userId === d.id ? "border-primary bg-accent text-accent-foreground" : "bg-background",
            )}
          >
            {d.label}
          </button>
        ))}
      </div>
      <p className="mb-1 text-xs text-muted-foreground">Clock · {simTime ? fmtTime(simTime) : "…"}</p>
      <div className="grid grid-cols-3 gap-2">
        {[9, 13, 15, 21].map((h) => (
          <button
            key={h}
            type="button"
            onClick={() => setClock(atHour(base, h), h > 12 ? `${h - 12}:00 PM` : `${h}:00 AM`)}
            className={cn(
              "cursor-pointer rounded-xl px-2 py-2 text-xs font-medium active:scale-95",
              curHour === h ? "bg-primary text-primary-foreground" : "bg-secondary",
            )}
          >
            {h > 12 ? `${h - 12}:00 PM` : `${h}:00 AM`}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setClock(new Date(base.getTime() + 7 * 864e5).toISOString(), "+7 days")}
          className="cursor-pointer rounded-xl active:scale-95 bg-secondary px-2 py-2 text-xs font-medium"
        >
          +7 days
        </button>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { userId, simTime } = useDemo();
  const who = DRIVERS.find((d) => d.id === userId)?.label;
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background">
      <header className="relative sticky top-0 z-40 flex items-center justify-between border-b bg-background/90 px-4 py-3 backdrop-blur">
        <div>
          <p className="font-display text-lg font-bold leading-none">
            Park<span className="text-primary">It</span>Forward
          </p>
          <p className="text-xs text-muted-foreground">
            {who} · {simTime ? fmtTime(simTime) : ""}
          </p>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" /> Demo
        </button>
        {open && <DemoPanel onClose={() => setOpen(false)} />}
      </header>
      <main className="flex-1 px-4 pb-28 pt-4">{children}</main>
      <nav className="fixed bottom-0 left-1/2 z-40 grid w-full max-w-md -translate-x-1/2 grid-cols-4 border-t bg-background">
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
      </nav>
    </div>
  );
}
