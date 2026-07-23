# Trade Journal — MT4 Connection

## Important: do not use `pip install metatrader`

The PyPI package [`metatrader`](https://pypi.org/project/metatrader/) (v0.0.1, 2015) **cannot** connect to a live MT4 account.

- Python 2.7 only
- Windows only
- Supports **backtest / optimization only**, not balance, equity, positions, or history

This project follows `AGENT.md`: only `MT4Client` talks to MetaTrader, via adapters.

## How live MT4 sync works here

MetaQuotes does not ship an official Python API for MT4. The supported live path is:

1. Attach `backend/mt4_ea/TradeJournalBridge.mq4` to any chart in MT4
2. Set `InpExportFolder` to a shared folder (e.g. `backend/data/mt4_bridge`)
3. Set `MT4_ADAPTER=bridge` in `backend/.env`
4. Run inspect / sync

```
MT4 Terminal + EA  →  JSON files  →  FileBridgeMT4Adapter  →  MT4Client  →  SyncService  →  SQLite
```

## Quick start (demo data — no terminal needed)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # already defaults to MT4_ADAPTER=demo

python scripts/inspect_mt4_account.py
python scripts/inspect_mt4_account.py --sync
python run.py
```

API:

- `GET  /api/v1/sync/inspect` — read account / positions / history (no DB write)
- `POST /api/v1/sync/run` — idempotent upsert into SQLite
- `GET  /api/v1/accounts`
- `GET  /api/v1/accounts/<login>`
- `GET  /api/v1/accounts/<login>/trades`

## Live MT4 setup

1. Copy `TradeJournalBridge.mq4` into MT4 `MQL4/Experts`
2. Compile in MetaEditor
3. Attach to a chart (Allow DLL imports not required)
4. Set `InpExportFolder` to an absolute path writable by MT4
5. In `.env`:

```env
MT4_ADAPTER=bridge
MT4_BRIDGE_PATH=/absolute/path/to/mt4_bridge
```

6. Confirm these files appear every few seconds:

- `heartbeat.json`
- `account.json`
- `positions.json`
- `history.json`

7. Inspect carefully:

```bash
python scripts/inspect_mt4_account.py
python scripts/inspect_mt4_account.py --json
python scripts/inspect_mt4_account.py --sync
```

## Architecture (AGENT.md)

- Controllers never call MetaTrader
- Services talk only to `MT4Client`
- `MT4Client` talks only to adapters (`demo` | `bridge`)
- Sync is idempotent (UPSERT by ticket + account, never deletes)