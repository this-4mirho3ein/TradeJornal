"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, FlaskConical, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { CreateStrategyForm } from "@/features/backtest/components/create-strategy-form";
import {
  useBacktestStrategiesQuery,
  useDeleteStrategyMutation,
} from "@/features/backtest/hooks/use-backtest";
import { Link } from "@/i18n/navigation";
import { pnlTone, toNumber } from "@/lib/format";
import type { BacktestStrategy } from "@/types/api";

function formatRDisplay(value: string | number | null | undefined): string {
  const amount = toNumber(value);
  const abs = Math.abs(amount).toFixed(2);
  if (amount > 0) return `+${abs}R`;
  if (amount < 0) return `-${abs}R`;
  return `${abs}R`;
}

export function BacktestStrategiesView() {
  const t = useTranslations("Backtest");
  const strategiesQuery = useBacktestStrategiesQuery();
  const deleteMutation = useDeleteStrategyMutation();
  const [pendingDelete, setPendingDelete] = useState<BacktestStrategy | null>(
    null,
  );

  if (strategiesQuery.isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  const strategies = strategiesQuery.data ?? [];

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await deleteMutation.mutateAsync(pendingDelete.id);
      setPendingDelete(null);
    } catch {
      // Toast handled by mutation onError
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />

      <CreateStrategyForm />

      <Card className="panel">
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
          <div>
            <CardTitle className="section-title">{t("strategiesTitle")}</CardTitle>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              {t("strategiesHint")}
            </p>
          </div>
          <Badge variant="outline" className="rounded-full px-2.5">
            {strategies.length}
          </Badge>
        </CardHeader>
        <CardContent>
          {strategies.length === 0 ? (
            <div className="flex min-h-44 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/70 px-4 py-10 text-center">
              <FlaskConical className="size-5 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">
                {t("emptyStrategiesTitle")}
              </p>
              <p className="max-w-md text-[13px] text-muted-foreground">
                {t("emptyStrategiesHint")}
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {strategies.map((strategy) => (
                <div
                  key={strategy.id}
                  className="group relative rounded-2xl border border-border/55 bg-background/55 p-4 transition-colors hover:border-primary/35 hover:bg-muted/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/backtest/${strategy.id}`}
                      className="min-w-0 flex-1 outline-none"
                    >
                      <p className="truncate text-[0.95rem] font-semibold tracking-[-0.02em] text-foreground">
                        {strategy.name}
                      </p>
                      <p className="mt-1 line-clamp-2 text-[12.5px] text-muted-foreground">
                        {strategy.description || t("noDescription")}
                      </p>
                    </Link>
                    <div className="flex shrink-0 items-start gap-1">
                      <Badge
                        variant="secondary"
                        className="rounded-full px-2.5"
                      >
                        {t("recordsCount", { count: strategy.record_count })}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="rounded-lg text-muted-foreground opacity-70 hover:text-destructive group-hover:opacity-100"
                        aria-label={t("deleteStrategy")}
                        onClick={() => setPendingDelete(strategy)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  <Link
                    href={`/backtest/${strategy.id}`}
                    className="mt-4 block outline-none"
                  >
                    <div className="grid grid-cols-2 gap-2 text-[12.5px]">
                      <div className="rounded-xl border border-border/50 px-2.5 py-2">
                        <p className="text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase rtl:tracking-normal rtl:normal-case">
                          {t("stats.netR")}
                        </p>
                        <p
                          className={`mt-1 font-tabular font-semibold ${pnlTone(strategy.net_r ?? strategy.net_profit)}`}
                        >
                          {formatRDisplay(
                            strategy.net_r ?? strategy.net_profit,
                          )}
                        </p>
                      </div>
                      <div className="rounded-xl border border-border/50 px-2.5 py-2">
                        <p className="text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase rtl:tracking-normal rtl:normal-case">
                          {t("stats.winRate")}
                        </p>
                        <p className="mt-1 font-tabular font-semibold">
                          {strategy.win_rate.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-[11.5px] text-muted-foreground">
                      {t("stats.wl", {
                        wins: strategy.winners,
                        losses: strategy.losers,
                      })}
                    </p>
                    <p className="mt-2 flex items-center justify-end gap-1.5 text-[12px] font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      <span>{t("openStrategy")}</span>
                      <ArrowRight className="size-3.5 rtl:hidden" aria-hidden />
                      <ArrowLeft
                        className="hidden size-3.5 rtl:inline"
                        aria-hidden
                      />
                    </p>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet
        open={pendingDelete != null}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) setPendingDelete(null);
        }}
      >
        <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
          <SheetHeader className="border-b border-border/55">
            <SheetTitle>{t("deleteStrategyTitle")}</SheetTitle>
            <SheetDescription>
              {pendingDelete
                ? t("deleteStrategyHint", {
                    name: pendingDelete.name,
                    count: pendingDelete.record_count,
                  })
                : null}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-3 p-4 text-[13px] text-muted-foreground">
            <p>{t("deleteStrategyWarning")}</p>
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
                ? t("deletingStrategy")
                : t("confirmDeleteStrategy")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
