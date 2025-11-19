import dotenv from 'dotenv';
dotenv.config();

import MonitorManager from './core/monitorManager';
import createServer from './api/server';
import walletBot from './telegram/walletBot';
import caBot from './telegram/caBot';

const RPC_WSS = process.env.RPC_WSS || '';
const RPC_HTTP = process.env.RPC_HTTP || '';
const API_PORT = Number(process.env.API_PORT || 3000);

async function main() {
  if (!RPC_WSS) console.warn('RPC_WSS not set — ws subscriptions will fail until configured');
  const manager = new MonitorManager(RPC_WSS, RPC_HTTP);
  manager.start();

  const app = createServer();
  app.listen(API_PORT, () => console.log(`API listening on ${API_PORT}`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
