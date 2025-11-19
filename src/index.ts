import dotenv from 'dotenv';
dotenv.config();

import MonitorManager from './core/monitorManager';
import createServer from './api/server';
import walletBot from './telegram/walletBot';
import caBot from './telegram/caBot';
import telegram from './telegram/telegram';
import fallbackManager from './rpc/fallbackManager';
import events, {EVENT_NEW_WALLET} from './utils/events';

const RPC_WSS = process.env.RPC_WSS || '';
const RPC_HTTP = process.env.RPC_HTTP || '';
const API_PORT = Number(process.env.API_PORT || 3000);

async function main() {
  if (!RPC_WSS) console.warn('RPC_WSS not set — ws subscriptions will fail until configured');
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

  // One-off fallback inspection: after a new wallet is detected, we may optionally
  // perform a single HTTP RPC inspection to confirm the wallet's first activity.
  // This is rate-limited by `fallbackManager` and only runs when `RPC_HTTP` is set.
  events.on(EVENT_NEW_WALLET, async (p: any) => {
    const rpc = RPC_HTTP;
    if (!rpc) return;
    // `p` should include `wallet` and sometimes `signature` if available; if no
    // signature is present we skip — we do not poll for signatures.
    const sig = (p as any).signature;
    if (!sig) return;
    try {
      const res = await fallbackManager.inspectTxForWallet(rpc, sig, p.wallet);
      if (res && res.length) console.log('Fallback inspection found transfers for', p.wallet, res.length);
    } catch (err) {
      console.error('Fallback inspection error', err);
    }
  });

  const app = createServer();
  app.listen(API_PORT, () => console.log(`API listening on ${API_PORT}`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
