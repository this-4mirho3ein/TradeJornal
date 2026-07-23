"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type CopyableCommandProps = {
  command: string;
};

export function CopyableCommand({ command }: CopyableCommandProps) {
  const t = useTranslations("Settings.launch");
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      toast.success(t("copySuccess"));
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error(t("copyError"));
    }
  }

  return (
    <div className="relative mt-2 overflow-hidden rounded-xl border border-border/55 bg-background/70">
      <div className="flex items-center justify-between gap-2 border-b border-border/50 px-3 py-1.5">
        <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          {t("command")}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="h-7 gap-1.5 rounded-lg px-2 text-[11px]"
          onClick={handleCopy}
          aria-label={t("copy")}
        >
          {copied ? (
            <>
              <Check className="size-3.5 text-profit" />
              {t("copied")}
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              {t("copy")}
            </>
          )}
        </Button>
      </div>
      <pre className="overflow-x-auto px-3.5 py-3 font-mono text-[12px] leading-relaxed text-foreground">
        {command}
      </pre>
    </div>
  );
}
