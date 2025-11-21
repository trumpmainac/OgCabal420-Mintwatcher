import fetch from 'node-fetch';
import {Connection, PublicKey} from "@solana/web3.js";

/**
 * Small helper utilities for occasional HTTP RPC calls.
 */

export async function fetchTx(rpcHttp: string, sig: string) {
  const conn = new Connection(rpcHttp, {commitment: 'confirmed', wsEndpoint: rpcHttp.replace('http', 'ws')});
  return conn.getTransaction(sig, {maxSupportedTransactionVersion: 0});
}

export async function getBalance(rpcHttp: string, address: string): Promise<number> {
  const conn = new Connection(rpcHttp, {commitment: 'confirmed', wsEndpoint: rpcHttp.replace('http', 'ws')});
  return conn.getBalance(new PublicKey(address));
}

export default {fetchTx, getBalance};
