"use client";

import { useTranslations } from "next-intl";
import { MetricCard } from "@/features/dashboard/components/metric-card";
import { AccountSummary } from "@/features/dashboard/components/account-summary";
import { EquityCurveChart } from "@/features/dashboard/components/equity-curve-chart";
import { OpenPositionsTable } from "@/features/dashboard/components/open-positions-table";
import { SyncControls } from "@/features/dashboard/components/sync-controls";
import { DashboardSkeleton } from "@/features/dashboard/components/dashboard-skeleton";
import {
  useAccountTradesQuery,
  useAccountsQuery,
  useMt4SnapshotQuery,
} from "@/features/dashboard/hooks/use-dashboard-data";
import { PageHeader } from "@/components/layout/page-header";
import { computeDrawdownStats, computeFloatingPnL, computePerformance } from "@/lib/analytics";
import {
  formatDateTime,
  formatDuration,
  formatMoney,
  formatPnL,
  pnlTone,
} from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function DashboardView() {
  const t = useTranslations("Dashboard");
  const accountsQuery = useAccountsQuery();
  const snapshotQuery = useMt4SnapshotQuery();

  const liveAccount = snapshotQuery.data?.account ?? null;
  const storedAccount =
    accountsQuery.data?.find(
      (account) => account.account_number === liveAccount?.login,
    ) ??
    [...(accountsQuery.data ?? [])].sort((a, b) => {
      const aTime = a.last_synced_at ?? "";
      const bTime = b.last_synced_at ?? "";
      return bTime.localeCompare(aTime);
    })[0] ??
    null;
  const accountNumber =
    liveAccount?.login ?? storedAccount?.account_number ?? null;
  const currency =
    liveAccount?.currency ?? storedAccount?.currency ?? "USD";

  const tradesQuery = useAccountTradesQuery(accountNumber);
  const closedTrades =
    tradesQuery.data ?? snapshotQuery.data?.closed_trades ?? [];
  const openPositions = snapshotQuery.data?.open_positions ?? [];
  const stats = computePerformance(closedTrades);

  const balance = liveAccount?.balance ?? storedAccount?.balance ?? "0";
  const equity = liveAccount?.equity ?? storedAccount?.equity ?? "0";
  const margin = liveAccount?.margin ?? storedAccount?.margin ?? "0";
  const credit = liveAccount?.credit ?? "0";
  const floating = computeFloatingPnL({
    balance,
    equity,
    credit,
    profit: liveAccount?.profit ?? storedAccount?.profit,
    positions: openPositions,
  });
  const drawdown = computeDrawdownStats(closedTrades, {
    balance,
    floatingPnL: floating,
  });

  const loading =
    accountsQuery.isLoading ||
    (snapshotQuery.isLoading && !snapshotQuery.data);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (accountsQuery.isError && snapshotQuery.isError) {
    return (
      <Card className="panel border-destructive/35">
        <CardHeader>
          <CardTitle className="section-title">{t("apiUnreachable")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-[13.5px] text-muted-foreground">
          <p>{t("apiUnreachableHint")}</p>
          <pre className="overflow-x-auto rounded-xl bg-muted/70 p-3.5 font-mono text-xs text-foreground">
            {`cd backend\nsource .venv/bin/activate\npython run.py`}
          </pre>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        actions={<SyncControls />}
      />

      <AccountSummary live={liveAccount} stored={storedAccount} />

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3 px-0.5">
          <h2 className="section-title">{t("accountPulse")}</h2>
          <p className="text-[12px] text-muted-foreground">
            {t("accountPulseHint")}
          </p>
        </div>
        <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label={t("metrics.balance")}
            value={formatMoney(balance, currency)}
            hint={t("metrics.balanceHint")}
            delay={0.04}
          />
          <MetricCard
            label={t("metrics.equity")}
            value={formatMoney(equity, currency)}
            hint={t("metrics.equityHint")}
            delay={0.08}
          />
          <MetricCard
            label={t("metrics.floating")}
            value={formatPnL(floating, currency)}
            tone={
              floating > 0 ? "profit" : floating < 0 ? "loss" : "neutral"
            }
            hint={t("metrics.floatingHint", {
              margin: formatMoney(margin, currency),
            })}
            delay={0.12}
          />
          <MetricCard
            label={t("metrics.drawdown")}
            value={`${drawdown.maxPercent.toFixed(2)}%`}
            tone={drawdown.maxPercent > 0 ? "loss" : "neutral"}
            hint={t("metrics.drawdownHint", {
              amount: formatMoney(drawdown.maxAmount, currency),
              current: `${drawdown.currentPercent.toFixed(2)}%`,
            })}
            delay={0.16}
          />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3 px-0.5">
          <h2 className="section-title">{t("performance")}</h2>
          <p className="text-[12px] text-muted-foreground">
            {t("performanceHint", { count: stats.tradeCount })}
          </p>
        </div>
        <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label={t("metrics.winRate")}
            value={`${stats.winRate.toFixed(1)}%`}
            hint={t("metrics.winRateHint", {
              wins: stats.winners,
              losses: stats.losers,
            })}
            delay={0.04}
          />
          <MetricCard
            label={t("metrics.netProfit")}
            value={formatPnL(stats.netProfit, currency)}
            tone={
              stats.netProfit > 0
                ? "profit"
                : stats.netProfit < 0
                  ? "loss"
                  : "neutral"
            }
            hint={t("metrics.netProfitHint")}
            delay={0.08}
          />
          <MetricCard
            label={t("metrics.profitFactor")}
            value={stats.profitFactor.toFixed(2)}
            hint={t("metrics.profitFactorHint", {
              value: formatMoney(stats.expectancy, currency),
            })}
            delay={0.12}
          />
          <MetricCard
            label={t("metrics.avgWinLoss")}
            value={`${formatMoney(stats.averageWin, currency)} / ${formatMoney(stats.averageLoss, currency)}`}
            hint={t("metrics.avgWinLossHint")}
            delay={0.16}
          />
        </div>
      </section>

      <section className="grid gap-3.5 xl:grid-cols-2">
        <EquityCurveChart trades={closedTrades} currency={currency} />
        <OpenPositionsTable positions={openPositions} currency={currency} />
      </section>

      <Card className="panel min-w-0">
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
          <div>
            <CardTitle className="section-title">{t("recentTrades")}</CardTitle>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              {t("recentTradesHint")}
            </p>
          </div>
          <Badge variant="outline" className="rounded-full px-2.5">
            {t("shownOf", {
              shown: Math.min(closedTrades.length, 25),
              total: closedTrades.length,
            })}
          </Badge>
        </CardHeader>
        <CardContent>
          {closedTrades.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 px-4 py-12 text-center">
              <p className="text-sm font-medium text-foreground">
                {t("noClosedYet")}
              </p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {t("noClosedHint")}
              </p>
            </div>
          ) : (
            <div className="min-w-0 overflow-x-auto overscroll-x-contain rounded-2xl border border-border/55">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="table-col-header">
                      {t("table.ticket")}
                    </TableHead>
                    <TableHead className="table-col-header">
                      {t("table.symbol")}
                    </TableHead>
                    <TableHead className="table-col-header">
                      {t("table.side")}
                    </TableHead>
                    <TableHead className="table-col-header">
                      {t("table.volume")}
                    </TableHead>
                    <TableHead className="table-col-header">
                      {t("table.duration")}
                    </TableHead>
                    <TableHead className="table-col-header">
                      {t("table.closed")}
                    </TableHead>
                    <TableHead className="table-col-header-end">
                      {t("table.profit")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {closedTrades.slice(0, 25).map((trade) => {
                    const side = "type" in trade ? trade.type : trade.side;
                    const duration =
                      "duration_seconds" in trade
                        ? trade.duration_seconds
                        : null;
                    const key = "id" in trade ? trade.id : trade.ticket;
                    return (
                      <TableRow key={key}>
                        <TableCell className="font-tabular text-[13px]">
                          #{trade.ticket}
                        </TableCell>
                        <TableCell className="text-[13.5px] font-semibold tracking-[-0.02em]">
                          {trade.symbol}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className="rounded-md px-1.5 text-[10px] tracking-[0.06em]"
                          >
                            {String(side).toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-tabular text-[13px]">
                          {trade.volume}
                        </TableCell>
                        <TableCell className="text-[13px] text-muted-foreground">
                          {formatDuration(duration)}
                        </TableCell>
                        <TableCell className="text-[13px] text-muted-foreground">
                          {formatDateTime(trade.close_time)}
                        </TableCell>
                        <TableCell
                          dir="ltr"
                          className={`text-end font-tabular text-[13.5px] font-semibold ${pnlTone(trade.profit)}`}
                        >
                          {formatPnL(trade.profit, currency)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
