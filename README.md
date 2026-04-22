# sportscore-mcp

MCP server for [SportScore](https://sportscore.com/) — live scores, match details, standings, top scorers, brackets and player stats across **football**, **basketball**, **cricket** and **tennis**. Free public API, CORS-open, no API key.

Works in any [Model Context Protocol](https://modelcontextprotocol.io/) host: Claude Desktop, Cursor, Continue, Zed, and custom MCP clients.

## What it gives your AI assistant

- Live + recent matches by sport
- Single match detail (score, status, timeline, lineups)
- Team schedules
- League / competition standings
- Top scorers / top assisters
- Player statistics and metadata
- Knockout tournament brackets
- Live match tracker data

## Install in Claude Desktop

Add this to `claude_desktop_config.json`:

**macOS** — `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows** — `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "sportscore": {
      "command": "npx",
      "args": ["-y", "sportscore-mcp"]
    }
  }
}
```

Restart Claude Desktop. You should see the SportScore tools in the tools menu. Ask things like:

- *"What Premier League matches are live right now?"*
- *"Show me the NBA standings."*
- *"Who are the top scorers in La Liga?"*
- *"What's Barcelona's next fixture?"*

## Install in Cursor / Continue / Zed

Any MCP host that accepts a stdio command works. The `npx -y sportscore-mcp` invocation is the same — consult your host's MCP docs for the exact config file.

## Configuration

Environment variables (optional):

| Variable | Default | Purpose |
|---|---|---|
| `SPORTSCORE_API_BASE` | `https://sportscore.com` | Override the API base URL (useful for staging / self-hosted) |
| `SPORTSCORE_UA` | `sportscore-mcp/0.1 (+https://sportscore.com/developers/)` | Override the User-Agent string |

## Tools

| Tool | Purpose | Required args |
|---|---|---|
| `get_matches` | Live + recent matches | `sport` |
| `get_match_detail` | Single match by slug | `sport`, `slug` |
| `get_team_schedule` | Team fixtures | `sport`, `slug` |
| `get_standings` | League table | `sport`, `slug` |
| `get_top_scorers` | Top scorers / assisters | `sport`, `slug` |
| `get_player` | Player stats | `sport`, `slug` |
| `get_bracket` | Knockout bracket | `sport`, `slug` |
| `get_tracker` | Live tracker data | `sport`, `id` |

Full parameter docs and response shapes: [sportscore.com/developers/](https://sportscore.com/developers/) · [OpenAPI 3.0 spec](https://sportscore.com/developers/openapi.yaml)

## Attribution

This MCP server surfaces a `Powered by SportScore` attribution with every tool result. The free-tier API requires that attribution to remain visible in end-user-facing output — so please don't strip it from your prompts or post-processing.

Commercial / white-label use that needs to remove the attribution: [api@sportscore.com](mailto:api@sportscore.com). Terms: [sportscore.com/developers/terms/](https://sportscore.com/developers/terms/).

## Rate limits

Free tier: approximately 1000 requests / 24h / IP, with 60-second edge caching. Sensible for any MCP workflow — a user driving a chat session will not approach the limit. Bulk / production / higher-volume use: contact [api@sportscore.com](mailto:api@sportscore.com).

## License

MIT — see [LICENSE](./LICENSE).

## Links

- [SportScore](https://sportscore.com/)
- [Developer portal + REST API docs](https://sportscore.com/developers/)
- [OpenAPI 3.0 spec](https://sportscore.com/developers/openapi.yaml)
- [API terms of use](https://sportscore.com/developers/terms/)
- [Report an issue](https://github.com/SportScoreLiveSports/sportscore-mcp/issues)
