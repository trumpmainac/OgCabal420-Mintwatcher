import events, {EVENT_MINT, MintPayload} from "../utils/events";
import telegram, {sendToCaBot} from './telegram';

// When a mint is detected, only send to CA bot
events.on(EVENT_MINT, (p: MintPayload) => {
  const link = `https://solscan.io/token/${p.contract}`;
  const text = `MINT DETECTED — Token contract: ${p.contract}\nSolscan: ${link}\n(copy above address)`;
  void sendToCaBot(text);
});

export default {sendToCaBot};
