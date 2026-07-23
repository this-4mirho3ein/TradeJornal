# Trade Journal Frontend

Next.js 16 App Router · React 19 · Tailwind v4 · shadcn/ui · next-intl (EN / FA)

## Run

```bash
# terminal 1 — API
cd backend
source .venv/bin/activate
python run.py

# terminal 2 — UI
cd frontend
npm run dev
```

Open [http://localhost:3000/en/dashboard](http://localhost:3000/en/dashboard)  
Persian RTL: [http://localhost:3000/fa/dashboard](http://localhost:3000/fa/dashboard)

## Pages

- `/{locale}/dashboard` — account, balance, equity, positions, equity curve, sync
- `/{locale}/journal` — closed trades grid with filters
- `/{locale}/backtest` — create strategy, then open its backtest record book
- `/{locale}/backtest/[strategyId]` — manual backtest records for one strategy
- `/{locale}/settings` — launch guide + API connection

Locales: `en` (LTR, Manrope) · `fa` (RTL, Vazirmatn). Switch via the EN / FA control in the header.

## Environment

`frontend/.env.local`

```
NEXT_PUBLIC_API_URL=http://127.0.0.1:5001
```
