import { z } from "zod";

export const createStrategySchema = z.object({
  name: z.string().trim().min(1, "required").max(120, "tooLong"),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type CreateStrategyFormValues = z.infer<typeof createStrategySchema>;

export const BACKTEST_SESSIONS = [
  "asian",
  "london",
  "newyork",
  "london_ny",
  "other",
] as const;

export const BACKTEST_TRENDS = ["bullish", "bearish", "ranging"] as const;

export const BACKTEST_TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h"] as const;

export const BACKTEST_CYCLES = ["spike", "channel", "trading_range"] as const;

export const createRecordSchema = z.object({
  symbol: z.string().trim().min(1, "required").max(32),
  side: z.enum(["buy", "sell"]),
  r_multiple: z.string().trim().optional().or(z.literal("")),
  timeframe: z.enum(BACKTEST_TIMEFRAMES),
  session: z.enum(BACKTEST_SESSIONS),
  trend: z.enum(BACKTEST_TRENDS),
  cycle: z.enum(BACKTEST_CYCLES),
  open_time: z.string().trim().min(1, "required"),
  notes: z.string().trim().max(4000).optional().or(z.literal("")),
});

export type CreateRecordFormValues = z.infer<typeof createRecordSchema>;
