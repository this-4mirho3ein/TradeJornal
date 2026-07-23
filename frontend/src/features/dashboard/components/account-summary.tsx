"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/layout/status-pill";
import { displayAccountName } from "@/lib/account-display";
import { computeFloatingPnL } from "@/lib/analytics";
import { formatDateTime, formatMoney } from "@/lib/format";
import type { Mt4AccountInfo, TradingAccount } from "@/types/api";

type AccountSummaryProps = {
  live?: Mt4AccountInfo | null;
  stored?: TradingAccount | null;
};

export function AccountSummary({ live, stored }: AccountSummaryProps) {
  const t = useTranslations("Dashboard.account");

  const account = live
    ? {
        login: live.login,
        name: live.name,
        server: live.server,
        broker: live.company,
        currency: live.currency,
        leverage: live.leverage,
        syncedAt: live.synced_at,
        source: "live" as const,
      }
    : stored
      ? {
          login: stored.account_number,
          name: stored.name,
          server: stored.server,
          broker: stored.broker,
          currency: stored.currency,
          leverage: stored.leverage,
          syncedAt: stored.last_synced_at,
          source: "database" as const,
        }
      : null;

  if (!account) {
    return (
      <Card className="panel border-dashed">
        <CardContent className="flex min-h-40 flex-col items-center justify-center gap-2 p-8 text-center">
          <p className="text-sm font-medium text-foreground">
            {t("emptyTitle")}
          </p>
          <p className="max-w-sm text-[13px] leading-relaxed text-muted-foreground">
            {t("emptyHint")}
          </p>
        </CardContent>
      </Card>
    );
  }

  const floating = computeFloatingPnL({
    balance: live?.balance ?? stored?.balance,
    equity: live?.equity ?? stored?.equity,
    credit: live?.credit,
    profit: live?.profit ?? stored?.profit,
  });
  const title = displayAccountName(account.name, account.login);

  return (
    <Card className="panel relative overflow-hidden">
      <div className="terminal-grid pointer-events-none absolute inset-0 opacity-50" />
      <CardHeader className="relative flex flex-row items-start justify-between gap-4 pb-4">
        <div className="min-w-0 space-y-2">
          <p className="eyebrow">{t("eyebrow")}</p>
          <CardTitle className="truncate text-[1.25rem] font-semibold tracking-[-0.03em] md:text-[1.35rem]">
            {title}
          </CardTitle>
          <p className="text-[13.5px] text-muted-foreground">
            <span className="font-medium text-foreground/80">
              {account.broker || "Broker"}
            </span>
            <span className="mx-2 text-border">·</span>
            <span className="font-tabular">{account.server || "Server"}</span>
          </p>
        </div>
        <StatusPill
          label={account.source === "live" ? t("live") : t("synced")}
          tone={account.source === "live" ? "live" : "synced"}
        />
      </CardHeader>
      <CardContent className="relative grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Info label={t("login")} value={String(account.login)} mono />
        <Info label={t("currency")} value={account.currency} />
        <Info label={t("leverage")} value={`1:${account.leverage}`} mono />
        <Info label={t("lastUpdate")} value={formatDateTime(account.syncedAt)} />
        <Info
          label={t("floating")}
          value={formatMoney(floating, account.currency)}
          mono
          className={
            floating > 0 ? "text-profit" : floating < 0 ? "text-loss" : undefined
          }
        />
      </CardContent>
    </Card>
  );
}

function Info({
  label,
  value,
  className,
  mono = false,
}: {
  label: string;
  value: string;
  className?: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/55 bg-background/55 px-3 py-2.5">
      <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase rtl:tracking-normal rtl:normal-case">
        {label}
      </p>
      <p
        className={`mt-1 text-[12.5px] font-medium tracking-[-0.015em] ${
          mono ? "font-tabular" : ""
        } ${className ?? ""}`}
      >
        {value}
      </p>
    </div>
  );
}
