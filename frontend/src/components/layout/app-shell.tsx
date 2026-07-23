"use client";

import {
  BookOpenText,
  LayoutDashboard,
  Menu,
  Activity,
  Settings2,
  FlaskConical,
  ChevronsLeft,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Link, usePathname } from "@/i18n/navigation";
import { isRtlLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";

type NavItem = {
  href: "/dashboard" | "/journal" | "/backtest" | "/settings";
  label: string;
  description: string;
  icon: LucideIcon;
};

function BrandLink({
  brand,
  brandTag,
  collapsed = false,
}: {
  brand: string;
  brandTag: string;
  collapsed?: boolean;
}) {
  return (
    <Link
      href="/dashboard"
      className={cn(
        "group flex items-center gap-3",
        collapsed && "justify-center gap-0",
      )}
      aria-label={brand}
    >
      <span className="relative flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_10px_30px_-12px] shadow-primary/50">
        <Activity className="size-4 transition-transform duration-300 group-hover:scale-110" />
      </span>
      {!collapsed ? (
        <span className="min-w-0">
          <span className="block text-[0.95rem] font-semibold tracking-[-0.03em]">
            {brand}
          </span>
          <span className="block text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
            {brandTag}
          </span>
        </span>
      ) : null}
    </Link>
  );
}

function NavLinks({
  items,
  pathname,
  onNavigate,
  collapsed = false,
  tooltipSide,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
  collapsed?: boolean;
  tooltipSide: "left" | "right";
}) {
  return (
    <nav className="flex flex-col gap-1.5">
      {items.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        const link = (
          <Link
            href={item.href}
            onClick={onNavigate}
            aria-label={collapsed ? item.label : undefined}
            className={cn(
              "group flex items-start gap-3 rounded-2xl px-3 py-2.5 transition-all duration-200",
              collapsed && "items-center justify-center gap-0 px-2",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl border transition-colors",
                collapsed && "mt-0",
                active
                  ? "border-primary/20 bg-primary/10 text-primary"
                  : "border-transparent bg-background/50 text-muted-foreground group-hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
            </span>
            {!collapsed ? (
              <span className="min-w-0">
                <span className="block text-[0.92rem] font-semibold tracking-[-0.02em]">
                  {item.label}
                </span>
                <span
                  className={cn(
                    "block text-[11px] tracking-[0.01em]",
                    active
                      ? "text-sidebar-accent-foreground/70"
                      : "text-muted-foreground",
                  )}
                >
                  {item.description}
                </span>
              </span>
            ) : null}
          </Link>
        );

        if (!collapsed) {
          return <div key={item.href}>{link}</div>;
        }

        return (
          <Tooltip key={item.href}>
            <TooltipTrigger render={link} />
            <TooltipContent side={tooltipSide} sideOffset={10}>
              <span className="font-medium">{item.label}</span>
              <span className="block text-[10px] opacity-70">
                {item.description}
              </span>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );
}

function SidebarCollapseButton({
  collapsed,
  rtl,
  label,
  onToggle,
}: {
  collapsed: boolean;
  rtl: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size={collapsed ? "icon-sm" : "sm"}
            aria-label={label}
            aria-expanded={!collapsed}
            aria-controls="app-sidebar"
            onClick={onToggle}
            className={cn(
              "rounded-xl border-border/70 bg-background/60 text-muted-foreground hover:text-foreground",
              collapsed ? "mx-auto" : "w-full justify-start gap-2.5 px-3",
            )}
          />
        }
      >
        <ChevronsLeft
          className={cn(
            "size-4 shrink-0 transition-transform duration-300",
            collapsed !== rtl && "rotate-180",
          )}
        />
        {!collapsed ? (
          <span className="text-[12.5px] font-medium">{label}</span>
        ) : null}
      </TooltipTrigger>
      <TooltipContent side={rtl ? "left" : "right"} sideOffset={10}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function SidebarPanel({
  items,
  pathname,
  brand,
  brandTag,
  workspaceLabel,
  liveBridgeLabel,
  liveBridgeCopy,
  collapseLabel,
  collapsed = false,
  showCollapse = false,
  rtl,
  onNavigate,
  onToggleCollapse,
}: {
  items: NavItem[];
  pathname: string;
  brand: string;
  brandTag: string;
  workspaceLabel: string;
  liveBridgeLabel: string;
  liveBridgeCopy: string;
  collapseLabel: string;
  collapsed?: boolean;
  showCollapse?: boolean;
  rtl: boolean;
  onNavigate?: () => void;
  onToggleCollapse?: () => void;
}) {
  return (
    <div
      className={cn(
        "flex h-full flex-col gap-8",
        collapsed ? "px-2.5 py-5" : "p-5",
      )}
    >
      <BrandLink brand={brand} brandTag={brandTag} collapsed={collapsed} />
      <div className="space-y-3">
        {!collapsed ? (
          <p className="px-1 text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
            {workspaceLabel}
          </p>
        ) : null}
        <NavLinks
          items={items}
          pathname={pathname}
          onNavigate={onNavigate}
          collapsed={collapsed}
          tooltipSide={rtl ? "left" : "right"}
        />
      </div>

      <div className="mt-auto space-y-3">
        {!collapsed ? (
          <div className="rounded-2xl border border-border/60 bg-linear-to-br from-card to-muted/40 p-4">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-foreground/80 uppercase">
              {liveBridgeLabel}
            </p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
              {liveBridgeCopy}
            </p>
          </div>
        ) : null}
        {showCollapse && onToggleCollapse ? (
          <SidebarCollapseButton
            collapsed={collapsed}
            rtl={rtl}
            label={collapseLabel}
            onToggle={onToggleCollapse}
          />
        ) : null}
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("Common");
  const tNav = useTranslations("Nav");
  const locale = useLocale();
  const rtl = isRtlLocale(locale);
  const {
    sidebarOpen,
    setSidebarOpen,
    sidebarCollapsed,
    toggleSidebarCollapsed,
  } = useUiStore();
  const pathname = usePathname();

  const navItems: NavItem[] = [
    {
      href: "/dashboard",
      label: tNav("dashboard"),
      description: tNav("dashboardDesc"),
      icon: LayoutDashboard,
    },
    {
      href: "/journal",
      label: tNav("journal"),
      description: tNav("journalDesc"),
      icon: BookOpenText,
    },
    {
      href: "/backtest",
      label: tNav("backtest"),
      description: tNav("backtestDesc"),
      icon: FlaskConical,
    },
    {
      href: "/settings",
      label: tNav("settings"),
      description: tNav("settingsDesc"),
      icon: Settings2,
    },
  ];

  const section =
    navItems.find(
      (item) =>
        pathname === item.href || pathname.startsWith(`${item.href}/`),
    )?.label ?? t("workspace");

  const collapseLabel = sidebarCollapsed
    ? t("expandSidebar")
    : t("collapseSidebar");

  const panelProps = {
    items: navItems,
    pathname,
    brand: t("brand"),
    brandTag: t("brandTag"),
    workspaceLabel: t("workspace"),
    liveBridgeLabel: t("liveBridge"),
    liveBridgeCopy: t("liveBridgeCopy"),
    collapseLabel,
    rtl,
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-[1580px]">
        <aside
          id="app-sidebar"
          data-collapsed={sidebarCollapsed ? "true" : "false"}
          className={cn(
            "sticky top-0 hidden h-screen shrink-0 overflow-hidden border-e border-border/60 bg-sidebar/85 backdrop-blur-xl transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:block",
            sidebarCollapsed ? "w-19" : "w-68",
          )}
        >
          <SidebarPanel
            {...panelProps}
            collapsed={sidebarCollapsed}
            showCollapse
            onToggleCollapse={toggleSidebarCollapsed}
          />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border/60 bg-background/75 px-4 py-3.5 backdrop-blur-xl md:px-8">
            <div className="flex items-center gap-3 md:hidden">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label={t("openNavigation")}
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="size-4" />
              </Button>
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetContent side={rtl ? "right" : "left"} className="w-80 p-0">
                  <SheetHeader className="sr-only">
                    <SheetTitle>{t("navigation")}</SheetTitle>
                  </SheetHeader>
                  <SidebarPanel
                    {...panelProps}
                    onNavigate={() => setSidebarOpen(false)}
                  />
                </SheetContent>
              </Sheet>
              <BrandLink brand={t("brand")} brandTag={t("brandTag")} />
            </div>

            <div className="hidden min-w-0 md:block">
              <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                {t("currentView")}
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold tracking-[-0.02em]">
                {section}
                <span className="font-normal text-muted-foreground">
                  {" "}
                  · {t("mt4Journal")}
                </span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </header>

          <main className="min-w-0 flex-1 px-4 py-7 md:px-8 md:py-9">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
