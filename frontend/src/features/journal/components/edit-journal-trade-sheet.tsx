"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useUpdateTradeEnrichmentMutation } from "@/features/journal/hooks/use-journal";
import {
  BACKTEST_CYCLES,
  BACKTEST_SESSIONS,
  BACKTEST_TIMEFRAMES,
  BACKTEST_TRENDS,
} from "@/features/backtest/schemas/backtest";
import { resolveApiAssetUrl } from "@/lib/api/client";
import {
  formatDateTime,
  formatPnL,
  pnlTone,
} from "@/lib/format";
import type { ClosedTrade } from "@/types/api";

type Props = {
  accountNumber: number;
  currency: string;
  trade: ClosedTrade | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const UNSET = "__unset__";

function Field({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-2.5 ${className ?? ""}`}>{children}</div>
  );
}

export function EditJournalTradeSheet({
  accountNumber,
  currency,
  trade,
  open,
  onOpenChange,
}: Props) {
  const t = useTranslations("Journal");
  const tb = useTranslations("Backtest");
  const mutation = useUpdateTradeEnrichmentMutation(accountNumber);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [notes, setNotes] = useState("");
  const [rMultiple, setRMultiple] = useState("");
  const [timeframe, setTimeframe] = useState(UNSET);
  const [session, setSession] = useState(UNSET);
  const [trend, setTrend] = useState(UNSET);
  const [cycle, setCycle] = useState(UNSET);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);

  useEffect(() => {
    if (!trade || !open) return;
    setNotes(trade.notes ?? "");
    setRMultiple(trade.r_multiple ?? "");
    setTimeframe(trade.timeframe || UNSET);
    setSession(trade.session || UNSET);
    setTrend(trade.trend || UNSET);
    setCycle(trade.cycle || UNSET);
    setImageFile(null);
    setRemoveExistingImage(false);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when opening a trade
  }, [trade?.id, open]);

  function clearNewImage() {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function onImageChange(fileList: FileList | null) {
    const file = fileList?.[0] ?? null;
    if (!file) {
      clearNewImage();
      return;
    }
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setRemoveExistingImage(false);
  }

  const existingImageUrl =
    !removeExistingImage && !imagePreview
      ? resolveApiAssetUrl(trade?.image_url)
      : null;
  const previewUrl = imagePreview ?? existingImageUrl;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!trade) return;
    try {
      await mutation.mutateAsync({
        tradeId: trade.id,
        input: {
          notes: notes.trim(),
          r_multiple: rMultiple.trim(),
          timeframe: timeframe === UNSET ? "" : timeframe,
          session: session === UNSET ? "" : session,
          trend: trend === UNSET ? "" : trend,
          cycle: cycle === UNSET ? "" : cycle,
          image: imageFile,
          remove_image: removeExistingImage && !imageFile,
        },
      });
      onOpenChange(false);
    } catch {
      // Toast handled by mutation onError
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto sm:max-w-lg"
      >
        <SheetHeader className="border-b border-border/55">
          <SheetTitle>{t("enrichmentTitle")}</SheetTitle>
          <SheetDescription>
            {trade
              ? t("enrichmentHint", {
                  ticket: trade.ticket,
                  symbol: trade.symbol,
                })
              : null}
          </SheetDescription>
        </SheetHeader>

        {trade ? (
          <form className="flex flex-1 flex-col" onSubmit={onSubmit}>
            <div className="space-y-4 p-4">
              <div className="rounded-2xl border border-border/55 bg-muted/20 px-3.5 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-[13px] font-semibold tracking-[-0.02em]">
                    #{trade.ticket} · {trade.symbol}
                  </p>
                  <p
                    className={`font-tabular text-[13px] font-semibold ${pnlTone(trade.profit)}`}
                  >
                    {formatPnL(trade.profit, currency)}
                  </p>
                </div>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {trade.type.toUpperCase()} · {formatDateTime(trade.close_time)}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <Label htmlFor="journal-r">{t("fields.rMultiple")}</Label>
                  <Input
                    id="journal-r"
                    value={rMultiple}
                    onChange={(event) => setRMultiple(event.target.value)}
                    placeholder="1.5"
                    className="h-9 rounded-xl font-tabular"
                  />
                </Field>

                <Field>
                  <Label>{t("fields.timeframe")}</Label>
                  <Select
                    value={timeframe}
                    onValueChange={(value) => setTimeframe(value ?? UNSET)}
                  >
                    <SelectTrigger className="h-9 rounded-xl">
                      <SelectValue placeholder={t("fields.timeframe")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNSET}>{t("unset")}</SelectItem>
                      {BACKTEST_TIMEFRAMES.map((tf) => (
                        <SelectItem key={tf} value={tf}>
                          {tb(`timeframe.${tf}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <Label>{t("fields.session")}</Label>
                  <Select
                    value={session}
                    onValueChange={(value) => setSession(value ?? UNSET)}
                  >
                    <SelectTrigger className="h-9 rounded-xl">
                      <SelectValue placeholder={t("fields.session")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNSET}>{t("unset")}</SelectItem>
                      {BACKTEST_SESSIONS.map((value) => (
                        <SelectItem key={value} value={value}>
                          {tb(`session.${value}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <Label>{t("fields.trend")}</Label>
                  <Select
                    value={trend}
                    onValueChange={(value) => setTrend(value ?? UNSET)}
                  >
                    <SelectTrigger className="h-9 rounded-xl">
                      <SelectValue placeholder={t("fields.trend")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNSET}>{t("unset")}</SelectItem>
                      {BACKTEST_TRENDS.map((value) => (
                        <SelectItem key={value} value={value}>
                          {tb(`trend.${value}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field className="sm:col-span-2">
                  <Label>{t("fields.cycle")}</Label>
                  <Select
                    value={cycle}
                    onValueChange={(value) => setCycle(value ?? UNSET)}
                  >
                    <SelectTrigger className="h-9 rounded-xl">
                      <SelectValue placeholder={t("fields.cycle")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNSET}>{t("unset")}</SelectItem>
                      {BACKTEST_CYCLES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {tb(`cycle.${value}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field>
                <Label htmlFor="journal-notes">{t("fields.notes")}</Label>
                <Textarea
                  id="journal-notes"
                  rows={4}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder={t("fields.notesPlaceholder")}
                  className="rounded-xl"
                />
              </Field>

              <Field>
                <Label>{t("fields.image")}</Label>
                <div className="flex items-start gap-3">
                  {previewUrl ? (
                    <div className="relative size-20 shrink-0 overflow-hidden rounded-xl border border-border/55 bg-muted/30">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewUrl}
                        alt={t("fields.imagePreview")}
                        className="size-full object-cover"
                      />
                      <button
                        type="button"
                        className="absolute end-1 top-1 rounded-md bg-background/90 p-1 text-muted-foreground shadow-sm hover:text-destructive"
                        aria-label={t("fields.removeImage")}
                        onClick={() => {
                          clearNewImage();
                          setRemoveExistingImage(true);
                        }}
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ) : null}
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 justify-start rounded-xl"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImagePlus className="size-4" />
                      {t("fields.uploadImage")}
                    </Button>
                    <p className="text-[12px] text-muted-foreground">
                      {t("fields.uploadImageHint")}
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={(event) => onImageChange(event.target.files)}
                    />
                  </div>
                </div>
              </Field>
            </div>

            <SheetFooter className="border-t border-border/55 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => onOpenChange(false)}
              >
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                className="rounded-xl"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? t("saving") : t("saveEnrichment")}
              </Button>
            </SheetFooter>
          </form>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
