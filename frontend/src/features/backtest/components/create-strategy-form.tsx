"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateStrategyMutation } from "@/features/backtest/hooks/use-backtest";
import {
  createStrategySchema,
  type CreateStrategyFormValues,
} from "@/features/backtest/schemas/backtest";

export function CreateStrategyForm() {
  const t = useTranslations("Backtest");
  const router = useRouter();
  const mutation = useCreateStrategyMutation();

  const form = useForm<CreateStrategyFormValues>({
    resolver: zodResolver(createStrategySchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  async function onSubmit(values: CreateStrategyFormValues) {
    try {
      const strategy = await mutation.mutateAsync({
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
      });
      form.reset();
      router.push(`/backtest/${strategy.id}`);
    } catch {
      // Toast handled by mutation onError
    }
  }

  return (
    <Card className="panel">
      <CardHeader className="pb-3">
        <CardTitle className="section-title">{t("createTitle")}</CardTitle>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          {t("createHint")}
        </p>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-3.5 md:grid-cols-[1fr_1.2fr_auto] md:items-end"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <div className="flex flex-col gap-2.5">
            <Label htmlFor="strategy-name">{t("fields.strategyName")}</Label>
            <Input
              id="strategy-name"
              placeholder={t("fields.strategyNamePlaceholder")}
              className="h-9 rounded-xl"
              {...form.register("name")}
            />
            {form.formState.errors.name ? (
              <p className="text-[12px] text-destructive">
                {t("validation.required")}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2.5">
            <Label htmlFor="strategy-description">
              {t("fields.description")}
            </Label>
            <Textarea
              id="strategy-description"
              placeholder={t("fields.descriptionPlaceholder")}
              className="min-h-9 rounded-xl md:min-h-9"
              rows={1}
              {...form.register("description")}
            />
          </div>
          <Button
            type="submit"
            size="lg"
            className="rounded-xl"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? t("creating") : t("createAction")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
