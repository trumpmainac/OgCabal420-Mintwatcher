import {PublicKey} from "@solana/web3.js";

/**
 * Helpers to parse logs and deduce transfer/mint events.
 * These are conservative heuristics sufficient for the project's behavior rules.
 */

export function extractLamportsFromLog(log: string): number | null {
  // Many system-program transfer logs include "transfer <lamports> to <pubkey>"
  const m = log.match(/transfer (\d+) lamports?/i) || log.match(/transfer (\d+)/i);
  if (m) return Number(m[1]);
  return null;
}

export function extractPubkeysFromLog(log: string): string[] {
  // crude pubkey matcher (44+ base58 or typical solana 32-44 length)
  const re = /[1-9A-HJ-NP-Za-km-z]{32,44}/g;
  const all = log.match(re) || [];
  // de-duplicate
  return Array.from(new Set(all));
}

export function looksLikeMintLog(log: string): boolean {
  return /CreateMint|MintTo|InitializeMint|spl-token/.test(log);
}

export function normalizeAddress(pk: string): string {
  // ensure valid PublicKey string; best-effort pass-through
  try {
    return new PublicKey(pk).toBase58();
  } catch (e) {
    return pk;
  }
}

export default {extractLamportsFromLog, extractPubkeysFromLog, looksLikeMintLog, normalizeAddress};
