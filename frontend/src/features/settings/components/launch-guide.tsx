"use client";

import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyableCommand } from "@/features/settings/components/copyable-command";

type SectionKey = "windows" | "backend" | "frontend" | "browser";

const SECTION_META: Array<{
  key: SectionKey;
  order: number;
  stepCount: number;
  commands?: Partial<Record<number, string>>;
}> = [
  {
    key: "windows",
    order: 1,
    stepCount: 5,
    commands: {
      4: 'cd "\\\\Mac\\Home\\Desktop\\jornal-main\\backend\\mt4_ea"\npowershell -ExecutionPolicy Bypass -File .\\copy_bridge_to_mac.ps1',
    },
  },
  {
    key: "backend",
    order: 2,
    stepCount: 3,
    commands: {
      1: "cd ~/Desktop/jornal-main/backend\nsource .venv/bin/activate\npython run.py",
      3: "cd ~/Desktop/jornal-main/backend\nsource .venv/bin/activate\npython scripts/verify_journal_db.py",
    },
  },
  {
    key: "frontend",
    order: 3,
    stepCount: 2,
    commands: {
      1: "cd ~/Desktop/jornal-main/frontend\nnpm run dev",
    },
  },
  {
    key: "browser",
    order: 4,
    stepCount: 3,
  },
];

export function LaunchGuide() {
  const t = useTranslations("Settings.launch");
  const locale = useLocale();

  return (
    <Card className="panel">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="section-title">{t("title")}</CardTitle>
            <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-muted-foreground">
              {t("intro")}
            </p>
          </div>
          <Badge variant="outline" className="rounded-full px-2.5">
            {t("eachLaunch")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl border border-border/55 bg-muted/30 px-4 py-3 text-[12.5px] leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">
            {t("orderMatters")}
          </span>{" "}
          {t("orderCopy")}
        </div>

        <div className="grid gap-3.5">
          {SECTION_META.map((section) => {
            const machine = t(`sections.${section.key}.machine`);
            const title = t(`sections.${section.key}.title`);
            const summary = t(`sections.${section.key}.summary`);

            return (
              <section
                key={section.key}
                className="rounded-2xl border border-border/55 bg-background/45 p-4 md:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                      {t("stepLabel", { order: section.order, machine })}
                    </p>
                    <h3 className="text-[0.95rem] font-semibold tracking-[-0.02em] text-foreground">
                      {title}
                    </h3>
                    <p className="text-[12.5px] text-muted-foreground">
                      {summary}
                    </p>
                  </div>
                  <Badge variant="secondary" className="rounded-full px-2.5">
                    {machine}
                  </Badge>
                </div>

                <ol className="mt-4 space-y-3">
                  {Array.from({ length: section.stepCount }, (_, index) => {
                    const step = index + 1;
                    const stepTitle = t(
                      `sections.${section.key}.steps.${step}.title`,
                    );
                    const detailKey = `sections.${section.key}.steps.${step}.detail`;
                    const hasDetail = t.has(detailKey);
                    const detail =
                      section.key === "frontend" && step === 2
                        ? `http://localhost:3000/${locale}/dashboard`
                        : hasDetail
                          ? t(detailKey)
                          : undefined;
                    const command = section.commands?.[step];

                    return (
                      <li key={`${section.key}-${step}`} className="flex gap-3">
                        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-border/60 bg-card text-[11px] font-semibold text-muted-foreground">
                          {step}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13.5px] font-medium tracking-[-0.01em] text-foreground">
                            {stepTitle}
                          </p>
                          {detail ? (
                            <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
                              {detail}
                            </p>
                          ) : null}
                          {command ? (
                            <CopyableCommand command={command} />
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>
            );
          })}
        </div>

        <div className="rounded-2xl border border-dashed border-border/70 px-4 py-3.5 text-[12.5px] leading-relaxed text-muted-foreground">
          <p className="font-semibold text-foreground">
            {t("keepRunningTitle")}
          </p>
          <p className="mt-1">{t("keepRunningCopy")}</p>
        </div>
      </CardContent>
    </Card>
  );
}
