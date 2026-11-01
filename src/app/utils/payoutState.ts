// How a commission row's payout stands, in words - the backend works the
// state out (payoutState in Functions.php); this only labels it.
export type PayoutState = "paid" | "cancelled" | "in_transfer" | "held" | "reported" | "waiting" | "releasing" | "due"
  | "owed_back" | "taken_back";

export interface PayoutRow {
  payoutStatus: "pending" | "paid";
  payoutState?: PayoutState | null;
  payoutMethod?: string | null;
  collectedBy?: "platform" | "merchant";
  productType?: string;
  releaseAt?: string | null;
  holdReason?: string | null;
}

const METHOD: Record<string, string> = { bank: "bank", wallet: "Naylet", deducted: "deducted from a payout", naira: "cash", split: "at checkout" };

export function payoutStateLabel(row: PayoutRow): { label: string; tone: "success" | "accent" | "muted" | "error" } {
  const state = row.payoutState ?? (row.payoutStatus === "paid" ? "paid" : "waiting");
  switch (state) {
    case "paid":
      return { label: row.payoutMethod ? `Paid · ${METHOD[row.payoutMethod] ?? row.payoutMethod}` : "Paid", tone: "success" };
    case "in_transfer":
      return { label: "Transfer in progress", tone: "accent" };
    case "held":
      return { label: row.holdReason ? `On hold: ${row.holdReason}` : "On hold", tone: "error" };
    case "reported":
      return { label: "On hold: problem reported", tone: "error" };
    case "releasing":
      return { label: row.releaseAt ? `Releases ${new Date(row.releaseAt.replace(" ", "T")).toLocaleDateString()}` : "Releasing", tone: "accent" };
    case "due":
      return { label: "In the next payout", tone: "accent" };
    case "cancelled":
      return { label: "Cancelled", tone: "muted" };
    // Paid, then the order was cancelled or refunded.
    case "owed_back":
      return { label: "Refunded: taken from your next payout", tone: "error" };
    case "taken_back":
      return { label: "Refunded: taken back", tone: "muted" };
    default:
      return { label: "Awaiting delivery", tone: "muted" };
  }
}

export const toneColors = {
  success: { color: "var(--color-success)", backgroundColor: "var(--color-success-light)" },
  accent: { color: "var(--color-accent)", backgroundColor: "var(--color-accent-light)" },
  muted: { color: "var(--color-text-muted)", backgroundColor: "var(--color-surface-alt, var(--color-surface))" },
  error: { color: "var(--color-error)", backgroundColor: "var(--color-error-light, var(--color-accent-light))" },
} as const;

// What paying a row moves: the merchant's share, or - for cash the merchant
// collected themselves - minus the commission and service fee they owe.
export const payoutValue = (row: { collectedBy?: string; merchantAmount: number; commissionAmount: number; owedFee?: number }) =>
  row.collectedBy === "merchant" ? -(row.commissionAmount + (row.owedFee ?? 0)) : row.merchantAmount;
