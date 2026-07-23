"use client";

import { useTranslations } from "next-intl";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toNumber, formatMoney } from "@/lib/format";
import type { ClosedTrade, Mt4ClosedTrade } from "@/types/api";

type EquityCurveChartProps = {
  trades: Array<ClosedTrade | Mt4ClosedTrade>;
  currency?: string;
};

export function EquityCurveChart({
  trades,
  currency = "USD",
}: EquityCurveChartProps) {
  const t = useTranslations("Dashboard.equityCurve");

  const sorted = [...trades].sort((a, b) =>
    a.close_time.localeCompare(b.close_time),
  );

  let running = 0;
  const data = sorted.map((trade, index) => {
    running += toNumber(trade.profit);
    return {
      index: index + 1,
      label: trade.symbol,
      equity: Number(running.toFixed(2)),
      profit: toNumber(trade.profit),
    };
  });

  return (
    <Card className="panel">
      <CardHeader className="pb-3">
        <CardTitle className="section-title">{t("title")}</CardTitle>
        <p className="mt-1 text-[12.5px] text-muted-foreground">{t("hint")}</p>
      </CardHeader>
      <CardContent className="h-72">
        {data.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 text-center">
            <p className="text-sm font-medium text-foreground">
              {t("emptyTitle")}
            </p>
            <p className="mt-1 max-w-xs text-[13px] text-muted-foreground">
              {t("emptyHint")}
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--primary)"
                    stopOpacity={0.35}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--primary)"
                    stopOpacity={0.02}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" />
              <XAxis
                dataKey="index"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                width={56}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                }}
                formatter={(value) => [
                  formatMoney(Number(value ?? 0), currency),
                  t("title"),
                ]}
                labelFormatter={(label, payload) =>
                  payload?.[0]?.payload?.label
                    ? `Trade #${label} · ${payload[0].payload.label}`
                    : `Trade #${label}`
                }
              />
              <Area
                type="monotone"
                dataKey="equity"
                stroke="var(--primary)"
                fill="url(#equityFill)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
