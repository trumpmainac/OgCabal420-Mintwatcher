import CexListener from "./cexListener";
import WalletWatcher from "./walletWatcher";

/**
 * Orchestrates listeners and manages in-memory state. Exposes start/stop.
 *
 * NOTE: This manager relies exclusively on the WebSocket `logsSubscribe` listener
 * (WsClient). The HTTP RPC fallback has been removed from the hot path to avoid
 * triggering rate limits on RPC providers. If you need ad-hoc historical
 * inspection, use a separate offline tool that calls RPC sparingly.
 */

export class MonitorManager {
  private cex: CexListener | null = null;
  private watcher: WalletWatcher | null = null;

  constructor(private wssUrl: string) {}

  start() {
    this.cex = new CexListener(this.wssUrl);
    this.cex.start();
    this.watcher = new WalletWatcher(this.wssUrl);
    this.watcher.start();

    console.log("MonitorManager started (WS-only mode)");
  }
}

export default MonitorManager;
