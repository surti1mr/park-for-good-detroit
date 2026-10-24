import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { INTEREST_CHIPS } from "@/components/MatchFlow";
import { useDemo } from "@/lib/demo";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — ParkItForward" },
      { name: "description", content: "Your interests and priority Detroit nonprofit." },
      { property: "og:title", content: "Profile — ParkItForward" },
      { property: "og:description", content: "Choose the nonprofit your released spots support." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { userId, profiles, nonprofits } = useDemo();
  const me = profiles.find((p) => p.id === userId);
  if (!me) return null;
  const np = nonprofits.find((n) => n.id === me.priority_nonprofit_id);
  const label = (t: string) => INTEREST_CHIPS.find((c) => c.tag === t)?.label ?? t;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{me.name}</h1>
        <p className="text-sm text-muted-foreground">{me.email}</p>
      </div>
      <section>
        <h2 className="mb-2 text-sm font-semibold">Interests</h2>
        {me.interests.length === 0 ? (
          <p className="text-sm text-muted-foreground">None yet</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {me.interests.map((t) => (
              <span key={t} className="rounded-full bg-accent px-3 py-1.5 text-sm text-accent-foreground">{label(t)}</span>
            ))}
          </div>
        )}
        {me.interest_text && <p className="mt-2 text-sm italic text-muted-foreground">“{me.interest_text}”</p>}
      </section>
      <section className="rounded-3xl border-2 border-primary p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Priority Nonprofit</p>
        {np ? (
          <>
            <p className="mt-1 text-lg font-semibold">{np.name}</p>
            <p className="text-sm text-muted-foreground">{np.description}</p>
          </>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">Not chosen yet</p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">Gets your donation automatically if you don't choose within 7 days.</p>
        <Button asChild variant="outline" className="mt-4 w-full rounded-xl">
          <Link to="/match">Change priority</Link>
        </Button>
      </section>
    </div>
  );
}
