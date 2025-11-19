import WebSocket from "ws";
import { EventEmitter } from "events";

/**
 * Robust JSON-RPC WebSocket client tailored for Solana's `logsSubscribe`.
 * - Uses real JSON-RPC `logsSubscribe` and `logsUnsubscribe`.
 * - Keeps heartbeat via ws.ping
 * - Auto-reconnects and re-subscribes on reconnect
 * - Allows subscribing with arbitrary filters (programId, mentions, etc.)
 *
 * This implementation is provider-agnostic and will work with any Solana
 * RPC WSS endpoint that implements the JSON-RPC subscription protocol.
 */

type LocalSub = {
  id: number; // local id
  filter: any; // subscription filter (e.g. {mentions:[addr]} or {programId: ...})
  options: any;
  handler: (params: any) => void;
  rpcSubId?: number; // remote subscription id returned by server
};

export class WsClient extends EventEmitter {
  private url: string;
  private ws?: WebSocket;
  private nextLocalId = 1;
  private subs = new Map<number, LocalSub>();
  private rpcIdToLocal = new Map<number, number>();
  private reconnectDelay = 1000;
  private reconnecting = false;
  private pingIntervalMs = 20000;
  private pingTimer?: NodeJS.Timeout;

  constructor(url: string) {
    super();
    this.url = url;
  }

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
    this.ws = new WebSocket(this.url);
    this.ws.on("open", () => this.onOpen());
    this.ws.on("message", (data) => this.onMessage(data.toString()));
    this.ws.on("close", () => this.onClose());
    this.ws.on("error", (err) => this.onError(err));
    // support server pings
    this.ws.on('pong', () => {});
  }

  private onOpen() {
    this.reconnectDelay = 1000;
    this.emit("open");
    this.startHeartbeat();
    // re-subscribe existing local subs
    for (const [, s] of this.subs) {
      this.sendSubscribe(s);
    }
  }

  private onClose() {
    this.emit("close");
    this.stopHeartbeat();
    this.scheduleReconnect();
  }

  private onError(err: any) {
    this.emit('error', err);
    // close will trigger reconnect
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingTimer = setInterval(() => {
      try { this.ws?.ping(); } catch (_) { /* ignore */ }
    }, this.pingIntervalMs);
  }

  private stopHeartbeat() {
    if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = undefined; }
  }

  private scheduleReconnect() {
    if (this.reconnecting) return;
    this.reconnecting = true;
    setTimeout(() => {
      this.reconnecting = false;
      this.connect();
    }, this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 30000);
  }

  private onMessage(raw: string) {
    let msg: any;
    try { msg = JSON.parse(raw); } catch (e) { return; }

    // Handle subscription response (result contains subscription id)
    if (msg.id && typeof msg.result !== 'undefined') {
      const localId = this.rpcIdToLocal.get(msg.id);
      if (localId) {
        const sub = this.subs.get(localId);
        if (sub) sub.rpcSubId = msg.result;
      }
      return;
    }

    // Handle notifications
    if (msg.method && msg.params) {
      // Solana uses "logsNotification" method for logs
      if (msg.method === 'logsNotification' || msg.method === 'logs') {
        const params = msg.params || {};
        const rpcSubId = params.subscription || params?.result?.subscription;
        // find local sub by rpcSubId
        for (const [, s] of this.subs) {
          if (s.rpcSubId && s.rpcSubId === rpcSubId) {
            try { s.handler(params.result); } catch (_) { /* ignore handler errors */ }
            return;
          }
        }
        // As fallback, emit a generic logs event
        this.emit('logs', params.result);
      }
    }
  }

  /**
   * Subscribe to logs using a JSON-RPC logsSubscribe filter.
   * - `filter` is the subscription filter (e.g. {mentions:[addr]} or {programId: "..."}).
   * - `options` are passed as the second param to logsSubscribe (e.g., {commitment: 'confirmed'}).
   * Returns a local subscription id which can be used to unsubscribe.
   */
  subscribeLogs(filter: any, handler: (params: any) => void, options: any = {commitment: 'confirmed'}) {
    const id = this.nextLocalId++;
    const sub: LocalSub = {id, filter, options, handler};
    this.subs.set(id, sub);
    // If connected, send subscribe immediately
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendSubscribe(sub);
    } else {
      // ensure connection
      this.connect();
    }
    return id;
  }

  private sendSubscribe(sub: LocalSub) {
    const rpcId = this.nextLocalId * 1000 + Math.floor(Math.random() * 999);
    const payload = {jsonrpc: '2.0', id: rpcId, method: 'logsSubscribe', params: [sub.filter, sub.options]};
    try {
      this.rpcIdToLocal.set(rpcId, sub.id);
      this.ws?.send(JSON.stringify(payload));
    } catch (e) {
      // queue for later: clear mapping so it will be resent on reconnect
      this.rpcIdToLocal.delete(rpcId);
    }
  }

  unsubscribe(localId: number) {
    const sub = this.subs.get(localId);
    if (!sub) return;
    if (sub.rpcSubId && this.ws && this.ws.readyState === WebSocket.OPEN) {
      const payload = {jsonrpc: '2.0', id: this.nextLocalId++ , method: 'logsUnsubscribe', params: [sub.rpcSubId]};
      try { this.ws.send(JSON.stringify(payload)); } catch (_) {}
    }
    this.subs.delete(localId);
  }

  close() {
    try { this.ws?.close(); } catch (_) {}
  }
}

export default WsClient;
