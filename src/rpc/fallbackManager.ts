import {fetchTx} from './rpcUtils';
import parser from '../utils/parser';

/**
 * Fallback manager: allow rare HTTP RPC inspection only when explicitly triggered
 * (e.g. immediately after a NEW_WALLET detection). This module enforces per-wallet
 * rate limits and exponential backoff on 429 responses so the hot path never
 * floods the RPC provider.
 */

type InspectResult = Array<{sender: string; receiver: string; lamports: number}>;

const lastRequest = new Map<string, number>();
const inFlight = new Set<string>();

const DEFAULT_MIN_INTERVAL = Number(process.env.FALLBACK_MIN_INTERVAL || 10); // seconds
const MAX_RETRIES = 3;

async function sleep(ms:number){ return new Promise(r=>setTimeout(r, ms)); }

export async function inspectTxForWallet(rpcHttp: string, sig: string, wallet: string): Promise<InspectResult> {
  if (!rpcHttp) return [];
  const now = Date.now();
  const last = lastRequest.get(wallet) || 0;
  if (now - last < DEFAULT_MIN_INTERVAL * 1000) {
    // Rate-limited for this wallet
    return [];
  }
  if (inFlight.has(wallet)) return [];
  inFlight.add(wallet);
  lastRequest.set(wallet, now);

  let attempt = 0;
  let backoff = 500;
  try {
    while (attempt < MAX_RETRIES) {
      attempt++;
      try {
        const tx:any = await fetchTx(rpcHttp, sig);
        if (!tx) return [];
        const logs: string[] = (tx.meta && tx.meta.logMessages) || [];
        const transfers: InspectResult = [];
        for (const raw of logs) {
          const lam = parser.extractLamportsFromLog(raw);
          if (!lam) continue;
          const pks = parser.extractPubkeysFromLog(raw);
          if (pks.length >= 2) transfers.push({sender: pks[0], receiver: pks[1], lamports: lam});
        }
        return transfers;
      } catch (err:any) {
        // If provider signals rate-limit, backoff exponentially
        const msg = String(err || '');
        if (/429|rate limit/i.test(msg)) {
          await sleep(backoff);
          backoff = Math.min(backoff * 2, 5000);
          continue;
        }
        // non-retriable
        break;
      }
    }
    return [];
  } finally {
    inFlight.delete(wallet);
  }
}

export default {inspectTxForWallet};
