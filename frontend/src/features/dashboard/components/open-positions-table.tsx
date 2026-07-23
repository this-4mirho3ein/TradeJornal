"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatDateTime,
  formatMoney,
  formatPnL,
  formatPrice,
  pnlTone,
} from "@/lib/format";
import type { Mt4Position } from "@/types/api";

type OpenPositionsTableProps = {
  positions: Mt4Position[];
  currency?: string;
};

export function OpenPositionsTable({
  positions,
  currency = "USD",
}: OpenPositionsTableProps) {
  const t = useTranslations("Dashboard");

  return (
    <Card className="panel min-w-0">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle className="section-title">{t("positions.title")}</CardTitle>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            {t("positions.hint")}
          </p>
        </div>
        <Badge variant="outline" className="rounded-full px-2.5">
          {t("positions.openCount", { count: positions.length })}
        </Badge>
      </CardHeader>
      <CardContent>
        {positions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 px-4 py-12 text-center">
            <p className="text-sm font-medium text-foreground">
              {t("positions.flatTitle")}
            </p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {t("positions.flatHint")}
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
                    {t("table.open")}
                  </TableHead>
                  <TableHead className="table-col-header">
                    {t("table.current")}
                  </TableHead>
                  <TableHead className="table-col-header">
                    {t("table.slTp")}
                  </TableHead>
                  <TableHead className="table-col-header-end">
                    {t("table.profit")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((position) => (
                  <TableRow key={position.ticket}>
                    <TableCell className="font-tabular text-[13px]">
                      #{position.ticket}
                    </TableCell>
                    <TableCell className="text-[13.5px] font-semibold tracking-[-0.02em]">
                      {position.symbol}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          position.side === "buy"
                            ? "rounded-md bg-profit/10 px-1.5 text-[10px] tracking-[0.06em] text-profit"
                            : "rounded-md bg-loss/10 px-1.5 text-[10px] tracking-[0.06em] text-loss"
                        }
                      >
                        {position.side.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-tabular text-[13px]">
                      {position.volume}
                    </TableCell>
                    <TableCell className="font-tabular text-[13px]">
                      {formatPrice(position.open_price)}
                    </TableCell>
                    <TableCell className="font-tabular text-[13px]">
                      {formatPrice(position.current_price)}
                    </TableCell>
                    <TableCell className="font-tabular text-[12px] text-muted-foreground">
                      {formatPrice(position.stop_loss)} /{" "}
                      {formatPrice(position.take_profit)}
                    </TableCell>
                    <TableCell
                      className={`text-end font-tabular text-[13.5px] font-semibold ${pnlTone(position.profit)}`}
                    >
                      {formatPnL(position.profit, currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <p className="mt-3 text-[12px] text-muted-foreground">
          {t("positions.timesUtc")}
          {positions[0]
            ? t("positions.oldestOpen", {
                time: formatDateTime(positions[0].open_time),
              })
            : ""}
        </p>
        <p className="sr-only">
          Total floating{" "}
          {formatMoney(
            positions.reduce((sum, item) => sum + Number(item.profit), 0),
            currency,
          )}
        </p>
      </CardContent>
    </Card>
  );
}
