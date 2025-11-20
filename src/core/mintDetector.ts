import events, {EVENT_MINT, MintPayload} from "../utils/events.js";
import parser from "../utils/parser.js";
import walletStore from "../storage/walletStore.js";

/**
 * Scans logs for mint-related entries coming from monitored wallets.
 * When a mint is detected, emits EVENT_MINT with the contract address.
 */

export class MintDetector {
  handleLog(logResult: any) {
    const value = logResult.value || logResult;
    const logs: string[] = value.logs || [];
    // find any log that looks like a mint
    for (const raw of logs) {
      if (!parser.looksLikeMintLog(raw)) continue;
      const pks = parser.extractPubkeysFromLog(raw);
      if (pks.length === 0) continue;
      // Heuristic: the first long pubkey found which is not the monitored wallet is likely the token mint
      let maybeMint = pks.find((p) => !walletStore.isWatched(p));
      if (!maybeMint) maybeMint = pks[0];
      const payload: MintPayload = {contract: maybeMint, creator: "unknown", timestamp: new Date().toISOString()};
      events.emit(EVENT_MINT, payload);
    }
  }
}

export default new MintDetector();
