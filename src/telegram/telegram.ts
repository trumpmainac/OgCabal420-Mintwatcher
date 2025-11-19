import fetch from 'node-fetch';
import events from '../utils/events';

const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const WALLET_TOKEN = process.env.TELEGRAM_WALLET_BOT;
const CA_TOKEN = process.env.TELEGRAM_CA_BOT;
const GLOBAL_TOKEN = process.env.TELEGRAM_BOT_TOKEN; // optional unified token

function TELE_API(token?: string){ return `https://api.telegram.org/bot${token}`; }

async function sendTelegramRaw(token: string | undefined, text: string) {
  if (!token) return null;
  const url = TELE_API(token) + '/sendMessage';
  const body: any = { text, parse_mode: 'HTML' };
  if (CHAT_ID) body.chat_id = CHAT_ID;
  try {
    const res = await fetch(url, {method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body)});
    const j = await res.json();
    if (!j || !j.ok) {
      console.error('telegram send failed', j);
      return null;
    }
    return j;
  } catch (e) {
    console.error('telegram send error', e);
    return null;
  }
}

export async function sendToWalletBot(text: string) {
  const token = GLOBAL_TOKEN || WALLET_TOKEN;
  return sendTelegramRaw(token, text);
}

export async function sendToCaBot(text: string) {
  const token = GLOBAL_TOKEN || CA_TOKEN;
  return sendTelegramRaw(token, text);
}

export function validateTelegramConfigOrThrow() {
  if (!CHAT_ID) throw new Error('TELEGRAM_CHAT_ID is not set in environment');
  if (!GLOBAL_TOKEN && !WALLET_TOKEN && !CA_TOKEN) throw new Error('No Telegram bot token found. Set TELEGRAM_BOT_TOKEN or TELEGRAM_WALLET_BOT/TELEGRAM_CA_BOT');
}

export async function sendStartupPing() {
  const text = 'Mintwatcher online';
  // prefer global token for startup, else wallet bot
  const token = GLOBAL_TOKEN || WALLET_TOKEN || CA_TOKEN;
  if (!token || !CHAT_ID) return null;
  return sendTelegramRaw(token, text);
}

// re-export events for convenience
export default { sendToWalletBot, sendToCaBot, validateTelegramConfigOrThrow, sendStartupPing };
