import { toNumber } from "@/lib/format";
import type { ClosedTrade, Mt4ClosedTrade, Mt4Position } from "@/types/api";

export type PerformanceStats = {
  tradeCount: number;
  winners: number;
  losers: number;
  winRate: number;
  netProfit: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  expectancy: number;
  bestTrade: number;
  worstTrade: number;
};

export type DrawdownStats = {
  /** Max peak-to-trough drawdown as a percent of peak equity. */
  maxPercent: number;
  /** Max peak-to-trough drawdown in account currency. */
  maxAmount: number;
  /** Current equity distance below balance while underwater (open risk). */
  currentPercent: number;
};

type TradeLike = Pick<ClosedTrade, "profit"> | Pick<Mt4ClosedTrade, "profit">;

type NetPnLLike = {
  profit: string | number;
  swap?: string | number | null;
  commission?: string | number | null;
};

type TimedTradeLike = NetPnLLike & {
  close_time?: string | null;
};

/** MT4 net result: order profit + swap + commission. */
export function tradeNetProfit(trade: NetPnLLike): number {
  return (
    toNumber(trade.profit) + toNumber(trade.swap) + toNumber(trade.commission)
  );
}

/**
 * Floating P/L for the open book.
 *
 * Prefer summing live positions (profit + swap + commission) when present —
 * that matches MetaTrader's AccountProfit(). Otherwise use the books identity:
 * Equity = Balance + Credit + Floating  ⇒  Floating = Equity − Balance − Credit.
 */
export function computeFloatingPnL(input: {
  balance: string | number | null | undefined;
  equity: string | number | null | undefined;
  credit?: string | number | null | undefined;
  profit?: string | number | null | undefined;
  positions?: Array<Pick<Mt4Position, "profit" | "swap" | "commission">>;
}): number {
  const positions = input.positions ?? [];
  if (positions.length > 0) {
    return positions.reduce((sum, position) => sum + tradeNetProfit(position), 0);
  }

  const balance = toNumber(input.balance);
  const equity = toNumber(input.equity);
  const credit = toNumber(input.credit);
  const fromBooks = equity - balance - credit;

  // When books are flat / unavailable, fall back to the broker profit field.
  if (balance === 0 && equity === 0) {
    return toNumber(input.profit);
  }

  return fromBooks;
}

/**
 * Current floating drawdown vs balance (open risk only).
 * Uses floating P/L directly so credit / bonus cash cannot fake a drawdown.
 */
export function computeCurrentDrawdownPct(
  balance: string | number | null | undefined,
  floatingPnL: string | number | null | undefined,
): number {
  const bal = toNumber(balance);
  const floating = toNumber(floatingPnL);
  if (bal <= 0 || floating >= 0) return 0;
  return (Math.abs(floating) / bal) * 100;
}

/**
 * Max drawdown on the closed-trade equity path, optionally extended with
 * current floating so an open loser counts against the peak.
 */
export function computeDrawdownStats(
  trades: TimedTradeLike[],
  options: {
    balance: string | number | null | undefined;
    floatingPnL?: string | number | null | undefined;
  },
): DrawdownStats {
  const floating = toNumber(options.floatingPnL);
  const balance = toNumber(options.balance);
  const currentPercent = computeCurrentDrawdownPct(balance, floating);

  const sorted = [...trades].sort((a, b) =>
    String(a.close_time ?? "").localeCompare(String(b.close_time ?? "")),
  );
  const closedNets = sorted.map(tradeNetProfit);
  const closedNet = closedNets.reduce((sum, value) => sum + value, 0);

  // Rebuild the path so it ends at current balance before floating is applied.
  let equity = balance - closedNet;
  let peak = equity;
  let maxAmount = 0;
  let maxPercent = 0;

  const apply = (delta: number) => {
    equity += delta;
    peak = Math.max(peak, equity);
    const drawdown = peak - equity;
    if (drawdown > maxAmount) {
      maxAmount = drawdown;
      maxPercent = peak > 0 ? (drawdown / peak) * 100 : 0;
    }
  };

  for (const net of closedNets) {
    apply(net);
  }
  if (floating !== 0) {
    apply(floating);
  }

  return {
    maxPercent,
    maxAmount,
    currentPercent,
  };
}

export function computePerformance(trades: TradeLike[]): PerformanceStats {
  const profits = trades.map((trade) => toNumber(trade.profit));
  const winners = profits.filter((value) => value > 0);
  const losers = profits.filter((value) => value < 0);
  const netProfit = profits.reduce((sum, value) => sum + value, 0);
  const grossProfit = winners.reduce((sum, value) => sum + value, 0);
  const grossLoss = Math.abs(losers.reduce((sum, value) => sum + value, 0));
  const averageWin = winners.length
    ? grossProfit / winners.length
    : 0;
  const averageLoss = losers.length
    ? grossLoss / losers.length
    : 0;
  const winRate = profits.length ? (winners.length / profits.length) * 100 : 0;
  const profitFactor =
    grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
  const expectancy = profits.length ? netProfit / profits.length : 0;

  return {
    tradeCount: profits.length,
    winners: winners.length,
    losers: losers.length,
    winRate,
    netProfit,
    grossProfit,
    grossLoss,
    profitFactor: Number.isFinite(profitFactor) ? profitFactor : 0,
    averageWin,
    averageLoss,
    expectancy,
    bestTrade: profits.length ? Math.max(...profits) : 0,
    worstTrade: profits.length ? Math.min(...profits) : 0,
  };
}