import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { saveProfile } from "@/lib/api.functions";
import { Button } from "@/components/ui/button";
import { useDemo } from "@/lib/demo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — ParkItForward" },
      { name: "description", content: "Set your interests and priority Detroit nonprofit." },
      { property: "og:title", content: "Profile — ParkItForward" },
      { property: "og:description", content: "Choose the nonprofit your released spots support." },
    ],
  }),
  component: ProfilePage,
});

const TAGS = ["food", "housing", "youth", "environment", "community", "animals", "health", "seniors"];

function ProfilePage() {
  const { userId, profiles, nonprofits, refresh } = useDemo();
  const me = profiles.find((p) => p.id === userId);
  const [interests, setInterests] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [priority, setPriority] = useState<string | null>(null);

  useEffect(() => {
    if (!me) return;
    setInterests(me.interests);
    setText(me.interest_text ?? "");
    setPriority(me.priority_nonprofit_id);
  }, [me?.id, me?.interests, me?.interest_text, me?.priority_nonprofit_id]);

  const ranked = [...nonprofits].sort(
    (a, b) => b.tags.filter((t) => interests.includes(t)).length - a.tags.filter((t) => interests.includes(t)).length,
  );

  const save = async () => {
    const error = await saveProfile({ data: { userId, interests, interestText: text, priority } }).then(() => null, (e: Error) => e);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile saved");
    refresh();
  };

  if (!me) return null;
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{me.name}</h1>
        <p className="text-sm text-muted-foreground">{me.email}</p>
      </div>
      <section>
        <h2 className="mb-2 text-sm font-semibold">Causes you care about</h2>
        <div className="flex flex-wrap gap-2">
          {TAGS.map((t) => (
            <button
              key={t}
              onClick={() => setInterests((i) => (i.includes(t) ? i.filter((x) => x !== t) : [...i, t]))}
              className={cn("rounded-full border px-3 py-1.5 text-sm capitalize", interests.includes(t) && "border-primary bg-accent text-accent-foreground")}
            >
              {t}
            </button>
          ))}
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Anything else you care about?"
          className="mt-3 w-full rounded-2xl border bg-background p-3 text-sm"
          rows={2}
        />
      </section>
      <section>
        <h2 className="mb-2 text-sm font-semibold">Priority nonprofit</h2>
        <p className="mb-2 text-xs text-muted-foreground">Gets your donation automatically if you don't choose within 7 days.</p>
        <div className="space-y-2">
          {ranked.map((n) => (
            <button
              key={n.id}
              onClick={() => setPriority(n.id)}
              className={cn("w-full rounded-2xl border p-3 text-left", priority === n.id && "border-2 border-primary bg-accent")}
            >
              <p className="text-sm font-semibold">{n.name}</p>
              <p className="text-xs text-muted-foreground">{n.description}</p>
              <p className="mt-1 text-[11px] capitalize text-primary">{n.tags.join(" · ")}</p>
            </button>
          ))}
        </div>
      </section>
      <Button className="w-full rounded-xl" size="lg" onClick={save}>Save profile</Button>
    </div>
  );
}
