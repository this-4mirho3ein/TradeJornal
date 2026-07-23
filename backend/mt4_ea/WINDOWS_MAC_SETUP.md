# Real MT4 on Windows + Trade Journal on macOS

## Every launch (order matters)

1. **Windows** — open MT4, keep `TradeJournalBridge` EA running, start `copy_bridge_to_mac.ps1`
2. **Mac terminal 1** — start backend: `cd backend && source .venv/bin/activate && python run.py`
3. **Mac terminal 2** — start frontend: `cd frontend && npm run dev`
4. **Browser** — open http://localhost:3000 → Inspect MT4 → Sync Account

Full checklist also lives in the app: **Settings → Launch guide**.

## Data path

```
Windows MT4 + EA
  → Common\Files\TradeJournal JSON
  → copy script → Mac backend/data/mt4_bridge
  → Flask SyncService → SQLite journal.db
  → Next.js dashboard / journal
```

You never give passwords to this app.
