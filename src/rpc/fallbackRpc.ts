import {fetchTx as fetchTransaction} from './rpcUtils.js';
import parser from '../utils/parser.js';

/**
 * Fallback RPC utilities: when websocket log parsing fails, use HTTP RPC to fetch
 * the transaction and try to recover transfer/mint information from logMessages.
 * Implements simple retry/backoff and error handling to avoid flooding RPC.
 */

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function findTransfersInTx(rpcHttp: string, sig: string, retries = 3) {
  let attempt = 0;
  let backoff = 500;
  while (attempt < retries) {
    try {
      const tx = await fetchTransaction(rpcHttp, sig);
      if (!tx) return [];
      const logs: string[] = (tx.meta && tx.meta.logMessages) || [];
      const transfers: Array<{sender: string; receiver: string; lamports: number}> = [];
      for (const raw of logs) {
        const lam = parser.extractLamportsFromLog(raw);
        if (!lam) continue;
        const pks = parser.extractPubkeysFromLog(raw);
        if (pks.length >= 2) {
          transfers.push({sender: pks[0], receiver: pks[1], lamports: lam});
        }
      }
      return transfers;
    } catch (err) {
      attempt++;
      if (attempt >= retries) {
        console.error(`fallbackRpc: failed fetchTx ${sig} after ${attempt} attempts`, err);
        return [];
      }
      await sleep(backoff);
      backoff = Math.min(backoff * 2, 5000);
    }
  }
  return [];
}

export default {findTransfersInTx};
