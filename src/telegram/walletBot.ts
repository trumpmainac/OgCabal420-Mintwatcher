import fetch from 'node-fetch';
import events, {EVENT_NEW_WALLET, NewWalletPayload, EVENT_FORWARDED} from "../utils/events";

/**
 * WalletBot: sends new wallet alerts to TELEGRAM_WALLET_BOT only.
 * Subscribes to NewWalletDetected and forwarded events.
 */

const token = process.env.TELEGRAM_WALLET_BOT;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_API = (t?: string) => `https://api.telegram.org/bot${t}`;

function sendMessage(token: string | undefined, text: string) {
  if (!token) return Promise.resolve(null);
  const url = TELEGRAM_API(token) + "/sendMessage";
  const body: any = { text, parse_mode: 'HTML' };
  if (CHAT_ID) body.chat_id = CHAT_ID;
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).then(r => r.json()).catch(() => null);
}

// On new wallet
events.on(EVENT_NEW_WALLET, (p: NewWalletPayload) => {
  const sol = (p.amount / 1e9).toFixed(4);
  const text = `NEW WALLET — Received ${sol} SOL from ${p.parentCEX || 'unknown'}\nAddress: ${p.wallet}\nTime: ${p.timestamp || new Date().toISOString()}`;
  void sendMessage(token, text);
});

// Also notify on forwarded chain
events.on(EVENT_FORWARDED, (p: any) => {
  const sol = (p.amount_forwarded / 1e9).toFixed(4);
  const text = `NEW WALLET — Forwarded ${sol} SOL from ${p.parent}\nAddress: ${p.new_wallet}\nTime: ${new Date().toISOString()}`;
  void sendMessage(token, text);
});

export default {sendMessage};
