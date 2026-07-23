import { cn } from "@/lib/utils";

type StatusPillProps = {
  label: string;
  tone?: "live" | "synced" | "idle" | "warn";
  className?: string;
};

export function StatusPill({
  label,
  tone = "idle",
  className,
}: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.04em]",
        tone === "live" &&
          "border-profit/25 bg-profit/10 text-profit",
        tone === "synced" &&
          "border-primary/25 bg-primary/10 text-primary",
        tone === "warn" &&
          "border-loss/25 bg-loss/10 text-loss",
        tone === "idle" &&
          "border-border/70 bg-muted/60 text-muted-foreground",
        className,
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          tone === "live" && "bg-profit shadow-[0_0_0_3px] shadow-profit/20",
          tone === "synced" && "bg-primary",
          tone === "warn" && "bg-loss",
          tone === "idle" && "bg-muted-foreground/50",
        )}
      />
      {label}
    </span>
  );
}