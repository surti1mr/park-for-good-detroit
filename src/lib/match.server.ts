import { createOpenAI } from "@ai-sdk/openai";
import { NoObjectGeneratedError, Output, streamText } from "ai";
import { z } from "zod";

type NP = { id: string; name: string; description: string; tags: string[] };
export type Match = { id: string; reason: string };

const schema = z.object({
  matches: z.array(z.object({ id: z.string(), reason: z.string() })),
});

/** Keep only ids that exist in the nonprofits table, dedupe, top 3. */
export function filterMatches(raw: Match[], nonprofits: NP[]): Match[] {
  const valid = new Set(nonprofits.map((n) => n.id));
  const seen = new Set<string>();
  const out: Match[] = [];
  for (const m of raw) {
    if (!valid.has(m.id) || seen.has(m.id)) continue;
    seen.add(m.id);
    out.push({ id: m.id, reason: m.reason.trim().slice(0, 200) });
    if (out.length === 3) break;
  }
  return out;
}

/** Tag-overlap fallback so the user always gets 3 real options. */
function fillByTags(current: Match[], interests: string[], nonprofits: NP[]): Match[] {
  if (current.length >= 3) return current;
  const have = new Set(current.map((m) => m.id));
  const ranked = nonprofits
    .filter((n) => !have.has(n.id))
    .sort((a, b) => b.tags.filter((t) => interests.includes(t)).length - a.tags.filter((t) => interests.includes(t)).length);
  for (const n of ranked) {
    if (current.length >= 3) break;
    current.push({ id: n.id, reason: `Works on ${n.tags.join(" and ")}: ${n.description}` });
  }
  return current;
}

export async function matchNonprofits(interests: string[], interestText: string, nonprofits: NP[]) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured");
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  const list = nonprofits.map((n) => ({ id: n.id, name: n.name, description: n.description, tags: n.tags }));
  const result = streamText({
    // Cast bridges a duplicate @ai-sdk/provider type version between packages (runtime-compatible).
    model: provider.responses("openai/gpt-6-astra") as unknown as Parameters<typeof streamText>[0]["model"],
    instructions:
      "You match a person to Detroit nonprofits. You may ONLY choose from the provided list, identified by its exact id. Never invent organizations. Return exactly 3 matches, best first. Each reason is one short sentence (under 20 words) explaining the fit using ONLY the nonprofit's description and tags and the person's stated interests. No statistics, numbers, or facts not in the description.",
    messages: [
      {
        role: "user",
        content: `Person's interests: ${interests.join(", ") || "none given"}\nIn their words: ${interestText || "(nothing)"}\n\nNonprofits:\n${JSON.stringify(list)}`,
      },
    ],
    output: Output.object({ schema }),
    providerOptions: {
      openai: {
        store: false,
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  let raw: Match[] = [];
  try {
    raw = (await result.output).matches;
  } catch (e) {
    if (!NoObjectGeneratedError.isInstance(e)) throw e;
  }
  return fillByTags(filterMatches(raw, nonprofits), interests, nonprofits);
}

/** Two friendly sentences about what the releasing driver's priority nonprofit likely supports. */
export async function summarizeCause(np: { name: string; description: string; tags: string[] }, amount: number) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured");
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  const dollars = `$${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra") as unknown as Parameters<typeof streamText>[0]["model"],
    instructions: `Write exactly 2 short, friendly sentences for a driver about to pay ${dollars} for parking. Start with "Your ${dollars} will likely support" and describe the cause using ONLY the nonprofit's name, description and tags. Always say "likely" because the destination can still change. Never mention any person. Never include statistics, numbers (other than ${dollars}), meals counts, or impact claims not in the description. Plain text only.`,
    messages: [{ role: "user", content: JSON.stringify({ name: np.name, description: np.description, tags: np.tags }) }],
    providerOptions: {
      openai: { store: false, forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", include: ["reasoning.encrypted_content"] },
    },
  });
  return (await result.text).trim();
}
