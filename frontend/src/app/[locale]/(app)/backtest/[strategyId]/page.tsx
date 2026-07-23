import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { StrategyRecordsView } from "@/features/backtest/components/strategy-records-view";

type Props = {
  params: Promise<{ locale: string; strategyId: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Backtest" });
  return {
    title: t("recordsMetaTitle"),
    description: t("recordsMetaDescription"),
  };
}

function RecordsFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-80 w-full" />
    </div>
  );
}

export default async function StrategyBacktestPage({ params }: Props) {
  const { locale, strategyId } = await params;
  setRequestLocale(locale);
  const id = Number(strategyId);

  return (
    <Suspense fallback={<RecordsFallback />}>
      <StrategyRecordsView strategyId={Number.isFinite(id) ? id : 0} />
    </Suspense>
  );
}
