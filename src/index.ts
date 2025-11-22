import dotenv from 'dotenv';
dotenv.config();

import MonitorManager from './core/monitorManager.js';
import createServer from './api/server.js';
import walletBot from './telegram/walletBot.js';
import caBot from './telegram/caBot.js';
import telegram from './telegram/telegram.js';
// import fallbackManager from './rpc/fallbackManager.js'; // Removed HTTP dependency
import events, {EVENT_NEW_WALLET} from './utils/events.js';

const RPC_WSS = process.env.RPC_WSS || '';
// const RPC_HTTP = process.env.RPC_HTTP || ''; // Removed HTTP dependency
const API_PORT = Number(process.env.API_PORT || 3000);

async function main() {
  if (!RPC_WSS) {
    console.error('RPC_WSS not set — ws subscriptions will fail.');
    process.exit(1);
  }
  const manager = new MonitorManager(RPC_WSS);
  manager.start();
  // Validate Telegram config and send startup ping
  try {
    telegram.validateTelegramConfigOrThrow();
    const res = await telegram.sendStartupPings();
    console.log('Telegram startup pings result:', res);
  } catch (e:any) {
    console.error('Telegram config error:', e.message);
    process.exit(1);
  }

// Removed HTTP fallback logic as per user request for WebSocket-only operation.

  const app = createServer();
  app.listen(API_PORT, () => console.log(`API listening on ${API_PORT}`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
