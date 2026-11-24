import { useAPI } from "./api.js";
import { API_BASE } from "./apiBase.js";

// The lowest commission a shop can choose or propose, as a percent of the
// sale (CMS → Payouts). A flat rate that comes to less is charged this.
export function useMinCommission(): number {
  const { data } = useAPI(`${API_BASE}/settings`);
  return Number((data as { minCommissionPercent?: number } | null)?.minCommissionPercent ?? 5);
}

// Why a rate can't be used, or null when it's fine.
export function commissionRateError(type: "percentage" | "flat", value: string, min: number): string | null {
  const rate = Number(value);
  if (value.trim() === "" || Number.isNaN(rate) || rate < 0) return "Enter a valid commission rate";
  if (type === "percentage" && rate < min) return `The lowest commission is ${min}%`;
  return null;
}

// Whether sellers may choose "Abigail delivers" (off until a logistics
// arrangement exists - sellers deliver their own orders).
export function useAbigailDelivers(): boolean {
  const { data } = useAPI(`${API_BASE}/settings`);
  return Boolean((data as { abigailDeliversEnabled?: boolean } | null)?.abigailDeliversEnabled);
}

export function minCommissionNote(min: number): string {
  return `At least ${min}% of each sale. A flat rate that comes to less than ${min}% of a sale is charged ${min}%.`;
}
