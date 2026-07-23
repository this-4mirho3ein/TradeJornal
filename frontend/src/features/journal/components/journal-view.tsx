"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Globe2,
  ListFilter,
  Pencil,
  Plus,
  Search,
  Target,
  TrendingUp,
  Waves,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { AddJournalTradeSheet } from "@/features/journal/components/add-journal-trade-sheet";
import { EditJournalTradeSheet } from "@/features/journal/components/edit-journal-trade-sheet";
import {
  BACKTEST_CYCLES,
  BACKTEST_SESSIONS,
  BACKTEST_TIMEFRAMES,
  BACKTEST_TRENDS,
} from "@/features/backtest/schemas/backtest";
import { fetchAccountTrades, fetchAccounts } from "@/lib/api/journal";
import { resolveApiAssetUrl } from "@/lib/api/client";
import {
  formatDateTime,
  formatDuration,
  formatPnL,
  pnlTone,
  toNumber,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ClosedTrade } from "@/types/api";

type Filters = {
  search: string;
  side: string;
  timeframe: string;
  session: string;
  trend: string;
  cycle: string;
  result: string;
};

const DEFAULT_FILTERS: Filters = {
  search: "",
  side: "all",
  timeframe: "all",
  session: "all",
  trend: "all",
  cycle: "all",
  result: "all",
};

const PAGE_SIZE = 20;

export function JournalView() {
  const t = useTranslations("Journal");
  const tb = useTranslations("Backtest");
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [editingTrade, setEditingTrade] = useState<ClosedTrade | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const deferredSearch = useDeferredValue(filters.search.trim());

  const accountsQuery = useQuery({
    queryKey: ["accounts"],
    queryFn: fetchAccounts,
  });

  const account =
    [...(accountsQuery.data ?? [])]
      .filter((item) => item.account_number !== 0)
      .sort((a, b) => {
        const aTime = a.last_synced_at ?? "";
        const bTime = b.last_synced_at ?? "";
        return bTime.localeCompare(aTime);
      })[0] ??
    (accountsQuery.data ?? []).find((item) => item.account_number === 0) ??
    null;

  const journalAccountNumber = account?.account_number ?? 0;
  const journalCurrency = account?.currency ?? "USD";

  const listParams = useMemo(
    () => ({
      page,
      page_size: PAGE_SIZE,
      search: deferredSearch || undefined,
      side: filters.side,
      timeframe: filters.timeframe,
      session: filters.session,
      trend: filters.trend,
      cycle: filters.cycle,
      result: filters.result,
    }),
    [page, deferredSearch, filters],
  );

  const tradesQuery = useQuery({
    queryKey: ["accounts", journalAccountNumber, "trades", "journal", listParams],
    queryFn: () => fetchAccountTrades(journalAccountNumber, listParams),
    enabled: Boolean(account),
    placeholderData: keepPreviousData,
  });

  const pageData = tradesQuery.data;
  const trades = pageData?.items ?? [];
  const total = pageData?.total ?? 0;
  const totalPages = pageData?.total_pages ?? 1;
  const currentPage = pageData?.page ?? page;

  useEffect(() => {
    setPage(1);
  }, [
    deferredSearch,
    filters.side,
    filters.timeframe,
    filters.session,
    filters.trend,
    filters.cycle,
    filters.result,
  ]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search.trim()) count += 1;
    if (filters.side !== "all") count += 1;
    if (filters.timeframe !== "all") count += 1;
    if (filters.session !== "all") count += 1;
    if (filters.trend !== "all") count += 1;
    if (filters.cycle !== "all") count += 1;
    if (filters.result !== "all") count += 1;
    return count;
  }, [filters]);

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  if (accountsQuery.isLoading || (account && tradesQuery.isLoading && !pageData)) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={
          account
            ? t("description", {
                account: account.account_number,
                currency: account.currency,
              })
            : t("emptyDescription")
        }
      />

      <Card className="panel min-w-0">
        <CardHeader className="gap-4 pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="section-title">
                {t("closedTrades")}
              </CardTitle>
              <p className="mt-1 text-[12.5px] text-muted-foreground">
                {t("filtersHint")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                className="rounded-xl"
                onClick={() => setAddOpen(true)}
              >
                <Plus className="size-3.5" />
                {t("addManualAction")}
              </Button>
              <Badge variant="outline" className="w-fit rounded-full px-2.5">
                {activeFilterCount > 0
                  ? t("filteredCount", {
                      shown: trades.length,
                      total,
                    })
                  : total}
              </Badge>
            </div>
          </div>

          <div className="space-y-3.5 rounded-2xl border border-border/55 bg-muted/20 p-3.5 sm:p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2.5">
                <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background/80 text-muted-foreground">
                  <ListFilter className="size-3.5" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[13px] font-semibold tracking-[-0.01em] text-foreground">
                      {t("filtersTitle")}
                    </p>
                    {activeFilterCount > 0 ? (
                      <Badge
                        variant="secondary"
                        className="rounded-full px-2 text-[10px] font-medium"
                      >
                        {t("filtersActive", { count: activeFilterCount })}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    {t("filtersHint")}
                  </p>
                </div>
              </div>
              {activeFilterCount > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-lg px-2 text-[12px]"
                  onClick={() => {
                    setFilters(DEFAULT_FILTERS);
                    setPage(1);
                  }}
                >
                  <X className="size-3.5" />
                  {t("clearFilters")}
                </Button>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
              <FilterField
                icon={Search}
                label={t("filterLabels.search")}
                className="xl:col-span-2"
              >
                <Input
                  value={filters.search}
                  onChange={(event) =>
                    updateFilter("search", event.target.value)
                  }
                  placeholder={t("searchPlaceholder")}
                  className="h-9 rounded-xl"
                />
              </FilterField>

              <FilterField icon={ArrowLeftRight} label={t("fields.side")}>
                <Select
                  value={filters.side}
                  onValueChange={(value) =>
                    updateFilter("side", value ?? "all")
                  }
                >
                  <SelectTrigger className="h-9 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("allSides")}</SelectItem>
                    <SelectItem value="buy">{t("buy")}</SelectItem>
                    <SelectItem value="sell">{t("sell")}</SelectItem>
                  </SelectContent>
                </Select>
              </FilterField>

              <FilterField icon={Clock3} label={t("fields.timeframe")}>
                <Select
                  value={filters.timeframe}
                  onValueChange={(value) =>
                    updateFilter("timeframe", value ?? "all")
                  }
                >
                  <SelectTrigger className="h-9 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("allTimeframes")}</SelectItem>
                    {BACKTEST_TIMEFRAMES.map((tf) => (
                      <SelectItem key={tf} value={tf}>
                        {tb(`timeframe.${tf}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>

              <FilterField icon={Globe2} label={t("fields.session")}>
                <Select
                  value={filters.session}
                  onValueChange={(value) =>
                    updateFilter("session", value ?? "all")
                  }
                >
                  <SelectTrigger className="h-9 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("allSessions")}</SelectItem>
                    {BACKTEST_SESSIONS.map((session) => (
                      <SelectItem key={session} value={session}>
                        {tb(`session.${session}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>

              <FilterField icon={TrendingUp} label={t("fields.trend")}>
                <Select
                  value={filters.trend}
                  onValueChange={(value) =>
                    updateFilter("trend", value ?? "all")
                  }
                >
                  <SelectTrigger className="h-9 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("allTrends")}</SelectItem>
                    {BACKTEST_TRENDS.map((trend) => (
                      <SelectItem key={trend} value={trend}>
                        {tb(`trend.${trend}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>

              <FilterField icon={Waves} label={t("fields.cycle")}>
                <Select
                  value={filters.cycle}
                  onValueChange={(value) =>
                    updateFilter("cycle", value ?? "all")
                  }
                >
                  <SelectTrigger className="h-9 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("allCycles")}</SelectItem>
                    {BACKTEST_CYCLES.map((cycle) => (
                      <SelectItem key={cycle} value={cycle}>
                        {tb(`cycle.${cycle}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>

              <FilterField icon={Target} label={t("resultFilter")}>
                <Select
                  value={filters.result}
                  onValueChange={(value) =>
                    updateFilter("result", value ?? "all")
                  }
                >
                  <SelectTrigger className="h-9 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("allResults")}</SelectItem>
                    <SelectItem value="win">{t("winners")}</SelectItem>
                    <SelectItem value="loss">{t("losers")}</SelectItem>
                    <SelectItem value="be">{t("breakEven")}</SelectItem>
                  </SelectContent>
                </Select>
              </FilterField>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {!account && total === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 px-4 py-12 text-center">
              <p className="text-sm font-medium text-foreground">
                {t("emptyTitle")}
              </p>
              <p className="mx-auto mt-1 max-w-md text-[13px] text-muted-foreground">
                {t("emptyHintManual")}
              </p>
              <Button
                type="button"
                className="mt-4 rounded-xl"
                onClick={() => setAddOpen(true)}
              >
                <Plus className="size-4" />
                {t("addManualAction")}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div
                className={cn(
                  "min-w-0 overflow-x-auto overscroll-x-contain rounded-2xl border border-border/55",
                  tradesQuery.isFetching && "opacity-70 transition-opacity",
                )}
              >
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="table-col-header w-20">
                      {t("table.image")}
                    </TableHead>
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
                      {t("table.timeframe")}
                    </TableHead>
                    <TableHead className="table-col-header">
                      {t("table.trend")}
                    </TableHead>
                    <TableHead className="table-col-header">
                      {t("table.cycle")}
                    </TableHead>
                    <TableHead className="table-col-header">
                      {t("table.duration")}
                    </TableHead>
                    <TableHead className="table-col-header">
                      {t("table.result")}
                    </TableHead>
                    <TableHead className="table-col-header-end">
                      {t("table.r")}
                    </TableHead>
                    <TableHead className="table-col-header-end">
                      {t("table.profit")}
                    </TableHead>
                    <TableHead className="table-col-header w-14" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trades.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={12}
                        className="py-12 text-center text-[13px] text-muted-foreground"
                      >
                        {t("noMatch")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    trades.map((trade) => {
                      const profit = toNumber(trade.profit);
                      const imageUrl = resolveApiAssetUrl(trade.image_url);
                      const rValue =
                        trade.r_multiple != null
                          ? toNumber(trade.r_multiple)
                          : null;
                      const isManual =
                        trade.is_manual ||
                        trade.ticket < 0 ||
                        trade.magic_number === -1;
                      return (
                        <TableRow key={trade.id}>
                          <TableCell className="align-middle">
                            {imageUrl ? (
                              <a
                                href={imageUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="relative block size-12 shrink-0 overflow-hidden rounded-lg border border-border/55 bg-muted/40"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={imageUrl}
                                  alt={trade.symbol}
                                  className="absolute inset-0 size-full object-cover"
                                />
                              </a>
                            ) : (
                              <span className="inline-flex size-12 items-center justify-center rounded-lg border border-dashed border-border/55 text-[11px] text-muted-foreground">
                                —
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="font-tabular text-[13px]">
                            {isManual ? t("manualTicket") : `#${trade.ticket}`}
                          </TableCell>
                          <TableCell className="text-[13.5px] font-semibold tracking-[-0.02em]">
                            {trade.symbol}
                            {trade.notes ? (
                              <div className="mt-0.5 max-w-40 truncate text-[11px] font-normal text-muted-foreground">
                                {trade.notes}
                              </div>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className="rounded-md px-1.5 text-[10px] tracking-[0.06em]"
                            >
                              {trade.type.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[13px] text-muted-foreground">
                            {trade.timeframe
                              ? tb(`timeframe.${trade.timeframe}`)
                              : "—"}
                          </TableCell>
                          <TableCell className="text-[13px]">
                            {trade.trend ? tb(`trend.${trade.trend}`) : "—"}
                          </TableCell>
                          <TableCell className="text-[13px]">
                            {trade.cycle ? tb(`cycle.${trade.cycle}`) : "—"}
                          </TableCell>
                          <TableCell
                            dir="ltr"
                            className="text-[13px] text-muted-foreground"
                          >
                            {formatDuration(trade.duration_seconds)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={
                                profit > 0
                                  ? "rounded-md bg-profit/10 px-1.5 text-[10px] tracking-[0.06em] text-profit"
                                  : profit < 0
                                    ? "rounded-md bg-loss/10 px-1.5 text-[10px] tracking-[0.06em] text-loss"
                                    : "rounded-md px-1.5 text-[10px] tracking-[0.06em]"
                              }
                            >
                              {profit > 0
                                ? t("win")
                                : profit < 0
                                  ? t("loss")
                                  : t("be")}
                            </Badge>
                          </TableCell>
                          <TableCell
                            className={`text-end font-tabular text-[13px] font-semibold ${
                              rValue != null
                                ? pnlTone(rValue)
                                : "text-muted-foreground"
                            }`}
                          >
                            {rValue != null ? formatR(rValue) : "—"}
                          </TableCell>
                          <TableCell
                            className={`text-end font-tabular text-[13.5px] font-semibold ${pnlTone(trade.profit)}`}
                          >
                            <span dir="ltr" className="inline-block">
                              {formatPnL(trade.profit, journalCurrency)}
                            </span>
                            <div className="mt-0.5 text-[11px] font-normal tracking-normal text-muted-foreground">
                              {formatDateTime(trade.close_time)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="rounded-lg text-muted-foreground hover:text-foreground"
                              aria-label={t("editTrade")}
                              onClick={() => setEditingTrade(trade)}
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              </div>

              {total > 0 ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[12.5px] text-muted-foreground">
                    {t("paginationSummary", {
                      from: (currentPage - 1) * PAGE_SIZE + 1,
                      to: Math.min(currentPage * PAGE_SIZE, total),
                      total,
                    })}
                  </p>
                  <nav
                    aria-label={t("paginationNav")}
                    className="flex items-center gap-1"
                  >
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      className="rounded-lg"
                      disabled={currentPage <= 1 || tradesQuery.isFetching}
                      aria-label={t("paginationPrev")}
                      onClick={() => setPage((value) => Math.max(1, value - 1))}
                    >
                      <ChevronLeft className="size-3.5 rtl:rotate-180" />
                    </Button>

                    {getPaginationItems(currentPage, totalPages).map(
                      (item, index) =>
                        item === "ellipsis" ? (
                          <span
                            key={`ellipsis-${index}`}
                            className="px-1.5 text-[12px] text-muted-foreground select-none"
                            aria-hidden
                          >
                            …
                          </span>
                        ) : (
                          <Button
                            key={item}
                            type="button"
                            variant={
                              item === currentPage ? "default" : "outline"
                            }
                            size="icon-sm"
                            className="rounded-lg font-tabular text-[12.5px]"
                            disabled={tradesQuery.isFetching}
                            aria-label={t("paginationGoTo", { page: item })}
                            aria-current={
                              item === currentPage ? "page" : undefined
                            }
                            onClick={() => setPage(item)}
                          >
                            {item}
                          </Button>
                        ),
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      className="rounded-lg"
                      disabled={
                        currentPage >= totalPages || tradesQuery.isFetching
                      }
                      aria-label={t("paginationNext")}
                      onClick={() =>
                        setPage((value) => Math.min(totalPages, value + 1))
                      }
                    >
                      <ChevronRight className="size-3.5 rtl:rotate-180" />
                    </Button>
                  </nav>
                </div>
              ) : null}
            </div>
          )}
          <p className="mt-3 text-[12px] text-muted-foreground">
            {t("enrichmentFooter")}
          </p>
        </CardContent>
      </Card>

      <AddJournalTradeSheet
        accountNumber={journalAccountNumber}
        open={addOpen}
        onOpenChange={setAddOpen}
      />

      <EditJournalTradeSheet
        accountNumber={journalAccountNumber}
        currency={journalCurrency}
        trade={editingTrade}
        open={editingTrade != null}
        onOpenChange={(open) => {
          if (!open) setEditingTrade(null);
        }}
      />
    </div>
  );
}

function formatR(value: number): string {
  const abs = Math.abs(value).toFixed(2);
  if (value > 0) return `+${abs}R`;
  if (value < 0) return `-${abs}R`;
  return `${abs}R`;
}

function getPaginationItems(
  current: number,
  total: number,
): Array<number | "ellipsis"> {
  if (total <= 1) return [1];
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const items: Array<number | "ellipsis"> = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);

  if (left > 2) items.push("ellipsis");
  for (let page = left; page <= right; page += 1) {
    items.push(page);
  }
  if (right < total - 1) items.push("ellipsis");
  items.push(total);

  return items;
}

function FilterField({
  icon: Icon,
  label,
  children,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <Label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        <Icon className="size-3 shrink-0 opacity-80" aria-hidden />
        <span>{label}</span>
      </Label>
      {children}
    </div>
  );
}
