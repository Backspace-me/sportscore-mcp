# Cline MCP Marketplace — Submission for SportScore

Copy-paste the body below into a new issue at:
**https://github.com/cline/mcp-marketplace/issues/new**

Issue title: `Add SportScore MCP Server to Marketplace`

---

## GitHub Repo

https://github.com/Backspace-me/sportscore-mcp

## Logo

Attach a **400×400 PNG** with transparent background.
Drag-drop the file into the GitHub issue body where it says "paste images here"; GitHub will upload it and insert a `![](https://user-images.githubusercontent.com/...)` line.

(If you need a placeholder now: the repo has `assets/logo.png` — export a 400×400 crop.)

## Reason for Addition

SportScore MCP gives Cline users instant access to live sports data (football, basketball, cricket, tennis) with zero setup — no API keys, no paid plans, no rate-limit surprises for reasonable usage. It's positioned for developers building dashboards, fantasy apps, betting-adjacent tooling, or AI chat bots that answer "who won?" style queries.

Key differentiators vs existing sports MCPs:

- **Free forever** — the whole service is free in exchange for a visible "Powered by SportScore" dofollow backlink on pages that render the data. No credit card, no free-tier gotchas.
- **Four sports** in one connector — football/soccer, basketball, cricket, tennis. Most competitors cover one.
- **CORS-open REST API** — works from browser JS too, so Cline users can prototype client-side.
- **MCP-first design** — every tool response already includes a `source` attribution field and a plain-English attribution line to make Terms-of-Use compliance the default behavior.
- **OpenAPI 3.1 spec** published at https://sportscore.com/developers/openapi.yaml — Cline's tool schema generator reads it cleanly.
- **Published to npm** as `sportscore-mcp` and auto-discoverable via Smithery (`smithery.yaml` in repo root).

## Testing Confirmation

I confirm I have tested Cline's ability to set up the MCP server using only the `README.md` in the repo. The README covers:

- `npx -y sportscore-mcp` one-liner install
- `SPORTSCORE_API_BASE` and `SPORTSCORE_USER_AGENT` env vars with defaults
- The `source` attribution field returned in every tool response
- The dofollow backlink requirement under the free tier
- Links to the full API spec, terms, and attribution-badge gallery at https://sportscore.com/developers/

Verified install path:

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

Tools verified end-to-end: `live_scores`, `match_details`, `standings`, `top_scorers`, `player_stats`, `brackets`. All return JSON with the attribution line present.

## Additional Context

- License: MIT (SPDX-detected — pristine copy in repo root)
- Listed on Glama: https://glama.ai/mcp/servers/@Backspace-me/sportscore-mcp
- Submitted to `punkpeye/awesome-mcp-servers` (PR #5243)
- npm: https://www.npmjs.com/package/sportscore-mcp
- Maintainer contact: api@sportscore.com
