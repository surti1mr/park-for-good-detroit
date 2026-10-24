import { describe, expect, it } from "vitest";
import { releasedPrice } from "@/lib/pricing";

describe("releasedPrice", () => {
  it("3:00–9:00 PM is 6 hrs = $6", () => {
    expect(releasedPrice("2026-10-24T15:00:00-04:00", "2026-10-24T21:00:00-04:00")).toEqual({ hours: 6, total: 6 });
  });
  it("rounds partial hours up", () => {
    expect(releasedPrice("2026-10-24T15:10:00-04:00", "2026-10-24T21:00:00-04:00")).toEqual({ hours: 6, total: 6 });
  });
});
