import { apiFormRequest, apiRequest } from "@/lib/api/client";
import type {
  ClosedTrade,
  CreateManualTradeInput,
  Mt4Snapshot,
  SyncRunResult,
  TradeListParams,
  TradesPage,
  TradingAccount,
  UpdateTradeEnrichmentInput,
} from "@/types/api";

/** Server-safe account reads. */
export async function fetchAccounts(): Promise<TradingAccount[]> {
  return apiRequest<TradingAccount[]>("/api/v1/accounts");
}

export async function fetchAccount(
  accountNumber: number,
): Promise<TradingAccount> {
  return apiRequest<TradingAccount>(`/api/v1/accounts/${accountNumber}`);
}

export async function fetchAccountTrades(
  accountNumber: number,
  params: TradeListParams = {},
): Promise<TradesPage> {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("page_size", String(params.page_size ?? 20));
  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.side && params.side !== "all") query.set("side", params.side);
  if (params.timeframe && params.timeframe !== "all") {
    query.set("timeframe", params.timeframe);
  }
  if (params.session && params.session !== "all") {
    query.set("session", params.session);
  }
  if (params.trend && params.trend !== "all") query.set("trend", params.trend);
  if (params.cycle && params.cycle !== "all") query.set("cycle", params.cycle);
  if (params.result && params.result !== "all") {
    query.set("result", params.result);
  }

  return apiRequest<TradesPage>(
    `/api/v1/accounts/${accountNumber}/trades?${query.toString()}`,
  );
}

export async function createManualTrade(
  accountNumber: number,
  input: CreateManualTradeInput,
): Promise<ClosedTrade> {
  const formData = new FormData();
  formData.append("symbol", input.symbol);
  formData.append("side", input.side);
  formData.append("open_time", input.open_time);
  if (input.close_time) formData.append("close_time", input.close_time);
  if (input.volume) formData.append("volume", input.volume);
  if (input.open_price) formData.append("open_price", input.open_price);
  if (input.close_price) formData.append("close_price", input.close_price);
  if (input.profit) formData.append("profit", input.profit);
  if (input.comment) formData.append("comment", input.comment);
  formData.append("notes", input.notes ?? "");
  formData.append("r_multiple", input.r_multiple ?? "");
  formData.append("timeframe", input.timeframe ?? "");
  formData.append("session", input.session ?? "");
  formData.append("trend", input.trend ?? "");
  formData.append("cycle", input.cycle ?? "");
  if (input.image) formData.append("image", input.image);

  return apiFormRequest<ClosedTrade>(
    `/api/v1/accounts/${accountNumber}/trades`,
    formData,
  );
}

export async function updateTradeEnrichment(
  accountNumber: number,
  tradeId: number,
  input: UpdateTradeEnrichmentInput,
): Promise<ClosedTrade> {
  const formData = new FormData();
  formData.append("notes", input.notes ?? "");
  formData.append("r_multiple", input.r_multiple ?? "");
  formData.append("timeframe", input.timeframe ?? "");
  formData.append("session", input.session ?? "");
  formData.append("trend", input.trend ?? "");
  formData.append("cycle", input.cycle ?? "");
  if (input.remove_image) formData.append("remove_image", "true");
  if (input.image) formData.append("image", input.image);

  return apiFormRequest<ClosedTrade>(
    `/api/v1/accounts/${accountNumber}/trades/${tradeId}`,
    formData,
    { method: "PATCH" },
  );
}

/** Live MT4 inspect — does not write to the database. */
export async function inspectMt4(): Promise<Mt4Snapshot> {
  return apiRequest<Mt4Snapshot>("/api/v1/sync/inspect");
}

/** Idempotent sync into SQLite. */
export async function runSync(): Promise<SyncRunResult> {
  return apiRequest<SyncRunResult>("/api/v1/sync/run", { method: "POST" });
}
