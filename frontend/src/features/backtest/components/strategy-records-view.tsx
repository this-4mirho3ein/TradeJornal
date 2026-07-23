"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  Clock3,
  Globe2,
  ListFilter,
  Pencil,
  Plus,
  Search,
  Target,
  Trash2,
  TrendingUp,
  Waves,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { AddBacktestRecordForm } from "@/features/backtest/components/add-backtest-record-form";
import { EditBacktestRecordSheet } from "@/features/backtest/components/edit-backtest-record-sheet";
import {
  useBacktestRecordsQuery,
  useBacktestStrategyQuery,
  useDeleteRecordMutation,
} from "@/features/backtest/hooks/use-backtest";
import {
  BACKTEST_CYCLES,
  BACKTEST_SESSIONS,
  BACKTEST_TIMEFRAMES,
  BACKTEST_TRENDS,
} from "@/features/backtest/schemas/backtest";
import { Link } from "@/i18n/navigation";
import { formatDateTime, pnlTone, toNumber } from "@/lib/format";
import { resolveApiAssetUrl } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { BacktestRecord } from "@/types/api";

type Props = {
  strategyId: number;
};

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

export function StrategyRecordsView({ strategyId }: Props) {
  const t = useTranslations("Backtest");
  const strategyQuery = useBacktestStrategyQuery(strategyId);
  const recordsQuery = useBacktestRecordsQuery(strategyId);
  const deleteMutation = useDeleteRecordMutation(strategyId);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [editingRecord, setEditingRecord] = useState<BacktestRecord | null>(
    null,
  );
  const [pendingDelete, setPendingDelete] = useState<BacktestRecord | null>(
    null,
  );
  const [addOpen, setAddOpen] = useState(false);

  const records = recordsQuery.data ?? [];
  const hasRecords = records.length > 0;
  const showAddForm = !hasRecords || addOpen;

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await deleteMutation.mutateAsync(pendingDelete.id);
      setPendingDelete(null);
    } catch {
      // Toast handled by mutation onError
    }
  }

  const filteredRecords = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    return records.filter((record) => {
      const rValue = toNumber(record.r_multiple);
      const matchesSearch =
        !query ||
        record.symbol.toLowerCase().includes(query) ||
        (record.notes ?? "").toLowerCase().includes(query);
      const matchesSide =
        filters.side === "all" || record.side.toLowerCase() === filters.side;
      const matchesTimeframe =
        filters.timeframe === "all" || record.timeframe === filters.timeframe;
      const matchesSession =
        filters.session === "all" || record.session === filters.session;
      const matchesTrend =
        filters.trend === "all" || record.trend === filters.trend;
      const matchesCycle =
        filters.cycle === "all" || record.cycle === filters.cycle;
      const matchesResult =
        filters.result === "all" ||
        (filters.result === "win" && rValue > 0) ||
        (filters.result === "loss" && rValue < 0) ||
        (filters.result === "be" && rValue === 0);

      return (
        matchesSearch &&
        matchesSide &&
        matchesTimeframe &&
        matchesSession &&
        matchesTrend &&
        matchesCycle &&
        matchesResult
      );
    });
  }, [records, filters]);

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

  if (strategyQuery.isLoading || recordsQuery.isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-80" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }

  if (strategyQuery.isError || !strategyQuery.data) {
    return (
      <Card className="panel border-dashed">
        <CardContent className="flex min-h-48 flex-col items-center justify-center gap-3 py-12 text-center">
          <p className="text-sm font-medium text-foreground">
            {t("strategyNotFound")}
          </p>
          <Link
            href="/backtest"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "inline-flex items-center gap-2 rounded-xl",
            )}
          >
            <ArrowLeft
              className="hidden size-4 rtl:inline rtl:order-last"
              aria-hidden
            />
            <span>{t("backToStrategies")}</span>
            <ArrowRight className="size-4 rtl:hidden" aria-hidden />
          </Link>
        </CardContent>
      </Card>
    );
  }

  const strategy = strategyQuery.data;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t("recordsEyebrow")}
        title={strategy.name}
        description={
          strategy.description ||
          t("recordsDescription", { count: strategy.record_count })
        }
        actions={
          <Link
            href="/backtest"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "inline-flex items-center gap-2 rounded-xl",
            )}
          >
            <ArrowLeft
              className="hidden size-4 rtl:inline rtl:order-last"
              aria-hidden
            />
            <span>{t("backToStrategies")}</span>
            <ArrowRight className="size-4 rtl:hidden" aria-hidden />
          </Link>
        }
      />

      <div className="grid gap-3.5 md:grid-cols-4">
        <Stat
          label={t("stats.records")}
          value={String(strategy.record_count)}
        />
        <Stat
          label={t("stats.netR")}
          value={formatR(strategy.net_r ?? strategy.net_profit)}
          tone={pnlTone(strategy.net_r ?? strategy.net_profit)}
        />
        <Stat
          label={t("stats.winRate")}
          value={`${strategy.win_rate.toFixed(1)}%`}
        />
        <Stat
          label={t("stats.wlShort")}
          value={`${strategy.winners} / ${strategy.losers}`}
        />
      </div>

      {showAddForm ? (
        <AddBacktestRecordForm
          strategyId={strategyId}
          dismissible={hasRecords}
          onDismiss={() => setAddOpen(false)}
          onSaved={() => setAddOpen(false)}
        />
      ) : null}

      <Card className="panel">
        <CardHeader className="gap-4 pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="section-title">{t("recordsTitle")}</CardTitle>
              <p className="mt-1 text-[12.5px] text-muted-foreground">
                {t("recordsHint")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {hasRecords && !addOpen ? (
                <Button
                  type="button"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setAddOpen(true)}
                >
                  <Plus className="size-3.5" />
                  {t("addRecordAction")}
                </Button>
              ) : null}
              <Badge variant="outline" className="w-fit rounded-full px-2.5">
                {activeFilterCount > 0
                  ? t("filteredCount", {
                      shown: filteredRecords.length,
                      total: records.length,
                    })
                  : records.length}
              </Badge>
            </div>
          </div>

          {records.length > 0 ? (
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
                    onClick={() => setFilters(DEFAULT_FILTERS)}
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
                      <SelectValue placeholder={t("table.side")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("allSides")}</SelectItem>
                      <SelectItem value="buy">{t("side.buy")}</SelectItem>
                      <SelectItem value="sell">{t("side.sell")}</SelectItem>
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
                      <SelectValue placeholder={t("table.timeframe")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("allTimeframes")}</SelectItem>
                      {BACKTEST_TIMEFRAMES.map((tf) => (
                        <SelectItem key={tf} value={tf}>
                          {t(`timeframe.${tf}`)}
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
                      <SelectValue placeholder={t("table.session")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("allSessions")}</SelectItem>
                      {BACKTEST_SESSIONS.map((session) => (
                        <SelectItem key={session} value={session}>
                          {t(`session.${session}`)}
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
                      <SelectValue placeholder={t("table.trend")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("allTrends")}</SelectItem>
                      {BACKTEST_TRENDS.map((trend) => (
                        <SelectItem key={trend} value={trend}>
                          {t(`trend.${trend}`)}
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
                      <SelectValue placeholder={t("table.cycle")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("allCycles")}</SelectItem>
                      {BACKTEST_CYCLES.map((cycle) => (
                        <SelectItem key={cycle} value={cycle}>
                          {t(`cycle.${cycle}`)}
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
                      <SelectValue placeholder={t("resultFilter")} />
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
          ) : null}
        </CardHeader>

        <CardContent>
          {records.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 px-4 py-12 text-center">
              <p className="text-sm font-medium text-foreground">
                {t("emptyRecordsTitle")}
              </p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {t("emptyRecordsHint")}
              </p>
            </div>
          ) : (
            <div className="min-w-0 overflow-x-auto overscroll-x-contain rounded-2xl border border-border/55">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="table-col-header w-16">
                      {t("table.image")}
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
                      {t("table.session")}
                    </TableHead>
                    <TableHead className="table-col-header">
                      {t("table.trend")}
                    </TableHead>
                    <TableHead className="table-col-header">
                      {t("table.cycle")}
                    </TableHead>
                    <TableHead className="table-col-header">
                      {t("table.openTime")}
                    </TableHead>
                    <TableHead className="table-col-header-end">
                      {t("table.r")}
                    </TableHead>
                    <TableHead className="table-col-header w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={10}
                        className="py-12 text-center text-[13px] text-muted-foreground"
                      >
                        {t("noMatch")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecords.map((record) => {
                      const imageUrl = resolveApiAssetUrl(record.image_url);
                      const rValue = toNumber(record.r_multiple);
                      return (
                        <TableRow key={record.id}>
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
                                  alt={record.symbol}
                                  className="absolute inset-0 size-full object-cover"
                                />
                              </a>
                            ) : (
                              <span className="inline-flex size-12 items-center justify-center rounded-lg border border-dashed border-border/55 text-[11px] text-muted-foreground">
                                —
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-[13.5px] font-semibold tracking-[-0.02em]">
                            {record.symbol}
                            {record.notes ? (
                              <div className="mt-0.5 max-w-[180px] truncate text-[11px] font-normal text-muted-foreground">
                                {record.notes}
                              </div>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={
                                record.side === "buy"
                                  ? "rounded-md bg-profit/10 px-1.5 text-[10px] tracking-[0.06em] text-profit"
                                  : "rounded-md bg-loss/10 px-1.5 text-[10px] tracking-[0.06em] text-loss"
                              }
                            >
                              {record.side === "buy"
                                ? t("side.buy")
                                : t("side.sell")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[13px] text-muted-foreground">
                            {record.timeframe
                              ? t(`timeframe.${record.timeframe}`)
                              : "—"}
                          </TableCell>
                          <TableCell className="text-[13px]">
                            {record.session
                              ? t(`session.${record.session}`)
                              : "—"}
                          </TableCell>
                          <TableCell className="text-[13px]">
                            {record.trend ? t(`trend.${record.trend}`) : "—"}
                          </TableCell>
                          <TableCell className="text-[13px]">
                            {record.cycle ? t(`cycle.${record.cycle}`) : "—"}
                          </TableCell>
                          <TableCell className="text-[13px] text-muted-foreground">
                            {formatDateTime(record.open_time)}
                          </TableCell>
                          <TableCell
                            className={`text-end font-tabular text-[13.5px] font-semibold ${pnlTone(rValue)}`}
                          >
                            {record.r_multiple != null
                              ? formatR(record.r_multiple)
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-0.5">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="rounded-lg text-muted-foreground hover:text-foreground"
                                aria-label={t("editRecord")}
                                onClick={() => setEditingRecord(record)}
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="rounded-lg text-muted-foreground hover:text-destructive"
                                aria-label={t("deleteRecord")}
                                onClick={() => setPendingDelete(record)}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <EditBacktestRecordSheet
        strategyId={strategyId}
        record={editingRecord}
        open={editingRecord != null}
        onOpenChange={(open) => {
          if (!open) setEditingRecord(null);
        }}
      />

      <Sheet
        open={pendingDelete != null}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) setPendingDelete(null);
        }}
      >
        <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
          <SheetHeader className="border-b border-border/55">
            <SheetTitle>{t("deleteRecordTitle")}</SheetTitle>
            <SheetDescription>
              {pendingDelete
                ? t("deleteRecordHint", {
                    symbol: pendingDelete.symbol,
                    side:
                      pendingDelete.side === "buy"
                        ? t("side.buy")
                        : t("side.sell"),
                    time: formatDateTime(pendingDelete.open_time),
                  })
                : null}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-3 p-4 text-[13px] text-muted-foreground">
            <p>{t("deleteRecordWarning")}</p>
          </div>
          <SheetFooter className="border-t border-border/55 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={deleteMutation.isPending}
              onClick={() => setPendingDelete(null)}
            >
              {t("cancelEdit")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-xl"
              disabled={deleteMutation.isPending}
              onClick={() => void confirmDelete()}
            >
              {deleteMutation.isPending
                ? t("deletingRecord")
                : t("confirmDeleteRecord")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function formatR(value: string | number | null | undefined): string {
  const amount = toNumber(value);
  const abs = Math.abs(amount).toFixed(2);
  if (amount > 0) return `+${abs}R`;
  if (amount < 0) return `-${abs}R`;
  return `${abs}R`;
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

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/55 bg-card/70 px-4 py-3.5">
      <p className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase rtl:tracking-normal rtl:normal-case">
        {label}
      </p>
      <p
        className={`mt-1.5 font-tabular text-[1.05rem] font-semibold tracking-[-0.02em] ${tone ?? ""}`}
      >
        {value}
      </p>
    </div>
  );
}
