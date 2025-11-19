import fetch from 'node-fetch';
import events, {EVENT_MINT, MintPayload} from "../utils/events";

const token = process.env.TELEGRAM_CA_BOT;
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

// When a mint is detected, only send to CA bot
events.on(EVENT_MINT, (p: MintPayload) => {
  const link = `https://solscan.io/token/${p.contract}`;
  const text = `MINT DETECTED — Token contract: ${p.contract}\nSolscan: ${link}\n(copy above address)`;
  void sendMessage(token, text);
});

export default {sendMessage};
