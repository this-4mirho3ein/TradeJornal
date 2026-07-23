"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  fetchAccountTrades,
  fetchAccounts,
  inspectMt4,
  runSync,
} from "@/lib/api/journal";
import { ApiError } from "@/lib/api/client";

export const dashboardKeys = {
  accounts: ["accounts"] as const,
  trades: (accountNumber: number) =>
    ["accounts", accountNumber, "trades"] as const,
  snapshot: ["mt4", "snapshot"] as const,
};

export function useAccountsQuery() {
  return useQuery({
    queryKey: dashboardKeys.accounts,
    queryFn: fetchAccounts,
  });
}

export function useAccountTradesQuery(accountNumber: number | null) {
  return useQuery({
    queryKey: dashboardKeys.trades(accountNumber ?? 0),
    queryFn: async () => {
      const page = await fetchAccountTrades(accountNumber as number, {
        page: 1,
        page_size: 200,
      });
      return page.items;
    },
    enabled: accountNumber !== null,
  });
}

export function useMt4SnapshotQuery(enabled = true) {
  return useQuery({
    queryKey: dashboardKeys.snapshot,
    queryFn: inspectMt4,
    enabled,
    refetchInterval: 30_000,
  });
}

export function useSyncMutation() {
  const queryClient = useQueryClient();
  const t = useTranslations("Dashboard");

  return useMutation({
    mutationFn: runSync,
    onSuccess: async (result) => {
      toast.success(t("savedToast"), {
        description: t("savedToastDesc", {
          inserted: result.inserted_trades,
          updated: result.updated_trades,
          total: result.total_trades_stored ?? "?",
        }),
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: dashboardKeys.accounts }),
        queryClient.invalidateQueries({ queryKey: dashboardKeys.snapshot }),
        queryClient.invalidateQueries({
          queryKey: ["accounts", result.account_number, "trades"],
        }),
      ]);
    },
    onError: (error: unknown) => {
      const message =
        error instanceof ApiError ? error.message : t("syncFailed");
      toast.error(message);
    },
  });
}