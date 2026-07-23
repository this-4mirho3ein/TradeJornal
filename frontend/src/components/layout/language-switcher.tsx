"use client";

import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { AppLocale } from "@/i18n/routing";

export function LanguageSwitcher() {
  const t = useTranslations("Common");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(nextLocale: AppLocale) {
    router.replace(pathname, { locale: nextLocale });
  }

  return (
    <div
      className="inline-flex items-center rounded-xl border border-border/70 bg-background/70 p-0.5"
      role="group"
      aria-label={t("language")}
    >
      <Button
        type="button"
        size="xs"
        variant="ghost"
        className={cn(
          "rounded-lg px-2.5",
          locale === "en" && "bg-muted text-foreground",
        )}
        onClick={() => switchLocale("en")}
      >
        EN
      </Button>
      <Button
        type="button"
        size="xs"
        variant="ghost"
        className={cn(
          "rounded-lg px-2.5",
          locale === "fa" && "bg-muted text-foreground",
        )}
        onClick={() => switchLocale("fa")}
      >
        FA
      </Button>
    </div>
  );
}