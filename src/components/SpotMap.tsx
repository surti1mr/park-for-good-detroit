import type { Spot } from "@/lib/demo";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const color = {
  empty: "bg-spot-empty text-muted-foreground",
  booked: "bg-spot-booked text-primary-foreground",
  released: "bg-spot-released text-primary-foreground ring-4 ring-accent animate-pulse",
} as Record<string, string>;

export function SpotMap({
  spots,
  selected,
  onSelect,
  mine,
}: {
  spots: Spot[];
  selected?: string | undefined;
  onSelect?: ((s: Spot) => unknown) | undefined;
  mine?: string | undefined;
}) {
  return (
    <div className="rounded-3xl border bg-muted p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Midtown Lot A · $1/hr</p>
      <div className="grid grid-cols-5 gap-2">
        {spots.map((s) => (
          <Button variant="ghost"
            key={s.id}
            onClick={() => onSelect?.(s)}
            className={cn(
              "relative flex h-auto aspect-[3/4] items-center justify-center rounded-xl p-0 text-sm font-bold transition",
              color[s.status],
              selected === s.id && "outline outline-2 outline-offset-2 outline-foreground",
            )}
          >
            {s.spot_number}
            {mine === s.id && <span className="absolute -top-1 -right-1 rounded-full bg-foreground px-1 text-[9px] text-background">you</span>}
          </Button>
        ))}
      </div>
    </div>
  );
}

