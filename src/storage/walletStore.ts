import fs from "fs";
import path from "path";
import {NewWalletPayload} from "../utils/events";

const MONITORED_PATH = path.resolve(process.cwd(), "data/monitored_wallets.json");
const STATE_PATH = path.resolve(process.cwd(), "data/wallet_state.json");

type CEXEntry = {
  label: string;
  address: string;
  enabled: boolean;
  // Accept either SOL-based config or lamports-based for backward compatibility.
  // The store normalizes to lamports in-memory under `min_deposit_lamports` / `max_deposit_lamports`.
  min_deposit_sol?: number;
  max_deposit_sol?: number;
  min_deposit_lamports?: number;
  max_deposit_lamports?: number;
};

export class WalletStore {
  private cexList: CEXEntry[] = [];
  private watched: Record<string, any> = {};

  constructor() {
    this.load();
  }

  /** Load both monitored CEX list and runtime wallet_state */
  load() {
    try {
      const raw = fs.readFileSync(MONITORED_PATH, "utf8");
      const parsed = JSON.parse(raw) as CEXEntry[];
      // Normalize SOL fields to lamports for internal use
      this.cexList = parsed.map((e) => {
        const copy: any = {...e};
        if (typeof e.min_deposit_sol === 'number') copy.min_deposit_lamports = Math.floor(e.min_deposit_sol * 1e9);
        if (typeof e.max_deposit_sol === 'number') copy.max_deposit_lamports = Math.floor(e.max_deposit_sol * 1e9);
        // keep existing lamports if present
        return copy as CEXEntry;
      });
    } catch (e) {
      this.cexList = [];
    }
    try {
      const raw = fs.readFileSync(STATE_PATH, "utf8");
      const j = JSON.parse(raw);
      this.watched = j.watched_wallets || {};
    } catch (e) {
      this.watched = {};
    }
  }

  /** Persist CEX list to disk */
  saveCexList() {
    fs.writeFileSync(MONITORED_PATH, JSON.stringify(this.cexList, null, 2));
  }

  /** Persist runtime watched state */
  saveState() {
    fs.writeFileSync(STATE_PATH, JSON.stringify({watched_wallets: this.watched}, null, 2));
  }

  getCexList() {
    return this.cexList;
  }

  addCex(entry: CEXEntry) {
    const copy: any = {...entry};
    if (typeof entry.min_deposit_sol === 'number') copy.min_deposit_lamports = Math.floor(entry.min_deposit_sol * 1e9);
    if (typeof entry.max_deposit_sol === 'number') copy.max_deposit_lamports = Math.floor(entry.max_deposit_sol * 1e9);
    this.cexList.push(copy as CEXEntry);
    this.saveCexList();
  }

  removeCex(address: string) {
    this.cexList = this.cexList.filter((c) => c.address !== address);
    this.saveCexList();
  }

  isWatched(address: string) {
    return !!this.watched[address];
  }

  /** Add a watched wallet (result of a deposit or a forwarded) */
  addWatched(payload: NewWalletPayload) {
    const {wallet, amount, parentCEX, timestamp} = payload;
    this.watched[wallet] = {
      received_amount: amount,
      parentCEX: parentCEX || null,
      timestamp: timestamp || new Date().toISOString(),
      forwarded: false
    };
    this.saveState();
  }

  listWatched() {
    return this.watched;
  }
}

export default new WalletStore();
