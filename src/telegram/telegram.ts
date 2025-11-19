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
  // Require either a global token or both specific tokens so both bot roles can be used
  if (!GLOBAL_TOKEN && !(WALLET_TOKEN && CA_TOKEN)) {
    throw new Error('Telegram tokens missing. Set TELEGRAM_BOT_TOKEN, or both TELEGRAM_WALLET_BOT and TELEGRAM_CA_BOT');
  }
}

export async function sendStartupPing() {
  // For backward-compatibility: send one startup ping using a global token or any available bot token.
  const text = 'Mintwatcher online';
  const token = GLOBAL_TOKEN || WALLET_TOKEN || CA_TOKEN;
  if (!token || !CHAT_ID) return null;
  return sendTelegramRaw(token, text);
}

export async function sendStartupPings() {
  // Send explicit startup pings to both wallet and CA bots when available.
  const text = 'Mintwatcher online';
  const results: any = {};
  if (!CHAT_ID) return results;

  if (WALLET_TOKEN) {
    try { results.wallet = await sendTelegramRaw(WALLET_TOKEN, `${text} (wallet bot)`); } catch (e) { results.wallet = null; }
  }
  if (CA_TOKEN) {
    try { results.ca = await sendTelegramRaw(CA_TOKEN, `${text} (CA bot)`); } catch (e) { results.ca = null; }
  }
  // If a global token is present and no specific bots, send via global token
  if (!WALLET_TOKEN && !CA_TOKEN && GLOBAL_TOKEN) {
    try { results.global = await sendTelegramRaw(GLOBAL_TOKEN, text); } catch (e) { results.global = null; }
  }
  return results;
}

// re-export events for convenience
export default { sendToWalletBot, sendToCaBot, validateTelegramConfigOrThrow, sendStartupPing, sendStartupPings };
