// Bridge that lets Next route handlers push messages to WebSocket clients.
// The WS server (server.ts) installs `__wsBroadcast` on globalThis; route
// handlers call broadcast() after a DB write. Using globalThis keeps it
// working across the module boundary between Next's bundle and server.ts.

type BroadcastFn = (childId: string, message: unknown) => void;
const g = globalThis as unknown as { __wsBroadcast?: BroadcastFn };

export function setBroadcaster(fn: BroadcastFn) {
  g.__wsBroadcast = fn;
}

export function broadcast(childId: string, message: unknown) {
  g.__wsBroadcast?.(childId, message);
}
