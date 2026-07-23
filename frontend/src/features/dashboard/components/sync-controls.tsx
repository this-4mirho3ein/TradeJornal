"use client";

import { LoaderCircle, RefreshCw, Radar } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  useMt4SnapshotQuery,
  useSyncMutation,
} from "@/features/dashboard/hooks/use-dashboard-data";

export function SyncControls() {
  const t = useTranslations("Dashboard");
  const snapshotQuery = useMt4SnapshotQuery();
  const syncMutation = useSyncMutation();
  const busy = snapshotQuery.isFetching || syncMutation.isPending;

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <Button
        type="button"
        variant="outline"
        size="lg"
        disabled={busy}
        className="rounded-xl px-3.5"
        onClick={() => snapshotQuery.refetch()}
      >
        {snapshotQuery.isFetching ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <Radar className="size-4" />
        )}
        {t("inspect")}
      </Button>
      <Button
        type="button"
        size="lg"
        disabled={busy}
        className="rounded-xl px-3.5"
        onClick={() => syncMutation.mutate()}
      >
        {syncMutation.isPending ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <RefreshCw className="size-4" />
        )}
        {t("sync")}
      </Button>
    </div>
  );
}