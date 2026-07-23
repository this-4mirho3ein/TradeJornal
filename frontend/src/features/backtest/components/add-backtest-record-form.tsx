"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useCreateRecordMutation } from "@/features/backtest/hooks/use-backtest";
import {
  BACKTEST_CYCLES,
  BACKTEST_SESSIONS,
  BACKTEST_TIMEFRAMES,
  BACKTEST_TRENDS,
  createRecordSchema,
  type CreateRecordFormValues,
} from "@/features/backtest/schemas/backtest";

type Props = {
  strategyId: number;
  /** When true, show a dismiss control (used once records already exist). */
  dismissible?: boolean;
  onDismiss?: () => void;
  onSaved?: () => void;
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-[12px] text-destructive">{message}</p>;
}

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

export function AddBacktestRecordForm({
  strategyId,
  dismissible = false,
  onDismiss,
  onSaved,
}: Props) {
  const t = useTranslations("Backtest");
  const mutation = useCreateRecordMutation(strategyId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const form = useForm<CreateRecordFormValues>({
    resolver: zodResolver(createRecordSchema),
    defaultValues: {
      symbol: "XAUUSD",
      side: "buy",
      r_multiple: "",
      timeframe: "5m",
      session: "london",
      trend: "bullish",
      cycle: "spike",
      open_time: "",
      notes: "",
    },
  });

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

  async function onSubmit(values: CreateRecordFormValues) {
    try {
      await mutation.mutateAsync({
        symbol: values.symbol.trim().toUpperCase(),
        side: values.side,
        r_multiple: values.r_multiple?.trim() || undefined,
        timeframe: values.timeframe,
        session: values.session,
        trend: values.trend,
        cycle: values.cycle,
        open_time: values.open_time,
        notes: values.notes?.trim() || undefined,
        image: imageFile,
      });
      form.reset({
        symbol: "XAUUSD",
        side: "buy",
        r_multiple: "",
        timeframe: values.timeframe || "5m",
        session: values.session,
        trend: values.trend,
        cycle: values.cycle,
        open_time: "",
        notes: "",
      });
      clearImage();
      onSaved?.();
    } catch {
      // Toast handled by mutation onError
    }
  }

  function errorMessage(code?: string) {
    if (!code) return undefined;
    if (code === "tooLong") return t("validation.tooLong");
    return t("validation.required");
  }

  return (
    <Card className="panel">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div className="min-w-0">
          <CardTitle className="section-title">{t("addRecordTitle")}</CardTitle>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            {t("addRecordHint")}
          </p>
        </div>
        {dismissible ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 rounded-lg text-muted-foreground"
            aria-label={t("closeAddRecord")}
            onClick={onDismiss}
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <Field>
              <Label htmlFor="symbol">{t("fields.symbol")}</Label>
              <Input
                id="symbol"
                placeholder="XAUUSD"
                className="h-9 rounded-xl uppercase"
                {...form.register("symbol")}
              />
              <FieldError
                message={errorMessage(form.formState.errors.symbol?.message)}
              />
            </Field>

            <Field>
              <Label>{t("fields.side")}</Label>
              <Select
                value={form.watch("side")}
                onValueChange={(value) =>
                  form.setValue("side", (value as "buy" | "sell") ?? "buy", {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger className="h-9 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buy">{t("side.buy")}</SelectItem>
                  <SelectItem value="sell">{t("side.sell")}</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <Label>{t("fields.timeframe")}</Label>
              <Select
                value={form.watch("timeframe")}
                onValueChange={(value) =>
                  form.setValue(
                    "timeframe",
                    (value as CreateRecordFormValues["timeframe"]) ?? "5m",
                    { shouldValidate: true },
                  )
                }
              >
                <SelectTrigger className="h-9 rounded-xl">
                  <SelectValue placeholder={t("fields.timeframe")} />
                </SelectTrigger>
                <SelectContent>
                  {BACKTEST_TIMEFRAMES.map((timeframe) => (
                    <SelectItem key={timeframe} value={timeframe}>
                      {t(`timeframe.${timeframe}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError
                message={errorMessage(form.formState.errors.timeframe?.message)}
              />
            </Field>

            <Field>
              <Label htmlFor="r_multiple">{t("fields.rMultiple")}</Label>
              <Input
                id="r_multiple"
                placeholder="1.5"
                className="h-9 rounded-xl font-tabular"
                {...form.register("r_multiple")}
              />
            </Field>

            <Field>
              <Label>{t("fields.session")}</Label>
              <Select
                value={form.watch("session")}
                onValueChange={(value) =>
                  form.setValue(
                    "session",
                    (value as CreateRecordFormValues["session"]) ?? "london",
                    { shouldValidate: true },
                  )
                }
              >
                <SelectTrigger className="h-9 rounded-xl">
                  <SelectValue placeholder={t("fields.session")} />
                </SelectTrigger>
                <SelectContent>
                  {BACKTEST_SESSIONS.map((session) => (
                    <SelectItem key={session} value={session}>
                      {t(`session.${session}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError
                message={errorMessage(form.formState.errors.session?.message)}
              />
            </Field>

            <Field>
              <Label>{t("fields.trend")}</Label>
              <Select
                value={form.watch("trend")}
                onValueChange={(value) =>
                  form.setValue(
                    "trend",
                    (value as CreateRecordFormValues["trend"]) ?? "bullish",
                    { shouldValidate: true },
                  )
                }
              >
                <SelectTrigger className="h-9 rounded-xl">
                  <SelectValue placeholder={t("fields.trend")} />
                </SelectTrigger>
                <SelectContent>
                  {BACKTEST_TRENDS.map((trend) => (
                    <SelectItem key={trend} value={trend}>
                      {t(`trend.${trend}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError
                message={errorMessage(form.formState.errors.trend?.message)}
              />
            </Field>

            <Field>
              <Label>{t("fields.cycle")}</Label>
              <Select
                value={form.watch("cycle")}
                onValueChange={(value) =>
                  form.setValue(
                    "cycle",
                    (value as CreateRecordFormValues["cycle"]) ?? "spike",
                    { shouldValidate: true },
                  )
                }
              >
                <SelectTrigger className="h-9 rounded-xl">
                  <SelectValue placeholder={t("fields.cycle")} />
                </SelectTrigger>
                <SelectContent>
                  {BACKTEST_CYCLES.map((cycle) => (
                    <SelectItem key={cycle} value={cycle}>
                      {t(`cycle.${cycle}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError
                message={errorMessage(form.formState.errors.cycle?.message)}
              />
            </Field>

            <Field>
              <Label htmlFor="open_time">{t("fields.openTime")}</Label>
              <Input
                id="open_time"
                type="datetime-local"
                className="h-9 rounded-xl"
                {...form.register("open_time")}
              />
              <FieldError
                message={errorMessage(form.formState.errors.open_time?.message)}
              />
            </Field>
          </div>

          <div className="grid gap-5 md:grid-cols-[1fr_minmax(220px,280px)]">
            <Field>
              <Label htmlFor="notes">{t("fields.notes")}</Label>
              <Textarea
                id="notes"
                placeholder={t("fields.notesPlaceholder")}
                className="min-h-28 rounded-xl"
                {...form.register("notes")}
              />
            </Field>

            <Field>
              <Label>{t("fields.image")}</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="sr-only"
                onChange={(event) => onImageChange(event.target.files)}
              />
              {imagePreview ? (
                <div className="relative overflow-hidden rounded-xl border border-border/60">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt={t("fields.imagePreview")}
                    className="h-36 w-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon-sm"
                    className="absolute top-2 end-2 rounded-lg"
                    onClick={clearImage}
                    aria-label={t("fields.removeImage")}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-36 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-background/50 px-3 text-center transition-colors hover:border-primary/40 hover:bg-muted/40"
                >
                  <ImagePlus className="size-5 text-muted-foreground" />
                  <span className="text-[12.5px] font-medium text-foreground">
                    {t("fields.uploadImage")}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {t("fields.uploadImageHint")}
                  </span>
                </button>
              )}
            </Field>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {dismissible ? (
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={onDismiss}
              >
                {t("cancelEdit")}
              </Button>
            ) : null}
            <Button
              type="submit"
              size="lg"
              className="rounded-xl"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? t("savingRecord") : t("saveRecord")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
