"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "profit" | "loss";
  delay?: number;
};

export function MetricCard({
  label,
  value,
  hint,
  tone = "neutral",
  delay = 0,
}: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className="panel group overflow-hidden transition-colors hover:border-primary/25">
        <CardContent className="relative p-4">
          <div
            className={cn(
              "pointer-events-none absolute -top-10 right-0 size-24 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100",
              tone === "profit" && "bg-profit/20",
              tone === "loss" && "bg-loss/20",
              tone === "neutral" && "bg-primary/15",
            )}
          />
          <p className="eyebrow">{label}</p>
          <p
            className={cn(
              "mt-2 font-tabular text-[0.95rem] font-semibold leading-snug tracking-[-0.025em] md:text-[1.05rem]",
              tone === "profit" && "text-profit",
              tone === "loss" && "text-loss",
            )}
          >
            {value}
          </p>
          {hint ? (
            <p className="mt-1.5 text-[11.5px] leading-snug text-muted-foreground">
              {hint}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </motion.div>
  );
}