import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { findMatches, saveInterests, setPriority } from "@/lib/api.functions";
import { useDemo } from "@/lib/demo";
import { cn } from "@/lib/utils";

export const INTEREST_CHIPS = [
  { label: "Food", tag: "food" },
  { label: "Kids & youth", tag: "youth" },
  { label: "Health", tag: "health" },
  { label: "Housing", tag: "housing" },
  { label: "Environment", tag: "environment" },
  { label: "Animals", tag: "animals" },
  { label: "Seniors", tag: "seniors" },
];

type Match = { id: string; reason: string };

export function MatchFlow({ userId, onDone, finishLabel }: { userId: string; onDone: () => void; finishLabel: string }) {
  const { profiles, nonprofits, refresh } = useDemo();
  const me = profiles.find((p) => p.id === userId);
  const [interests, setInterests] = useState<string[]>(me?.interests ?? []);
  const [text, setText] = useState(me?.interest_text ?? "");
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      await saveInterests({ data: { userId, interests, interestText: text } });
      setMatches(await findMatches({ data: { userId } }));
      setPicked(null);
    } catch (e) {
      toast.error((e as Error).message || "Couldn't find matches. Try again.");
    }
    setBusy(false);
  };

  const finish = async () => {
    if (!picked) return;
    setBusy(true);
    try {
      await setPriority({ data: { userId, nonprofitId: picked } });
      await refresh();
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    }
    setBusy(false);
  };

  if (matches) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Your top matches</h1>
          <p className="text-sm text-muted-foreground">Pick one as your Priority Nonprofit.</p>
        </div>
        {matches.map((m) => {
          const n = nonprofits.find((x) => x.id === m.id);
          if (!n) return null;
          const on = picked === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setPicked(m.id)}
              className={cn("w-full rounded-3xl border p-5 text-left transition", on && "border-2 border-primary bg-accent")}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{n.name}</p>
                {on && <Check className="h-5 w-5 shrink-0 text-primary" />}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{m.reason}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {n.tags.map((t) => (
                  <span key={t} className="rounded-full bg-secondary px-2 py-0.5 text-[11px] capitalize text-secondary-foreground">{t}</span>
                ))}
              </div>
            </button>
          );
        })}
        <Button className="w-full rounded-xl" size="lg" disabled={!picked || busy} onClick={finish}>
          {finishLabel}
        </Button>
        <button onClick={() => setMatches(null)} className="w-full text-center text-sm text-muted-foreground underline">
          Change my interests
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">What do you care about?</h1>
      <div className="flex flex-wrap gap-2">
        {INTEREST_CHIPS.map(({ label, tag }) => (
          <button
            key={tag}
            onClick={() => setInterests((i) => (i.includes(tag) ? i.filter((x) => x !== tag) : [...i, tag]))}
            className={cn("rounded-full border px-4 py-2 text-sm", interests.includes(tag) && "border-primary bg-accent font-medium text-accent-foreground")}
          >
            {label}
          </button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Tell us what matters to you."
        className="w-full rounded-2xl border bg-background p-3 text-sm"
        rows={3}
        maxLength={500}
      />
      <Button className="w-full rounded-xl" size="lg" onClick={run} disabled={busy || (interests.length === 0 && !text.trim())}>
        <Sparkles className="h-4 w-4" /> {busy ? "Finding matches…" : "Find my matches"}
      </Button>
    </div>
  );
}
