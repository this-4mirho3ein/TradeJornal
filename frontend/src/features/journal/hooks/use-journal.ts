"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  createManualTrade,
  updateTradeEnrichment,
} from "@/lib/api/journal";
import { ApiError } from "@/lib/api/client";
import type {
  CreateManualTradeInput,
  UpdateTradeEnrichmentInput,
} from "@/types/api";

export function useUpdateTradeEnrichmentMutation(accountNumber: number) {
  const queryClient = useQueryClient();
  const t = useTranslations("Journal");

  return useMutation({
    mutationFn: ({
      tradeId,
      input,
    }: {
      tradeId: number;
      input: UpdateTradeEnrichmentInput;
    }) => updateTradeEnrichment(accountNumber, tradeId, input),
    onSuccess: async () => {
      toast.success(t("enrichmentSaved"));
      await queryClient.invalidateQueries({
        queryKey: ["accounts", accountNumber, "trades"],
      });
    },
    onError: (error: unknown) => {
      const message =
        error instanceof ApiError ? error.message : t("enrichmentSaveFailed");
      toast.error(message);
    },
  });
}

export function useCreateManualTradeMutation(accountNumber: number) {
  const queryClient = useQueryClient();
  const t = useTranslations("Journal");

  return useMutation({
    mutationFn: (input: CreateManualTradeInput) =>
      createManualTrade(accountNumber, input),
    onSuccess: async () => {
      toast.success(t("manualCreated"));
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["accounts", accountNumber, "trades"],
        }),
        queryClient.invalidateQueries({ queryKey: ["accounts"] }),
      ]);
    },
    onError: (error: unknown) => {
      const message =
        error instanceof ApiError ? error.message : t("manualCreateFailed");
      toast.error(message);
    },
  });
}
