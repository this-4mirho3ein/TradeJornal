/** Shared API response envelope from the Flask backend. */
export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  error: string | null;
};

export type TradingAccount = {
  id: number;
  account_number: number;
  name: string;
  server: string;
  broker: string;
  currency: string;
  leverage: number;
  balance: string;
  equity: string;
  margin: string;
  free_margin: string;
  margin_level: string;
  profit: string;
  is_active: boolean;
  last_synced_at: string | null;
};

export type ClosedTrade = {
  id: number;
  ticket: number;
  symbol: string;
  type: string;
  volume: string;
  open_price: string;
  close_price: string;
  stop_loss: string;
  take_profit: string;
  commission: string;
  swap: string;
  profit: string;
  open_time: string;
  close_time: string;
  duration_seconds: number | null;
  magic_number: number;
  comment: string;
  account_number: number;
  strategy_id: number | null;
  rating: number | null;
  emotion: string | null;
  notes: string | null;
  r_multiple: string | null;
  timeframe: string | null;
  session: string | null;
  trend: string | null;
  cycle: string | null;
  image_path: string | null;
  image_url: string | null;
  is_manual?: boolean;
};

export type TradesPage = {
  items: ClosedTrade[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

export type TradeListParams = {
  page?: number;
  page_size?: number;
  search?: string;
  side?: string;
  timeframe?: string;
  session?: string;
  trend?: string;
  cycle?: string;
  result?: string;
};

export type UpdateTradeEnrichmentInput = {
  notes?: string;
  r_multiple?: string;
  timeframe?: string;
  session?: string;
  trend?: string;
  cycle?: string;
  image?: File | null;
  remove_image?: boolean;
};

export type CreateManualTradeInput = {
  symbol: string;
  side: "buy" | "sell";
  volume?: string;
  open_price?: string;
  close_price?: string;
  profit?: string;
  open_time: string;
  close_time?: string;
  comment?: string;
  notes?: string;
  r_multiple?: string;
  timeframe?: string;
  session?: string;
  trend?: string;
  cycle?: string;
  image?: File | null;
};

export type Mt4AccountInfo = {
  login: number;
  name: string;
  server: string;
  company: string;
  currency: string;
  leverage: number;
  balance: string;
  equity: string;
  margin: string;
  free_margin: string;
  margin_level: string;
  profit: string;
  credit: string;
  trade_allowed: boolean;
  synced_at: string;
};

export type Mt4Position = {
  ticket: number;
  symbol: string;
  side: "buy" | "sell";
  volume: string;
  open_price: string;
  open_time: string;
  stop_loss: string;
  take_profit: string;
  commission: string;
  swap: string;
  profit: string;
  magic_number: number;
  comment: string;
  current_price: string | null;
};

export type Mt4ClosedTrade = {
  ticket: number;
  symbol: string;
  side: "buy" | "sell";
  volume: string;
  open_price: string;
  close_price: string;
  open_time: string;
  close_time: string;
  stop_loss: string;
  take_profit: string;
  commission: string;
  swap: string;
  profit: string;
  magic_number: number;
  comment: string;
  balance_after_trade: string | null;
  equity_after_trade: string | null;
};

export type Mt4Snapshot = {
  account: Mt4AccountInfo;
  open_positions: Mt4Position[];
  closed_trades: Mt4ClosedTrade[];
  source: string;
  captured_at: string;
};

export type SyncRunResult = {
  sync_log_id: number;
  account_number: number;
  balance: string;
  equity: string;
  margin: string;
  free_margin: string;
  inserted_trades: number;
  updated_trades: number;
  total_trades_stored?: number;
  open_positions: number;
  closed_trades_seen: number;
  duration_ms: number;
  source: string;
  persisted?: boolean;
  database?: string;
  snapshot: Mt4Snapshot;
};

export type BacktestStrategy = {
  id: number;
  name: string;
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
  record_count: number;
  net_profit: string;
  net_r?: string;
  win_rate: number;
  winners: number;
  losers: number;
};

export type BacktestRecord = {
  id: number;
  strategy_id: number;
  symbol: string;
  side: "buy" | "sell" | string;
  volume: string;
  open_price: string;
  r_multiple: string | null;
  timeframe: string;
  session: string;
  trend: string;
  cycle: string;
  image_path: string | null;
  image_url: string | null;
  open_time: string;
  notes: string | null;
  created_at: string | null;
};

export type CreateBacktestStrategyInput = {
  name: string;
  description?: string;
};

export type CreateBacktestRecordInput = {
  symbol: string;
  side: "buy" | "sell";
  r_multiple?: string;
  timeframe: string;
  session: string;
  trend: string;
  cycle: string;
  open_time: string;
  notes?: string;
  image?: File | null;
};

export type UpdateBacktestRecordInput = CreateBacktestRecordInput & {
  remove_image?: boolean;
};