import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { MatchFlow } from "@/components/MatchFlow";
import { useDemo } from "@/lib/demo";

export const Route = createFileRoute("/match")({
  head: () => ({
    meta: [
      { title: "Find your nonprofit match — ParkItForward" },
      { name: "description", content: "Tell us what you care about and we'll suggest Detroit nonprofits to support." },
      { property: "og:title", content: "Find your nonprofit match — ParkItForward" },
      { property: "og:description", content: "Get matched with Detroit nonprofits you care about." },
    ],
  }),
  component: MatchPage,
});

function MatchPage() {
  const { userId, profiles } = useDemo();
  const navigate = useNavigate();
  if (!profiles.some((p) => p.id === userId)) return null;
  return (
    <MatchFlow
      key={userId}
      userId={userId}
      finishLabel="Save priority"
      onDone={() => {
        toast.success("Priority nonprofit updated");
        navigate({ to: "/profile" });
      }}
    />
  );
}
