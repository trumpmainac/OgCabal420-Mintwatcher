import WsClient from "../rpc/wsClient.js";
import walletStore from "../storage/walletStore.js";
import events, {EVENT_NEW_WALLET} from "../utils/events.js";
import parser from "../utils/parser.js";
import mintDetector from "./mintDetector.js";

/**
 * CexListener uses the WsClient with real JSON-RPC `logsSubscribe` to listen
 * specifically for mentions of configured CEX addresses and program-level filters.
 */

export class CexListener {
  private client: WsClient | null = null;
  private localSubs: number[] = [];

  constructor(private wssUrl: string) {}

  start() {
    this.client = new WsClient(this.wssUrl);
    this.client.on('open', () => console.log('ws open'));
    this.client.on('close', () => console.log('ws closed'));
    this.client.on('error', (e: any) => console.error('ws error', e));
    this.client.connect();

    // subscribe to all enabled CEX addresses using real logsSubscribe with mentions filter
    for (const c of walletStore.getCexList()) {
      if (!c.enabled) continue;
      // use mentions filter for lowest RPC cost
      const filter = {mentions: [c.address]};
      const localId = this.client.subscribeLogs(filter, (result: any) => this.handleLog(result, c));
      this.localSubs.push(localId);
    }
  }

  private handleLog(result: any, cex: any) {
    // result contains {signature, err, logs, ...}
    try { mintDetector.handleLog(result); } catch (_) { /* ignore */ }

    const value = result.value || result;
    const logs: string[] = value.logs || [];
    for (const raw of logs) {
      const lam = parser.extractLamportsFromLog(raw);
      if (!lam) continue;
      const pks = parser.extractPubkeysFromLog(raw);
      if (pks.length < 2) continue;
      const receiver = pks[1];
      if (lam >= cex.min_deposit_lamports && lam <= cex.max_deposit_lamports) {
        // Always treat every valid CEX deposit as a new tracking cycle
        const payload = {wallet: receiver, amount: lam, parentCEX: cex.label, timestamp: new Date().toISOString()};
        walletStore.addWatchedCycle(receiver, lam);
        events.emit(EVENT_NEW_WALLET, payload);
      }
    }
  }
}
