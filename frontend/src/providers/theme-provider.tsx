import type { ReactNode } from "react";
import { ThemeProvider as WrkszThemeProvider } from "@wrksz/themes/next";

type Props = {
  children: ReactNode;
};

/** Server ThemeProvider — uses useServerInsertedHTML (React 19 safe). */
export function ThemeProvider({ children }: Props) {
  return (
    <WrkszThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </WrkszThemeProvider>
  );
}
