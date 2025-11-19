import WsClient from "../rpc/wsClient";
import walletStore from "../storage/walletStore";
import events, {EVENT_FORWARDED} from "../utils/events";
import parser from "../utils/parser";
import mintDetector from "./mintDetector";

/**
 * Watches outgoing transfers for watched wallets. If a watched wallet forwards >=90% of its
 * received_amount to a single NEW recipient, add the new wallet and emit forwarded event.
 */
export class WalletWatcher {
  private client: WsClient | null = null;
  private localSubs: number[] = [];

  constructor(private wssUrl: string) {}

  start() {
    this.client = new WsClient(this.wssUrl);
    this.client.on('open', () => console.log('wallet-ws open'));
    this.client.on('error', (e: any) => console.error('wallet-ws error', e));
    this.client.connect();

    // subscribe to all currently watched wallets using mentions filter for outgoing logs
    const watched = Object.keys(walletStore.listWatched());
    for (const w of watched) {
      const filter = {mentions: [w]};
      const localId = this.client.subscribeLogs(filter, (res: any) => this.onLog(res));
      this.localSubs.push(localId);
    }
  }

  private onLog(result: any) {
    try { mintDetector.handleLog(result); } catch (e) { /* ignore */ }

    const logs: string[] = result.logs || [];
    for (const raw of logs) {
      if (!raw.toLowerCase().includes('transfer')) continue;
      const pks = parser.extractPubkeysFromLog(raw);
      const lam = parser.extractLamportsFromLog(raw) || 0;
      if (pks.length < 2) continue;
      const sender = pks[0];
      const receiver = pks[1];
      if (!walletStore.isWatched(sender)) continue;

      const meta = walletStore.listWatched()[sender];
      if (!meta) continue;
      const received = meta.received_amount || 0;
      if (received <= 0) continue;

      if (lam >= Math.floor(received * 0.9) && !walletStore.isWatched(receiver)) {
        const payload = {wallet: receiver, amount: lam, parentCEX: sender, timestamp: new Date().toISOString()};
        walletStore.addWatched(payload);
        events.emit(EVENT_FORWARDED, {parent: sender, new_wallet: receiver, amount_forwarded: lam});
        // subscribe to the new wallet as well
        const filter = {mentions: [receiver]};
        const id = this.client?.subscribeLogs(filter, (res: any) => this.onLog(res));
        if (id) this.localSubs.push(id);
      }
    }
  }
}

export default WalletWatcher;
