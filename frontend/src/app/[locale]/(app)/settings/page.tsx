import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { StatusPill } from "@/components/layout/status-pill";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { LaunchGuide } from "@/features/settings/components/launch-guide";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Settings" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function SettingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Settings");
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:5001";

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />

      <LaunchGuide />

      <Card className="panel">
        <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
          <div>
            <CardTitle className="section-title">{t("languageTitle")}</CardTitle>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              {t("languageHint")}
            </p>
          </div>
          <LanguageSwitcher />
        </CardHeader>
      </Card>

      <Card className="panel">
        <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
          <div>
            <CardTitle className="section-title">{t("apiTitle")}</CardTitle>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              {t("apiHint")}
            </p>
          </div>
          <StatusPill label={t("configured")} tone="synced" />
        </CardHeader>
        <CardContent className="space-y-4 text-[13.5px]">
          <div className="rounded-2xl border border-border/55 bg-background/55 px-4 py-3.5">
            <p className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              {t("backendUrl")}
            </p>
            <p className="mt-1.5 font-mono text-[13px] tracking-[-0.02em]">
              {apiUrl}
            </p>
          </div>
          <div className="rounded-2xl border border-border/55 bg-background/55 px-4 py-3.5">
            <p className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              {t("website")}
            </p>
            <p className="mt-1.5 font-mono text-[13px] tracking-[-0.02em]">
              http://localhost:3000/{locale}/dashboard
            </p>
          </div>
          <p className="leading-relaxed text-muted-foreground">
            {t.rich("apiFooter", {
              adapter: () => (
                <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[12px] text-foreground">
                  MT4_ADAPTER=bridge
                </code>
              ),
              ea: () => (
                <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[12px] text-foreground">
                  TradeJournalBridge.mq4
                </code>
              ),
              db: () => (
                <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[12px] text-foreground">
                  backend/data/journal.db
                </code>
              ),
            })}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
