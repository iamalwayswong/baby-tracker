// Custom server: Next.js + WebSocket in one Node process.
// IMPORTANT: this file is plain JS run by `node` (NOT tsx). Running Next's
// internals under tsx breaks its AsyncLocalStorage runtime. Next compiles the
// app/TS itself; this server only needs a few primitives, inlined below so it
// imports no .ts files.
require("dotenv").config({ path: [".env.local", ".env"] });
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const jwt = require("jsonwebtoken");
const { WebSocketServer, WebSocket } = require("ws");
const { Pool } = require("pg");

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);
const SESSION_COOKIE = "session";

const app = next({ dev });
const handle = app.getRequestHandler();

// Small pool just for WS auth (caregiver membership check).
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === "false" ? false : { rejectUnauthorized: false },
});

// child_id -> set of live sockets
const rooms = new Map();
function join(childId, ws) {
  let set = rooms.get(childId);
  if (!set) rooms.set(childId, (set = new Set()));
  set.add(ws);
}
function leaveAll(ws) {
  rooms.forEach((set) => set.delete(ws));
}

// Bridge for Next route handlers (lib/realtime.ts) to push to sockets.
globalThis.__wsBroadcast = (childId, message) => {
  const set = rooms.get(childId);
  if (!set) return;
  const payload = JSON.stringify(message);
  set.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(payload);
  });
};

function cookieValue(header, name) {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

app.prepare().then(() => {
  const server = createServer((req, res) => handle(req, res, parse(req.url || "", true)));
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const { pathname, query } = parse(req.url || "", true);
    if (pathname !== "/ws") return; // let Next HMR etc. through
    wss.handleUpgrade(req, socket, head, async (ws) => {
      const token = cookieValue(req.headers.cookie, SESSION_COOKIE) || query.token || "";
      const user = verifyToken(token);
      const childId = query.childId;
      if (!user || !childId) return ws.close(4001, "unauthorized");
      try {
        const { rows } = await pool.query(
          "select 1 from caregivers where user_id = $1 and child_id = $2",
          [user.id, childId]
        );
        if (!rows.length) return ws.close(4003, "forbidden");
      } catch {
        return ws.close(1011, "server error");
      }
      join(childId, ws);
      ws.send(JSON.stringify({ kind: "connected", childId }));
      ws.on("close", () => leaveAll(ws));
      ws.on("error", () => leaveAll(ws));
    });
  });

  server.listen(port, () => {
    console.log(`> Nestling ready on http://localhost:${port} (dev=${dev})`);
  });
});
