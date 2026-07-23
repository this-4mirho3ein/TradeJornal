"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { useUpdateRecordMutation } from "@/features/backtest/hooks/use-backtest";
import {
  BACKTEST_CYCLES,
  BACKTEST_SESSIONS,
  BACKTEST_TIMEFRAMES,
  BACKTEST_TRENDS,
  createRecordSchema,
  type CreateRecordFormValues,
} from "@/features/backtest/schemas/backtest";
import { resolveApiAssetUrl } from "@/lib/api/client";
import type { BacktestRecord } from "@/types/api";

type Props = {
  strategyId: number;
  record: BacktestRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

function toDatetimeLocalValue(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function EditBacktestRecordSheet({
  strategyId,
  record,
  open,
  onOpenChange,
}: Props) {
  const t = useTranslations("Backtest");
  const mutation = useUpdateRecordMutation(strategyId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);

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

  useEffect(() => {
    if (!record || !open) return;

    form.reset({
      symbol: record.symbol,
      side: record.side === "sell" ? "sell" : "buy",
      r_multiple: record.r_multiple ?? "",
      timeframe: (BACKTEST_TIMEFRAMES as readonly string[]).includes(
        record.timeframe,
      )
        ? (record.timeframe as CreateRecordFormValues["timeframe"])
        : "5m",
      session: (BACKTEST_SESSIONS as readonly string[]).includes(record.session)
        ? (record.session as CreateRecordFormValues["session"])
        : "london",
      trend: (BACKTEST_TRENDS as readonly string[]).includes(record.trend)
        ? (record.trend as CreateRecordFormValues["trend"])
        : "bullish",
      cycle: (BACKTEST_CYCLES as readonly string[]).includes(record.cycle)
        ? (record.cycle as CreateRecordFormValues["cycle"])
        : "spike",
      open_time: toDatetimeLocalValue(record.open_time),
      notes: record.notes ?? "",
    });

    setImageFile(null);
    setRemoveExistingImage(false);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when opening a record
  }, [record?.id, open]);

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
      ? resolveApiAssetUrl(record?.image_url)
      : null;
  const previewUrl = imagePreview ?? existingImageUrl;

  async function onSubmit(values: CreateRecordFormValues) {
    if (!record) return;
    try {
      await mutation.mutateAsync({
        recordId: record.id,
        input: {
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
          remove_image: removeExistingImage && !imageFile,
        },
      });
      onOpenChange(false);
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto sm:max-w-lg"
      >
        <SheetHeader className="border-b border-border/55">
          <SheetTitle>{t("editRecordTitle")}</SheetTitle>
          <SheetDescription>{t("editRecordHint")}</SheetDescription>
        </SheetHeader>

        <form
          className="flex flex-1 flex-col"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <div className="space-y-4 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <Label htmlFor="edit-symbol">{t("fields.symbol")}</Label>
                <Input
                  id="edit-symbol"
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
                    form.setValue("side", value as "buy" | "sell", {
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
                <Label htmlFor="edit-r">{t("fields.rMultiple")}</Label>
                <Input
                  id="edit-r"
                  className="h-9 rounded-xl font-tabular"
                  placeholder="1.5"
                  {...form.register("r_multiple")}
                />
              </Field>

              <Field>
                <Label>{t("fields.timeframe")}</Label>
                <Select
                  value={form.watch("timeframe")}
                  onValueChange={(value) =>
                    form.setValue(
                      "timeframe",
                      value as CreateRecordFormValues["timeframe"],
                      { shouldValidate: true },
                    )
                  }
                >
                  <SelectTrigger className="h-9 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BACKTEST_TIMEFRAMES.map((tf) => (
                      <SelectItem key={tf} value={tf}>
                        {t(`timeframe.${tf}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <Label>{t("fields.session")}</Label>
                <Select
                  value={form.watch("session")}
                  onValueChange={(value) =>
                    form.setValue(
                      "session",
                      value as CreateRecordFormValues["session"],
                      { shouldValidate: true },
                    )
                  }
                >
                  <SelectTrigger className="h-9 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BACKTEST_SESSIONS.map((session) => (
                      <SelectItem key={session} value={session}>
                        {t(`session.${session}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <Label>{t("fields.trend")}</Label>
                <Select
                  value={form.watch("trend")}
                  onValueChange={(value) =>
                    form.setValue(
                      "trend",
                      value as CreateRecordFormValues["trend"],
                      { shouldValidate: true },
                    )
                  }
                >
                  <SelectTrigger className="h-9 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BACKTEST_TRENDS.map((trend) => (
                      <SelectItem key={trend} value={trend}>
                        {t(`trend.${trend}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <Label>{t("fields.cycle")}</Label>
                <Select
                  value={form.watch("cycle")}
                  onValueChange={(value) =>
                    form.setValue(
                      "cycle",
                      value as CreateRecordFormValues["cycle"],
                      { shouldValidate: true },
                    )
                  }
                >
                  <SelectTrigger className="h-9 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BACKTEST_CYCLES.map((cycle) => (
                      <SelectItem key={cycle} value={cycle}>
                        {t(`cycle.${cycle}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <Label htmlFor="edit-open-time">{t("fields.openTime")}</Label>
                <Input
                  id="edit-open-time"
                  type="datetime-local"
                  className="h-9 rounded-xl"
                  {...form.register("open_time")}
                />
                <FieldError
                  message={errorMessage(
                    form.formState.errors.open_time?.message,
                  )}
                />
              </Field>
            </div>

            <Field>
              <Label htmlFor="edit-notes">{t("fields.notes")}</Label>
              <Textarea
                id="edit-notes"
                rows={3}
                className="rounded-xl"
                placeholder={t("fields.notesPlaceholder")}
                {...form.register("notes")}
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
              {t("cancelEdit")}
            </Button>
            <Button
              type="submit"
              className="rounded-xl"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? t("savingRecord") : t("saveChanges")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
