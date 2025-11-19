import EventEmitter from "events";

export const events = new EventEmitter();

// Event types (string constants)
export const EVENT_NEW_WALLET = "NewWalletDetected";
export const EVENT_FORWARDED = "ForwardedWallet";
export const EVENT_MINT = "MintDetected";

export type NewWalletPayload = {
  wallet: string;
  amount: number; // lamports
  parentCEX?: string;
  timestamp?: string;
};

export type ForwardPayload = {
  parent: string;
  new_wallet: string;
  amount_forwarded: number;
};

export type MintPayload = {
  contract: string;
  creator: string; // monitored wallet that created it
  timestamp?: string;
};

export default events;
