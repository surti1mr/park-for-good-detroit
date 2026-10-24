import { describe, expect, it } from "vitest";
import { filterMatches } from "@/lib/match.server";

const nps = ["a", "b", "c", "d"].map((id) => ({ id, name: id, description: "", tags: [] }));

describe("filterMatches", () => {
  it("discards ids not in the nonprofits table", () => {
    expect(filterMatches([{ id: "fake", reason: "x" }, { id: "a", reason: "y" }], nps).map((m) => m.id)).toEqual(["a"]);
  });
  it("returns at most 3", () => {
    expect(filterMatches(nps.map((n) => ({ id: n.id, reason: "r" })), nps)).toHaveLength(3);
  });
});
