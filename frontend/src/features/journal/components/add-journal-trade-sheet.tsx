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
import { useCreateManualTradeMutation } from "@/features/journal/hooks/use-journal";
import {
  BACKTEST_CYCLES,
  BACKTEST_SESSIONS,
  BACKTEST_TIMEFRAMES,
  BACKTEST_TRENDS,
} from "@/features/backtest/schemas/backtest";

type Props = {
  accountNumber: number;
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

function nowLocalValue() {
  const date = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function AddJournalTradeSheet({
  accountNumber,
  open,
  onOpenChange,
}: Props) {
  const t = useTranslations("Journal");
  const tb = useTranslations("Backtest");
  const mutation = useCreateManualTradeMutation(accountNumber);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [symbol, setSymbol] = useState("XAUUSD");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [volume, setVolume] = useState("0.01");
  const [openPrice, setOpenPrice] = useState("");
  const [closePrice, setClosePrice] = useState("");
  const [profit, setProfit] = useState("");
  const [openTime, setOpenTime] = useState("");
  const [closeTime, setCloseTime] = useState("");
  const [notes, setNotes] = useState("");
  const [rMultiple, setRMultiple] = useState("");
  const [timeframe, setTimeframe] = useState("5m");
  const [session, setSession] = useState(UNSET);
  const [trend, setTrend] = useState(UNSET);
  const [cycle, setCycle] = useState(UNSET);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const stamp = nowLocalValue();
    setSymbol("XAUUSD");
    setSide("buy");
    setVolume("0.01");
    setOpenPrice("");
    setClosePrice("");
    setProfit("");
    setOpenTime(stamp);
    setCloseTime(stamp);
    setNotes("");
    setRMultiple("");
    setTimeframe("5m");
    setSession(UNSET);
    setTrend(UNSET);
    setCycle(UNSET);
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function clearImage() {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function onImageChange(fileList: FileList | null) {
    const file = fileList?.[0] ?? null;
    if (!file) {
      clearImage();
      return;
    }
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    try {
      await mutation.mutateAsync({
        symbol: symbol.trim().toUpperCase(),
        side,
        volume: volume.trim() || undefined,
        open_price: openPrice.trim() || undefined,
        close_price: closePrice.trim() || undefined,
        profit: profit.trim() || undefined,
        open_time: openTime,
        close_time: closeTime || openTime,
        notes: notes.trim() || undefined,
        r_multiple: rMultiple.trim() || undefined,
        timeframe: timeframe === UNSET ? undefined : timeframe,
        session: session === UNSET ? undefined : session,
        trend: trend === UNSET ? undefined : trend,
        cycle: cycle === UNSET ? undefined : cycle,
        image: imageFile,
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
          <SheetTitle>{t("addManualTitle")}</SheetTitle>
          <SheetDescription>{t("addManualHint")}</SheetDescription>
        </SheetHeader>

        <form className="flex flex-1 flex-col" onSubmit={onSubmit}>
          <div className="space-y-4 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <Label htmlFor="manual-symbol">{t("fields.symbol")}</Label>
                <Input
                  id="manual-symbol"
                  value={symbol}
                  onChange={(event) => setSymbol(event.target.value)}
                  className="h-9 rounded-xl uppercase"
                  required
                />
              </Field>

              <Field>
                <Label>{t("fields.side")}</Label>
                <Select
                  value={side}
                  onValueChange={(value) =>
                    setSide(value === "sell" ? "sell" : "buy")
                  }
                >
                  <SelectTrigger className="h-9 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buy">{t("buy")}</SelectItem>
                    <SelectItem value="sell">{t("sell")}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <Label htmlFor="manual-volume">{t("fields.volume")}</Label>
                <Input
                  id="manual-volume"
                  value={volume}
                  onChange={(event) => setVolume(event.target.value)}
                  className="h-9 rounded-xl font-tabular"
                  placeholder="0.01"
                />
              </Field>

              <Field>
                <Label htmlFor="manual-r">{t("fields.rMultiple")}</Label>
                <Input
                  id="manual-r"
                  value={rMultiple}
                  onChange={(event) => setRMultiple(event.target.value)}
                  className="h-9 rounded-xl font-tabular"
                  placeholder="1.5"
                />
              </Field>

              <Field>
                <Label htmlFor="manual-open-price">{t("fields.openPrice")}</Label>
                <Input
                  id="manual-open-price"
                  value={openPrice}
                  onChange={(event) => setOpenPrice(event.target.value)}
                  className="h-9 rounded-xl font-tabular"
                  placeholder="0"
                />
              </Field>

              <Field>
                <Label htmlFor="manual-close-price">{t("fields.closePrice")}</Label>
                <Input
                  id="manual-close-price"
                  value={closePrice}
                  onChange={(event) => setClosePrice(event.target.value)}
                  className="h-9 rounded-xl font-tabular"
                  placeholder="0"
                />
              </Field>

              <Field>
                <Label htmlFor="manual-profit">{t("fields.profit")}</Label>
                <Input
                  id="manual-profit"
                  value={profit}
                  onChange={(event) => setProfit(event.target.value)}
                  className="h-9 rounded-xl font-tabular"
                  placeholder="0"
                />
              </Field>

              <Field>
                <Label>{t("fields.timeframe")}</Label>
                <Select
                  value={timeframe}
                  onValueChange={(value) => setTimeframe(value ?? "5m")}
                >
                  <SelectTrigger className="h-9 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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
                    <SelectValue />
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
                    <SelectValue />
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

              <Field>
                <Label>{t("fields.cycle")}</Label>
                <Select
                  value={cycle}
                  onValueChange={(value) => setCycle(value ?? UNSET)}
                >
                  <SelectTrigger className="h-9 rounded-xl">
                    <SelectValue />
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

              <Field>
                <Label htmlFor="manual-open-time">{t("fields.openTime")}</Label>
                <Input
                  id="manual-open-time"
                  type="datetime-local"
                  value={openTime}
                  onChange={(event) => setOpenTime(event.target.value)}
                  className="h-9 rounded-xl"
                  required
                />
              </Field>

              <Field>
                <Label htmlFor="manual-close-time">{t("fields.closeTime")}</Label>
                <Input
                  id="manual-close-time"
                  type="datetime-local"
                  value={closeTime}
                  onChange={(event) => setCloseTime(event.target.value)}
                  className="h-9 rounded-xl"
                />
              </Field>
            </div>

            <Field>
              <Label htmlFor="manual-notes">{t("fields.notes")}</Label>
              <Textarea
                id="manual-notes"
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder={t("fields.notesPlaceholder")}
                className="rounded-xl"
              />
            </Field>

            <Field>
              <Label>{t("fields.image")}</Label>
              <div className="flex items-start gap-3">
                {imagePreview ? (
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-xl border border-border/55 bg-muted/30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreview}
                      alt={t("fields.imagePreview")}
                      className="size-full object-cover"
                    />
                    <button
                      type="button"
                      className="absolute end-1 top-1 rounded-md bg-background/90 p-1 text-muted-foreground shadow-sm hover:text-destructive"
                      aria-label={t("fields.removeImage")}
                      onClick={clearImage}
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
              {mutation.isPending ? t("saving") : t("saveManual")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
