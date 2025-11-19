import CexListener from "./cexListener";
import WalletWatcher from "./walletWatcher";
import mintDetector from "./mintDetector";
import walletStore from "../storage/walletStore";
import events from "../utils/events";

/**
 * Orchestrates listeners and manages in-memory state. Exposes start/stop.
 */

export class MonitorManager {
  private cex: CexListener | null = null;
  private watcher: WalletWatcher | null = null;

  constructor(private wssUrl: string, private rpcHttp: string) {}

  start() {
    this.cex = new CexListener(this.wssUrl);
    this.cex.start();
    this.watcher = new WalletWatcher(this.wssUrl);
    this.watcher.start();

    // mintDetector listens indirectly via events: components call it when logs arrive.
    console.log("MonitorManager started");
  }
}

export default MonitorManager;
