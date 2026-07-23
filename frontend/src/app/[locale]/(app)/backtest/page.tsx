import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { BacktestStrategiesView } from "@/features/backtest/components/backtest-strategies-view";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Backtest" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

function BacktestFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default async function BacktestPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Suspense fallback={<BacktestFallback />}>
      <BacktestStrategiesView />
    </Suspense>
  );
}
