import events, {EVENT_NEW_WALLET, NewWalletPayload, EVENT_FORWARDED} from "../utils/events.js";
import telegram, {sendToWalletBot} from './telegram.js';

// On new wallet
events.on(EVENT_NEW_WALLET, (p: NewWalletPayload) => {
  const sol = (p.amount / 1e9).toFixed(4);
  const text = `NEW WALLET — Received ${sol} SOL from ${p.parentCEX || 'unknown'}\nAddress: ${p.wallet}\nTime: ${p.timestamp || new Date().toISOString()}`;
  void sendToWalletBot(text);
});

// Also notify on forwarded chain
events.on(EVENT_FORWARDED, (p: any) => {
  const sol = (p.amount_forwarded / 1e9).toFixed(4);
  const text = `NEW WALLET — Forwarded ${sol} SOL from ${p.parent}\nAddress: ${p.new_wallet}\nTime: ${new Date().toISOString()}`;
  void sendToWalletBot(text);
});

export default {sendToWalletBot};
