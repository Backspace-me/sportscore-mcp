#!/usr/bin/env node
/**
 * sportscore-mcp — MCP server for SportScore's public sports-data API.
 *
 * Exposes 8 tools that map 1:1 to the SportScore REST endpoints documented at
 * https://sportscore.com/developers/.
 *
 * Two transports — pick at startup via env:
 *   • stdio (default) — for local MCP hosts like Claude Desktop, Cursor, Zed.
 *   • Streamable HTTP — for remote / hosted deployments (Glama connectors,
 *     browser hosts). Enabled by setting SPORTSCORE_HTTP_PORT.
 *
 * Environment variables:
 *   SPORTSCORE_API_BASE   Override the API base URL. Defaults to
 *                         https://sportscore.com
 *   SPORTSCORE_UA         Override the User-Agent string sent with requests.
 *   SPORTSCORE_HTTP_PORT  If set, run as a Streamable HTTP server on this
 *                         port instead of stdio. POST / GET /mcp.
 *   SPORTSCORE_HTTP_HOST  Bind address when SPORTSCORE_HTTP_PORT is set.
 *                         Defaults to 127.0.0.1 (expose via reverse proxy).
 *
 * Attribution: every tool response carries a `source` field pointing at
 * sportscore.com and a plain-English attribution line. Hosts typically
 * render this back to the user, which is how the "Powered by SportScore"
 * deal flows through AI-assisted workflows. If you're embedding this in a
 * commercial / white-label product, see https://sportscore.com/developers/terms/
 * for the paid tier (removes the attribution requirement).
 */

import { randomUUID } from "node:crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const API_BASE = (process.env.SPORTSCORE_API_BASE || "https://sportscore.com").replace(/\/+$/, "");
const UA = process.env.SPORTSCORE_UA || "sportscore-mcp/0.1 (+https://sportscore.com/developers/)";

const SPORTS = ["football", "basketball", "cricket", "tennis"];

// --- Tool schemas -----------------------------------------------------------

const sportSchema = {
  type: "string",
  enum: SPORTS,
  description: "Sport to query. One of football, basketball, cricket, tennis.",
};

const TOOLS = [
  {
    name: "get_matches",
    description:
      "List live and recent matches for a sport. Returns up to `limit` matches with scores, status, kickoff time and team logos. Good default for 'what's happening in football right now?'.",
    inputSchema: {
      type: "object",
      properties: {
        sport: sportSchema,
        limit: { type: "integer", minimum: 1, maximum: 50, default: 10 },
      },
      required: ["sport"],
    },
    path: "/api/widget/matches/",
    paramMap: (args) => ({ sport: args.sport, limit: args.limit ?? 10 }),
  },
  {
    name: "get_match_detail",
    description:
      "Get detailed data for a single match by its slug (e.g. 'manchester-united-vs-liverpool'): score, status, timeline, lineups. Slugs come from get_matches results or match URLs on sportscore.com.",
    inputSchema: {
      type: "object",
      properties: {
        sport: sportSchema,
        slug: { type: "string", description: "Match slug, e.g. 'manchester-united-vs-liverpool'." },
      },
      required: ["sport", "slug"],
    },
    path: "/api/widget/match/",
    paramMap: (args) => ({ sport: args.sport, slug: args.slug }),
  },
  {
    name: "get_team_schedule",
    description:
      "Get a team's past and upcoming fixtures by team slug (e.g. 'barcelona', 'manchester-united', 'los-angeles-lakers').",
    inputSchema: {
      type: "object",
      properties: {
        sport: sportSchema,
        slug: { type: "string", description: "Team slug." },
        limit: { type: "integer", minimum: 1, maximum: 30, default: 10 },
      },
      required: ["sport", "slug"],
    },
    path: "/api/widget/team/",
    paramMap: (args) => ({ sport: args.sport, slug: args.slug, limit: args.limit ?? 10 }),
  },
  {
    name: "get_standings",
    description:
      "Get the current standings table for a league or competition by slug (e.g. 'premier-league', 'la-liga', 'nba').",
    inputSchema: {
      type: "object",
      properties: {
        sport: sportSchema,
        slug: { type: "string", description: "Competition slug." },
      },
      required: ["sport", "slug"],
    },
    path: "/api/widget/standings/",
    paramMap: (args) => ({ sport: args.sport, slug: args.slug }),
  },
  {
    name: "get_top_scorers",
    description:
      "Get the top scorers (or top assisters) for a competition. Useful for 'who's leading the Premier League scoring charts?'.",
    inputSchema: {
      type: "object",
      properties: {
        sport: sportSchema,
        slug: { type: "string", description: "Competition slug." },
        limit: { type: "integer", minimum: 1, maximum: 50, default: 20 },
        stat: { type: "string", enum: ["goals", "assists"], default: "goals" },
      },
      required: ["sport", "slug"],
    },
    path: "/api/widget/topscorers/",
    paramMap: (args) => ({
      sport: args.sport,
      slug: args.slug,
      limit: args.limit ?? 20,
      stat: args.stat ?? "goals",
    }),
  },
  {
    name: "get_player",
    description:
      "Get player statistics and metadata by player slug (e.g. 'lionel-messi', 'lebron-james', 'virat-kohli').",
    inputSchema: {
      type: "object",
      properties: {
        sport: sportSchema,
        slug: { type: "string", description: "Player slug." },
      },
      required: ["sport", "slug"],
    },
    path: "/api/widget/player/",
    paramMap: (args) => ({ sport: args.sport, slug: args.slug }),
  },
  {
    name: "get_bracket",
    description:
      "Get the knockout bracket for a tournament (e.g. 'uefa-champions-league', 'nba-playoffs').",
    inputSchema: {
      type: "object",
      properties: {
        sport: sportSchema,
        slug: { type: "string", description: "Competition slug." },
      },
      required: ["sport", "slug"],
    },
    path: "/api/widget/bracket/",
    paramMap: (args) => ({ sport: args.sport, slug: args.slug }),
  },
  {
    name: "get_tracker",
    description:
      "Get live match tracker data (position, animation frames) for a match by numeric id. Usually only useful for football.",
    inputSchema: {
      type: "object",
      properties: {
        sport: sportSchema,
        id: { type: "string", description: "Numeric match id from the upstream provider." },
      },
      required: ["sport", "id"],
    },
    path: "/api/widget/tracker/",
    paramMap: (args) => ({ sport: args.sport, id: args.id }),
  },
];

const TOOL_BY_NAME = new Map(TOOLS.map((t) => [t.name, t]));

// --- HTTP fetch -------------------------------------------------------------

async function callApi(path, params) {
  const url = new URL(API_BASE + path);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, {
    headers: { "Accept": "application/json", "User-Agent": UA },
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text, _parse_error: "response was not valid JSON" };
  }
  return { status: res.status, url: url.toString(), body };
}

function attributionFooter() {
  return {
    source: "SportScore",
    source_url: "https://sportscore.com/",
    attribution: "Powered by SportScore — https://sportscore.com/",
  };
}

// --- MCP server factory -----------------------------------------------------

// Every HTTP session gets its own Server instance (the SDK expects one server
// per transport). Stdio uses a single instance. Same handlers in both cases —
// factoring them here keeps the two transports in lockstep.
function createServer() {
  const server = new Server(
    { name: "sportscore-mcp", version: "0.3.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: rawArgs } = req.params;
    const tool = TOOL_BY_NAME.get(name);
    if (!tool) {
      return {
        isError: true,
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
      };
    }
    const args = rawArgs ?? {};
    if (args.sport && !SPORTS.includes(args.sport)) {
      return {
        isError: true,
        content: [
          { type: "text", text: `Invalid sport '${args.sport}'. Must be one of: ${SPORTS.join(", ")}.` },
        ],
      };
    }

    const params = tool.paramMap(args);
    let result;
    try {
      result = await callApi(tool.path, params);
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: `Network error calling SportScore API: ${err.message}` }],
      };
    }

    const envelope = {
      tool: name,
      request_url: result.url,
      http_status: result.status,
      data: result.body,
      ...attributionFooter(),
    };

    return {
      content: [{ type: "text", text: JSON.stringify(envelope, null, 2) }],
      isError: result.status >= 400,
    };
  });

  return server;
}

// --- Transports -------------------------------------------------------------

async function runStdio() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // No stdout logging — that's reserved for the MCP protocol on stdio.
  process.stderr.write(`sportscore-mcp connected (stdio, API=${API_BASE})\n`);
}

async function runHttp(port, host) {
  // Lazy-load express — only pulled in when actually running in HTTP mode,
  // so the stdio install (the common case) stays zero-framework.
  const { default: express } = await import("express");

  const app = express();
  app.use(express.json({ limit: "1mb" }));

  // Health endpoint — useful for load balancers and uptime monitors. Does
  // not speak MCP, just returns 200 + a short JSON blob.
  app.get("/healthz", (_req, res) => {
    res.json({ ok: true, service: "sportscore-mcp", api: API_BASE });
  });

  // Sessions map: one transport + server per MCP session id. The SDK handles
  // session lifecycle via the `Mcp-Session-Id` header.
  const sessions = new Map();

  async function handleRequest(req, res) {
    try {
      const sessionId = req.headers["mcp-session-id"];
      let transport;
      if (sessionId && sessions.has(sessionId)) {
        transport = sessions.get(sessionId);
      } else {
        // New session: create a fresh Server + transport pair.
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (id) => {
            sessions.set(id, transport);
          },
        });
        transport.onclose = () => {
          if (transport.sessionId) sessions.delete(transport.sessionId);
        };
        const server = createServer();
        await server.connect(transport);
      }
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      process.stderr.write(`sportscore-mcp http error: ${err?.stack || err}\n`);
      if (!res.headersSent) res.status(500).json({ error: "internal_error" });
    }
  }

  app.post("/mcp", handleRequest);
  app.get("/mcp", handleRequest);
  app.delete("/mcp", handleRequest);

  app.listen(port, host, () => {
    process.stderr.write(
      `sportscore-mcp connected (http, bound=${host}:${port}, API=${API_BASE})\n`,
    );
  });
}

// --- Anonymous install-ping beacon -----------------------------------------
//
// Fire-and-forget POST to /api/mcp/ping/ on startup so we can see rough
// weekly-active-installs + version spread. Sends:
//
//   { client: "sportscore-mcp", version, transport, host, node }
//
// No user id, no IP, no fingerprint beyond the above fields.
// Opt out: set SPORTSCORE_NO_TELEMETRY=1 and no ping is sent.
// The POST has a 3 s timeout and failures are swallowed — the MCP server
// itself never blocks on this.
async function sendInstallPing(transport) {
  if (process.env.SPORTSCORE_NO_TELEMETRY === "1") return;
  try {
    const payload = {
      client: "sportscore-mcp",
      version: "0.3.0",
      transport,
      host: process.platform,
      node: process.versions.node,
    };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    await fetch(`${API_BASE}/api/mcp/ping/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": UA },
      body: JSON.stringify(payload),
      signal: controller.signal,
    }).catch(() => {});
    clearTimeout(timer);
  } catch {
    /* telemetry is best-effort */
  }
}

async function main() {
  const httpPort = process.env.SPORTSCORE_HTTP_PORT;
  if (httpPort) {
    const port = parseInt(httpPort, 10);
    if (!Number.isFinite(port) || port <= 0 || port > 65535) {
      process.stderr.write(`sportscore-mcp: invalid SPORTSCORE_HTTP_PORT=${httpPort}\n`);
      process.exit(1);
    }
    const host = process.env.SPORTSCORE_HTTP_HOST || "127.0.0.1";
    // Don't await — the ping must never delay startup.
    sendInstallPing("http");
    await runHttp(port, host);
  } else {
    sendInstallPing("stdio");
    await runStdio();
  }
}

main().catch((err) => {
  process.stderr.write(`sportscore-mcp fatal: ${err?.stack || err}\n`);
  process.exit(1);
});
