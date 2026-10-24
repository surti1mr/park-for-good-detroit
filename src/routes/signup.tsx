import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MatchFlow } from "@/components/MatchFlow";
import { signUp } from "@/lib/api.functions";
import { useDemo } from "@/lib/demo";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Sign up — ParkItForward" },
      { name: "description", content: "Join ParkItForward and get matched with a Detroit nonprofit you care about." },
      { property: "og:title", content: "Sign up — ParkItForward" },
      { property: "og:description", content: "Join and get matched with a Detroit nonprofit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const { setUserId, refresh } = useDemo();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [newId, setNewId] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await signUp({ data: { name, email } });
      if (r.existing) toast("Welcome back — that email already has an account.");
      setUserId(r.id);
      await refresh();
      setNewId(r.id);
    } catch (err) {
      toast.error((err as Error).message);
    }
    setBusy(false);
  };

  if (newId) {
    return (
      <MatchFlow
        userId={newId}
        finishLabel="Finish sign-up"
        onDone={() => {
          toast.success("You're all set! 💚");
          navigate({ to: "/profile" });
        }}
      />
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Join ParkItForward</h1>
        <p className="text-sm text-muted-foreground">Leave early, give back to Detroit.</p>
      </div>
      <label className="block text-sm font-medium">
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} className="mt-1 w-full rounded-xl border bg-background px-3 py-3" />
      </label>
      <label className="block text-sm font-medium">
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 w-full rounded-xl border bg-background px-3 py-3" />
      </label>
      <Button type="submit" className="w-full rounded-xl" size="lg" disabled={busy}>
        Continue
      </Button>
    </form>
  );
}
