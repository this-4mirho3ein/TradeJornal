"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  createBacktestRecord,
  createBacktestStrategy,
  deleteBacktestRecord,
  deleteBacktestStrategy,
  fetchBacktestRecords,
  fetchBacktestStrategies,
  fetchBacktestStrategy,
  updateBacktestRecord,
} from "@/lib/api/backtest";
import { ApiError } from "@/lib/api/client";
import type {
  CreateBacktestRecordInput,
  CreateBacktestStrategyInput,
  UpdateBacktestRecordInput,
} from "@/types/api";

export const backtestKeys = {
  strategies: ["backtest", "strategies"] as const,
  strategy: (id: number) => ["backtest", "strategies", id] as const,
  records: (id: number) => ["backtest", "strategies", id, "records"] as const,
};

export function useBacktestStrategiesQuery() {
  return useQuery({
    queryKey: backtestKeys.strategies,
    queryFn: fetchBacktestStrategies,
  });
}

export function useBacktestStrategyQuery(strategyId: number) {
  return useQuery({
    queryKey: backtestKeys.strategy(strategyId),
    queryFn: () => fetchBacktestStrategy(strategyId),
    enabled: Number.isFinite(strategyId) && strategyId > 0,
  });
}

export function useBacktestRecordsQuery(strategyId: number) {
  return useQuery({
    queryKey: backtestKeys.records(strategyId),
    queryFn: () => fetchBacktestRecords(strategyId),
    enabled: Number.isFinite(strategyId) && strategyId > 0,
  });
}

export function useCreateStrategyMutation() {
  const queryClient = useQueryClient();
  const t = useTranslations("Backtest");

  return useMutation({
    mutationFn: (input: CreateBacktestStrategyInput) =>
      createBacktestStrategy(input),
    onSuccess: async () => {
      toast.success(t("strategyCreated"));
      await queryClient.invalidateQueries({ queryKey: backtestKeys.strategies });
    },
    onError: (error: unknown) => {
      const message =
        error instanceof ApiError ? error.message : t("strategyCreateFailed");
      toast.error(message);
    },
  });
}

export function useDeleteStrategyMutation() {
  const queryClient = useQueryClient();
  const t = useTranslations("Backtest");

  return useMutation({
    mutationFn: (strategyId: number) => deleteBacktestStrategy(strategyId),
    onSuccess: async (_data, strategyId) => {
      toast.success(t("strategyDeleted"));
      queryClient.removeQueries({ queryKey: backtestKeys.strategy(strategyId) });
      queryClient.removeQueries({ queryKey: backtestKeys.records(strategyId) });
      await queryClient.invalidateQueries({ queryKey: backtestKeys.strategies });
    },
    onError: (error: unknown) => {
      const message =
        error instanceof ApiError ? error.message : t("strategyDeleteFailed");
      toast.error(message);
    },
  });
}

export function useCreateRecordMutation(strategyId: number) {
  const queryClient = useQueryClient();
  const t = useTranslations("Backtest");

  return useMutation({
    mutationFn: (input: CreateBacktestRecordInput) =>
      createBacktestRecord(strategyId, input),
    onSuccess: async () => {
      toast.success(t("recordCreated"));
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: backtestKeys.records(strategyId),
        }),
        queryClient.invalidateQueries({
          queryKey: backtestKeys.strategy(strategyId),
        }),
        queryClient.invalidateQueries({ queryKey: backtestKeys.strategies }),
      ]);
    },
    onError: (error: unknown) => {
      const message =
        error instanceof ApiError ? error.message : t("recordCreateFailed");
      toast.error(message);
    },
  });
}

export function useUpdateRecordMutation(strategyId: number) {
  const queryClient = useQueryClient();
  const t = useTranslations("Backtest");

  return useMutation({
    mutationFn: ({
      recordId,
      input,
    }: {
      recordId: number;
      input: UpdateBacktestRecordInput;
    }) => updateBacktestRecord(strategyId, recordId, input),
    onSuccess: async () => {
      toast.success(t("recordUpdated"));
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: backtestKeys.records(strategyId),
        }),
        queryClient.invalidateQueries({
          queryKey: backtestKeys.strategy(strategyId),
        }),
        queryClient.invalidateQueries({ queryKey: backtestKeys.strategies }),
      ]);
    },
    onError: (error: unknown) => {
      const message =
        error instanceof ApiError ? error.message : t("recordUpdateFailed");
      toast.error(message);
    },
  });
}

export function useDeleteRecordMutation(strategyId: number) {
  const queryClient = useQueryClient();
  const t = useTranslations("Backtest");

  return useMutation({
    mutationFn: (recordId: number) =>
      deleteBacktestRecord(strategyId, recordId),
    onSuccess: async () => {
      toast.success(t("recordDeleted"));
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: backtestKeys.records(strategyId),
        }),
        queryClient.invalidateQueries({
          queryKey: backtestKeys.strategy(strategyId),
        }),
        queryClient.invalidateQueries({ queryKey: backtestKeys.strategies }),
      ]);
    },
    onError: (error: unknown) => {
      const message =
        error instanceof ApiError ? error.message : t("recordDeleteFailed");
      toast.error(message);
    },
  });
}
