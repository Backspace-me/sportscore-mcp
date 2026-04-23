// Smoke-test the MCP server the same way Glama will: start it, perform
// the JSON-RPC initialize handshake, then ask for tools/list. If the
// server speaks MCP correctly over stdio, Glama's introspection check
// will pass once the Dockerfile wraps this process.
//
// Usage: node test-introspect.mjs

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";

const CHILD = "node";
const ARGS = ["src/index.js"];

const child = spawn(CHILD, ARGS, { stdio: ["pipe", "pipe", "pipe"] });

let stdoutBuf = "";
const pending = new Map(); // id -> resolve
let nextId = 1;

child.stdout.on("data", (chunk) => {
  stdoutBuf += chunk.toString();
  // MCP framing: one JSON-RPC message per line (stdio transport).
  let idx;
  while ((idx = stdoutBuf.indexOf("\n")) !== -1) {
    const line = stdoutBuf.slice(0, idx).trim();
    stdoutBuf = stdoutBuf.slice(idx + 1);
    if (!line) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.id != null && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
      } else {
        // Log notifications / unmatched responses.
        console.log("NOTIFY:", JSON.stringify(msg).slice(0, 200));
      }
    } catch (e) {
      console.log("NON-JSON STDOUT:", line.slice(0, 200));
    }
  }
});

child.stderr.on("data", (chunk) => {
  process.stderr.write("stderr: " + chunk);
});

child.on("exit", (code) => {
  if (code !== 0) console.log(`child exited: ${code}`);
});

function send(method, params) {
  const id = nextId++;
  const msg = { jsonrpc: "2.0", id, method, params };
  return new Promise((resolve, reject) => {
    pending.set(id, resolve);
    child.stdin.write(JSON.stringify(msg) + "\n");
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error(`timeout on ${method}`));
      }
    }, 5000);
  });
}

function notify(method, params) {
  const msg = { jsonrpc: "2.0", method, params };
  child.stdin.write(JSON.stringify(msg) + "\n");
}

async function main() {
  // 1) initialize — the mandatory first step for any MCP client.
  const init = await send("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "sportscore-mcp-introspect", version: "0.0.1" },
  });
  console.log("\n== initialize ==");
  console.log(" serverInfo:", JSON.stringify(init.result?.serverInfo));
  console.log(" capabilities:", JSON.stringify(init.result?.capabilities));

  // 2) signal we're done handshaking.
  notify("notifications/initialized", {});

  // 3) the actual introspection check — enumerate tools.
  const toolsResp = await send("tools/list", {});
  const tools = toolsResp.result?.tools || [];
  console.log("\n== tools/list ==");
  console.log(` count: ${tools.length}`);
  for (const t of tools) {
    console.log(`  - ${t.name}: ${t.description?.slice(0, 80)}...`);
  }

  child.kill("SIGTERM");
  process.exit(tools.length > 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("ERR:", e.message);
  child.kill("SIGTERM");
  process.exit(2);
});
