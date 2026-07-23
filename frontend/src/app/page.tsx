import { redirect } from "next/navigation";
import { routing } from "@/i18n/routing";

/** Fallback for `/` — middleware normally redirects, this is a safety net. */
export default function RootPage() {
  redirect(`/${routing.defaultLocale}/dashboard`);
}