import { describe, expect, it } from "vitest";
import { detroitTotal, donatedTotal } from "@/lib/impact";

describe("live demo Impact totals", () => {
  it("returns the $4,812 baseline when reset removes donations", () => {
    expect(detroitTotal([])).toBe(4812);
  });
  it("adds the demonstrated $6 donation to Detroit's total", () => {
    expect(detroitTotal([{ amount: 6, status: "donated" }])).toBe(4818);
  });
  it("does not count pending payments as directed donations", () => {
    expect(donatedTotal([{ amount: 6, status: "pending" }])).toBe(0);
  });
  it("includes automatically donated amounts", () => {
    expect(donatedTotal([{ amount: 6, status: "auto_donated" }])).toBe(6);
  });
});