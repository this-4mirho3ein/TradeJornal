//+------------------------------------------------------------------+
//|                                          TradeJournalBridge.mq4  |
//| Exports account, positions and closed trades as JSON files.      |
//| Point InpExportFolder to the backend data/mt4_bridge directory.  |
//+------------------------------------------------------------------+
#property strict
#property copyright "Trade Journal"
#property version   "1.10"

input string InpExportFolder = "TradeJournal"; // Subfolder under Terminal Common\\Files
input int    InpExportSeconds = 5;             // Export interval (seconds)
input int    InpHistoryDays   = 0;             // Closed trade lookback (0 = ALL loaded history)

datetime g_last_export = 0;

//+------------------------------------------------------------------+
string JsonEscape(string value)
  {
   string out = value;
   StringReplace(out, "\\", "\\\\");
   StringReplace(out, "\"", "\\\"");
   StringReplace(out, "\r", "\\r");
   StringReplace(out, "\n", "\\n");
   return out;
  }

//+------------------------------------------------------------------+
string IsoTime(datetime value)
  {
   return TimeToStr(value, TIME_DATE|TIME_SECONDS);
  }

//+------------------------------------------------------------------+
int OpenExportFile(string filename)
  {
   string path = InpExportFolder + "\\" + filename;
   int handle = FileOpen(path, FILE_WRITE|FILE_TXT|FILE_ANSI|FILE_COMMON);
   if(handle == INVALID_HANDLE)
      handle = FileOpen(path, FILE_WRITE|FILE_TXT|FILE_ANSI);
   if(handle == INVALID_HANDLE)
      Print("TradeJournalBridge: cannot write ", path, " err=", GetLastError());
   return handle;
  }

//+------------------------------------------------------------------+
bool WriteTextFile(string filename, string content)
  {
   int handle = OpenExportFile(filename);
   if(handle == INVALID_HANDLE)
      return false;
   FileWriteString(handle, content);
   FileClose(handle);
   return true;
  }

//+------------------------------------------------------------------+
string BuildClosedTradeJson()
  {
   int type = OrderType();
   string side = (type == OP_BUY ? "buy" : "sell");
   return StringFormat(
      "{"
      "\"ticket\":%d,"
      "\"symbol\":\"%s\","
      "\"side\":\"%s\","
      "\"volume\":%.2f,"
      "\"open_price\":%.8f,"
      "\"close_price\":%.8f,"
      "\"open_time\":\"%s\","
      "\"close_time\":\"%s\","
      "\"stop_loss\":%.8f,"
      "\"take_profit\":%.8f,"
      "\"commission\":%.5f,"
      "\"swap\":%.5f,"
      "\"profit\":%.5f,"
      "\"magic_number\":%d,"
      "\"comment\":\"%s\""
      "}",
      OrderTicket(),
      JsonEscape(OrderSymbol()),
      side,
      OrderLots(),
      OrderOpenPrice(),
      OrderClosePrice(),
      IsoTime(OrderOpenTime()),
      IsoTime(OrderCloseTime()),
      OrderStopLoss(),
      OrderTakeProfit(),
      OrderCommission(),
      OrderSwap(),
      OrderProfit(),
      OrderMagicNumber(),
      JsonEscape(OrderComment())
   );
  }

//+------------------------------------------------------------------+
bool WriteHistoryFile()
  {
   // IMPORTANT: MT4 only exports deals currently loaded in Account History.
   // In MT4: Account History tab → right click → All History
   datetime from_time = 0;
   if(InpHistoryDays > 0)
      from_time = TimeCurrent() - InpHistoryDays * 24 * 60 * 60;

   int handle = OpenExportFile("history.json");
   if(handle == INVALID_HANDLE)
      return false;

   FileWriteString(handle, "{\"trades\":[");

   int written = 0;
   int total = OrdersHistoryTotal();
   for(int i = 0; i < total; i++)
     {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_HISTORY))
         continue;
      int type = OrderType();
      if(type != OP_BUY && type != OP_SELL)
         continue;
      if(from_time > 0 && OrderCloseTime() < from_time)
         continue;

      if(written > 0)
         FileWriteString(handle, ",");
      FileWriteString(handle, BuildClosedTradeJson());
      written++;
     }

   FileWriteString(handle, "]}");
   FileClose(handle);
   Print("TradeJournalBridge: exported ", written, " closed trades (history total=", total, ")");
   return true;
  }

//+------------------------------------------------------------------+
string BuildHeartbeat()
  {
   return StringFormat(
      "{\"timestamp\":\"%s\",\"account\":%d,\"version\":\"1.1.0\",\"history_days\":%d}",
      IsoTime(TimeCurrent()),
      AccountNumber(),
      InpHistoryDays
   );
  }

//+------------------------------------------------------------------+
string BuildAccount()
  {
   double margin_level = AccountMargin() > 0.0
      ? (AccountEquity() / AccountMargin()) * 100.0
      : 0.0;

   return StringFormat(
      "{"
      "\"login\":%d,"
      "\"name\":\"%s\","
      "\"server\":\"%s\","
      "\"company\":\"%s\","
      "\"currency\":\"%s\","
      "\"leverage\":%d,"
      "\"balance\":%.5f,"
      "\"equity\":%.5f,"
      "\"margin\":%.5f,"
      "\"free_margin\":%.5f,"
      "\"margin_level\":%.5f,"
      "\"profit\":%.5f,"
      "\"credit\":%.5f,"
      "\"trade_allowed\":%s,"
      "\"synced_at\":\"%s\""
      "}",
      AccountNumber(),
      JsonEscape(AccountName()),
      JsonEscape(AccountServer()),
      JsonEscape(AccountCompany()),
      JsonEscape(AccountCurrency()),
      AccountLeverage(),
      AccountBalance(),
      AccountEquity(),
      AccountMargin(),
      AccountFreeMargin(),
      margin_level,
      AccountProfit(),
      AccountCredit(),
      (IsTradeAllowed() ? "true" : "false"),
      IsoTime(TimeCurrent())
   );
  }

//+------------------------------------------------------------------+
string BuildPositions()
  {
   string body = "";
   int total = OrdersTotal();
   for(int i = 0; i < total; i++)
     {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES))
         continue;
      int type = OrderType();
      if(type != OP_BUY && type != OP_SELL)
         continue;

      string side = (type == OP_BUY ? "buy" : "sell");
      string item = StringFormat(
         "{"
         "\"ticket\":%d,"
         "\"symbol\":\"%s\","
         "\"side\":\"%s\","
         "\"volume\":%.2f,"
         "\"open_price\":%.8f,"
         "\"open_time\":\"%s\","
         "\"stop_loss\":%.8f,"
         "\"take_profit\":%.8f,"
         "\"commission\":%.5f,"
         "\"swap\":%.5f,"
         "\"profit\":%.5f,"
         "\"magic_number\":%d,"
         "\"comment\":\"%s\","
         "\"current_price\":%.8f"
         "}",
         OrderTicket(),
         JsonEscape(OrderSymbol()),
         side,
         OrderLots(),
         OrderOpenPrice(),
         IsoTime(OrderOpenTime()),
         OrderStopLoss(),
         OrderTakeProfit(),
         OrderCommission(),
         OrderSwap(),
         OrderProfit(),
         OrderMagicNumber(),
         JsonEscape(OrderComment()),
         OrderClosePrice()
      );

      if(StringLen(body) > 0)
         body = body + ",";
      body = body + item;
     }

   return "{\"positions\":[" + body + "]}";
  }

//+------------------------------------------------------------------+
void ExportAll()
  {
   bool ok = true;
   ok = WriteTextFile("heartbeat.json", BuildHeartbeat()) && ok;
   ok = WriteTextFile("account.json", BuildAccount()) && ok;
   ok = WriteTextFile("positions.json", BuildPositions()) && ok;
   ok = WriteHistoryFile() && ok;

   if(ok)
      Print("TradeJournalBridge: export OK at ", TimeToStr(TimeCurrent(), TIME_DATE|TIME_SECONDS));
   else
      Print("TradeJournalBridge: export failed. Check InpExportFolder permissions.");
  }

//+------------------------------------------------------------------+
int OnInit()
  {
   EventSetTimer(InpExportSeconds);
   ExportAll();
   return INIT_SUCCEEDED;
  }

//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   EventKillTimer();
  }

//+------------------------------------------------------------------+
void OnTimer()
  {
   ExportAll();
  }

//+------------------------------------------------------------------+
void OnTick()
  {
   if(TimeCurrent() - g_last_export >= InpExportSeconds)
     {
      g_last_export = TimeCurrent();
      ExportAll();
     }
  }
//+------------------------------------------------------------------+