export const DETROIT_BASELINE = 4812;
export function donatedTotal(donations: { status: string; amount: number | string }[]) {
  return donations.filter((d) => d.status === "donated" || d.status === "auto_donated").reduce((sum, d) => sum + Number(d.amount), 0);
}
export function detroitTotal(donations: { status: string; amount: number | string }[]) {
  return DETROIT_BASELINE + donatedTotal(donations);
}