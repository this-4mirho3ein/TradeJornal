import { apiFormRequest, apiRequest } from "@/lib/api/client";
import type {
  BacktestRecord,
  BacktestStrategy,
  CreateBacktestRecordInput,
  CreateBacktestStrategyInput,
  UpdateBacktestRecordInput,
} from "@/types/api";

export async function fetchBacktestStrategies(): Promise<BacktestStrategy[]> {
  return apiRequest<BacktestStrategy[]>("/api/v1/backtest/strategies");
}

export async function createBacktestStrategy(
  input: CreateBacktestStrategyInput,
): Promise<BacktestStrategy> {
  return apiRequest<BacktestStrategy>("/api/v1/backtest/strategies", {
    method: "POST",
    body: input,
  });
}

export async function fetchBacktestStrategy(
  strategyId: number,
): Promise<BacktestStrategy> {
  return apiRequest<BacktestStrategy>(
    `/api/v1/backtest/strategies/${strategyId}`,
  );
}

export async function deleteBacktestStrategy(
  strategyId: number,
): Promise<{ id: number }> {
  return apiRequest<{ id: number }>(
    `/api/v1/backtest/strategies/${strategyId}`,
    { method: "DELETE" },
  );
}

export async function fetchBacktestRecords(
  strategyId: number,
  limit = 5000,
): Promise<BacktestRecord[]> {
  return apiRequest<BacktestRecord[]>(
    `/api/v1/backtest/strategies/${strategyId}/records?limit=${limit}`,
  );
}

export async function createBacktestRecord(
  strategyId: number,
  input: CreateBacktestRecordInput,
): Promise<BacktestRecord> {
  const formData = new FormData();
  formData.append("symbol", input.symbol);
  formData.append("side", input.side);
  formData.append("session", input.session);
  formData.append("trend", input.trend);
  formData.append("cycle", input.cycle);
  formData.append("open_time", input.open_time);
  if (input.r_multiple) formData.append("r_multiple", input.r_multiple);
  if (input.timeframe) formData.append("timeframe", input.timeframe);
  if (input.notes) formData.append("notes", input.notes);
  if (input.image) formData.append("image", input.image);

  return apiFormRequest<BacktestRecord>(
    `/api/v1/backtest/strategies/${strategyId}/records`,
    formData,
  );
}

export async function updateBacktestRecord(
  strategyId: number,
  recordId: number,
  input: UpdateBacktestRecordInput,
): Promise<BacktestRecord> {
  const formData = new FormData();
  formData.append("symbol", input.symbol);
  formData.append("side", input.side);
  formData.append("session", input.session);
  formData.append("trend", input.trend);
  formData.append("cycle", input.cycle);
  formData.append("open_time", input.open_time);
  if (input.r_multiple) formData.append("r_multiple", input.r_multiple);
  if (input.timeframe) formData.append("timeframe", input.timeframe);
  if (input.notes) formData.append("notes", input.notes);
  if (input.remove_image) formData.append("remove_image", "true");
  if (input.image) formData.append("image", input.image);

  return apiFormRequest<BacktestRecord>(
    `/api/v1/backtest/strategies/${strategyId}/records/${recordId}`,
    formData,
    { method: "PATCH" },
  );
}

export async function deleteBacktestRecord(
  strategyId: number,
  recordId: number,
): Promise<{ id: number }> {
  return apiRequest<{ id: number }>(
    `/api/v1/backtest/strategies/${strategyId}/records/${recordId}`,
    { method: "DELETE" },
  );
}
