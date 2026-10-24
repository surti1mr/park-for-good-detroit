import { Link } from "@tanstack/react-router";
import { ArrowRight, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DRIVERS, useDemo } from "@/lib/demo";
import detroit from "@/assets/detroit-welcome.jpg";

export function Welcome() {
  const { setUserId } = useDemo();
  return (
    <div className="welcome-page mx-auto max-w-md">
      <section className="welcome-scene relative flex min-h-[420px] flex-col justify-end px-6 pb-7 pt-20">
        <img src={detroit} alt="Detroit skyline and riverfront park" width={1024} height={1280} className="absolute inset-0 h-full w-full object-cover" />
        <div className="welcome-shade absolute inset-0" />
        <div className="relative text-primary-foreground">
          <Heart className="mb-4 h-8 w-8" />
          <h1 className="text-4xl font-bold">ParkItForward</h1>
          <p className="mt-3 max-w-xs text-2xl font-semibold leading-snug">Your unused parking time, turned into Detroit's good.</p>
        </div>
      </section>
      <section className="px-6 py-7">
        <p className="text-base leading-relaxed">Leave early, share your spot, and 100% of what the next driver pays goes to a Detroit nonprofit you choose.</p>
        <div className="mt-6 grid gap-3">
          <Button asChild size="lg"><Link to="/signup">Get started <ArrowRight className="h-4 w-4" /></Link></Button>
          <Button size="lg" variant="outline" onClick={() => { const driver = DRIVERS[0]; if (driver) setUserId(driver.id); }}>Try the demo</Button>
        </div>
      </section>
    </div>
  );
}