// Smoke-test the Streamable HTTP transport. Boot the server with
// SPORTSCORE_HTTP_PORT set, POST an MCP initialize → notifications/initialized
// → tools/list sequence, then shut down.
//
// Usage: node test-http.mjs

import { spawn } from "node:child_process";

const PORT = 17345;
const BASE = `http://127.0.0.1:${PORT}/mcp`;

const child = spawn("node", ["src/index.js"], {
  env: { ...process.env, SPORTSCORE_HTTP_PORT: String(PORT), SPORTSCORE_HTTP_HOST: "127.0.0.1" },
  stdio: ["ignore", "pipe", "pipe"],
});
child.stdout.on("data", (c) => process.stdout.write(`out: ${c}`));
child.stderr.on("data", (c) => process.stderr.write(`err: ${c}`));
child.on("exit", (code) => console.log(`child exit ${code}`));

async function waitForUp() {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/healthz`);
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error("server did not come up in 5s");
}

// Streamable HTTP allows both direct JSON responses and SSE streams. The SDK
// picks based on `Accept` — we send both, and handle whichever we get.
async function rpc(payload, sessionId) {
  const headers = {
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream",
  };
  if (sessionId) headers["Mcp-Session-Id"] = sessionId;
  const r = await fetch(BASE, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const sid = r.headers.get("mcp-session-id") || sessionId;
  const ct = r.headers.get("content-type") || "";
  let body;
  if (ct.includes("text/event-stream")) {
    // Read SSE until we see one data event, then return its JSON.
    const text = await r.text();
    const m = text.match(/^data: (.+)$/m);
    body = m ? JSON.parse(m[1]) : { raw: text };
  } else {
    body = await r.json();
  }
  return { status: r.status, sessionId: sid, body };
}

async function main() {
  await waitForUp();
  console.log("health ok");

  // 1) initialize
  const init = await rpc({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "sportscore-mcp-http-test", version: "0.0.1" },
    },
  });
  console.log("\n== initialize ==");
  console.log(" status:", init.status, " session:", init.sessionId);
  console.log(" serverInfo:", JSON.stringify(init.body.result?.serverInfo));

  if (!init.sessionId) throw new Error("no session id returned");

  // 2) initialized notification
  await fetch(BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
      "Mcp-Session-Id": init.sessionId,
    },
    body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
  });

  // 3) tools/list
  const tools = await rpc({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }, init.sessionId);
  console.log("\n== tools/list ==");
  const list = tools.body.result?.tools || [];
  console.log(` count: ${list.length}`);
  for (const t of list) console.log(`  - ${t.name}`);

  child.kill("SIGTERM");
  process.exit(list.length > 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("ERR:", e.message);
  child.kill("SIGTERM");
  process.exit(2);
});
