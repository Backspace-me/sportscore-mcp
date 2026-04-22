#!/usr/bin/env node
/**
 * sportscore-mcp — MCP server for SportScore's public sports-data API.
 *
 * Exposes 8 tools that map 1:1 to the SportScore REST endpoints documented at
 * https://sportscore.com/developers/. The transport is stdio (the standard
 * MCP transport for local hosts like Claude Desktop / Cursor).
 *
 * Environment variables:
 *   SPORTSCORE_API_BASE  Override the API base URL. Defaults to
 *                        https://sportscore.com
 *   SPORTSCORE_UA        Override the User-Agent string sent with requests.
 *
 * Attribution: every tool response carries a `source` field pointing at
 * sportscore.com and a plain-English attribution line. Hosts typically
 * render this back to the user, which is how the "Powered by SportScore"
 * deal flows through AI-assisted workflows. If you're embedding this in a
 * commercial / white-label product, see https://sportscore.com/developers/terms/
 * for the paid tier (removes the attribution requirement).
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
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

// --- MCP server -------------------------------------------------------------

const server = new Server(
  { name: "sportscore-mcp", version: "0.1.0" },
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

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // No stdout logging — that's reserved for the MCP protocol on stdio.
  // Anything we want to log goes to stderr.
  process.stderr.write(`sportscore-mcp connected (API=${API_BASE})\n`);
}

main().catch((err) => {
  process.stderr.write(`sportscore-mcp fatal: ${err?.stack || err}\n`);
  process.exit(1);
});
