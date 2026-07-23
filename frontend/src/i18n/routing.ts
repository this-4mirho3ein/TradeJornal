import { defineRouting } from "next-intl/routing";

export const locales = ["en", "fa"] as const;
export type AppLocale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "en",
  localePrefix: "always",
  localeDetection: true,
});

export function isRtlLocale(locale: string): boolean {
  return locale === "fa";
}