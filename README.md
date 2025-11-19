# Cabal420 - Mintwatcher (backend)

Simple backend-only Solana monitoring service. It listens for deposits from configured CEX addresses, auto-tracks newly funded wallets, watches outgoing transfers (>=90% forwarding), and detects SPL mint events. Alerts are sent to Telegram bots (wallet alerts and CA alerts).

Quick overview
- Configure CEX addresses in `data/monitored_wallets.json` (use `min_deposit_sol` / `max_deposit_sol` — values in SOL)
- Fill `.env` with RPC endpoints and Telegram bot tokens
- Run with Docker (recommended) or run locally with Node 18

Prerequisites
- Docker (recommended) OR Node 18+ + npm
- Telegram bot tokens and your chat id

Fill `.env` (do not commit it)
- `RPC_HTTP` - HTTP RPC endpoint (optional, used rarely)
- `RPC_WSS` - WebSocket WSS endpoint (required for live subscriptions)
- `TELEGRAM_WALLET_BOT` - bot token that receives wallet alerts
- `TELEGRAM_CA_BOT` - bot token that receives CA alerts
- `TELEGRAM_CHAT_ID` - chat id to receive messages
- `API_PORT` - REST API port (default 3000)
- `ADMIN_API_TOKEN` - token for API write endpoints
- `WATCH_PROGRAM_IDS` - optional comma-separated program IDs to also subscribe globally

Run with Docker (recommended)

Dev image (quick start):
```bash
docker build -t cabal420-mintwatcher:dev .
docker run --rm --env-file .env -p 3000:3000 cabal420-mintwatcher:dev
```

Production image (multi-stage):
```bash
docker build -f Dockerfile.prod -t cabal420-mintwatcher:prod .
docker run --rm --env-file .env -p 3000:3000 cabal420-mintwatcher:prod
```

Run locally with Node (if Node is installed)
```bash
npm ci
npm run dev
```

API (for managing monitored CEX addresses)
- `POST /wallets/add` — body accepts `{ label, address, enabled, min_deposit_sol, max_deposit_sol }` (requires `Authorization: Bearer <ADMIN_API_TOKEN>`)
- `POST /wallets/remove` — body `{ address }` (requires auth)
- `GET /wallets/list` — returns monitored list

Telegram setup
- Create bots via BotFather and put the tokens into `.env`.
- Get your `TELEGRAM_CHAT_ID` by sending a message to the bot and inspecting `getUpdates`, or use @userinfobot.

Monitored wallet format
- `data/monitored_wallets.json` uses a simple array. Example entry:
```json
{
  "label": "Binance-1",
  "address": "CEX_PUBLIC_ADDRESS_1",
  "enabled": true,
  "min_deposit_sol": 1.0,
  "max_deposit_sol": 100.0
}
```

Important notes
- Do NOT commit `.env` or runtime `data/wallet_state.json`.
- The service uses `logsSubscribe` over `RPC_WSS` for efficient live listening.
- If you plan to use a provider with a custom websocket format (non-standard JSON-RPC), tell me and I can add an adapter.

Push to GitHub
1. Create a new repo on GitHub
2. Run these commands locally in this project directory:
```bash
git init
git add .
git commit -m "Initial cabal420-mintwatcher"
git remote add origin git@github.com:<your-user>/<repo>.git
git branch -M main
git push -u origin main
```

If you want me to add a CI workflow or prepare a GitHub repo manifest, tell me and I will add it.

License & safety
- This project is backend-only and does not include UI. Keep keys private and rotate bot tokens if exposed.# OgCabal420-Mintwatcher
OgCabal420-Mintwatcher - Solana wallet monitoring bot that tracks CEX deposits, detects forwarding chains (>90%), and alerts on token mints. Uses WebSocket logSubscribe for efficient real-time monitoring. Sends wallet alerts and contract addresses to separate Telegram bots. Includes REST API for hot-reloading configurations.
