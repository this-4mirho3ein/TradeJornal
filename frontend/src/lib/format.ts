import { format, formatDistanceStrict, parseISO } from "date-fns";

export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Isolate LTR so FA/RTL layouts cannot reorder sign, digits, or currency. */
function asLtr(text: string): string {
  return `\u2066${text}\u2069`;
}

function formatPlainNumber(amount: number, digits: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount);
}

function normalizeCurrencyCode(currency: string): string {
  const code = currency.trim().toUpperCase();
  return code || "USD";
}

/**
 * Always: `[sign]number CURRENCY` — e.g. `1,234.56 USD`, `-60.60 USC`.
 * Currency code stays on the right; minus stays on the left (EN + FA).
 */
export function formatMoney(
  value: string | number | null | undefined,
  currency = "USD",
  digits = 2,
): string {
  const amount = toNumber(value);
  const number = formatPlainNumber(Math.abs(amount), digits);
  const code = normalizeCurrencyCode(currency);
  const signed = amount < 0 ? `-${number}` : number;
  return asLtr(`${signed} ${code}`);
}

/**
 * Always: `+number CURRENCY` / `-number CURRENCY` / `number CURRENCY`.
 * Sign on the left, currency code on the right (EN + FA).
 */
export function formatPnL(
  value: string | number | null | undefined,
  currency = "USD",
): string {
  const amount = toNumber(value);
  const number = formatPlainNumber(Math.abs(amount), 2);
  const code = normalizeCurrencyCode(currency);
  if (amount > 0) return asLtr(`+${number} ${code}`);
  if (amount < 0) return asLtr(`-${number} ${code}`);
  return asLtr(`${number} ${code}`);
}

export function formatPrice(value: string | number | null | undefined): string {
  const amount = toNumber(value);
  if (amount >= 100) return amount.toFixed(2);
  if (amount >= 10) return amount.toFixed(3);
  return amount.toFixed(5);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return format(parseISO(value), "MMM d, yyyy HH:mm");
  } catch {
    return value;
  }
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || seconds < 0) return "—";
  const end = new Date(0);
  const start = new Date(seconds * 1000);
  return formatDistanceStrict(start, end);
}

export function pnlTone(value: string | number | null | undefined): string {
  const amount = toNumber(value);
  if (amount > 0) return "text-profit";
  if (amount < 0) return "text-loss";
  return "text-muted-foreground";
}
