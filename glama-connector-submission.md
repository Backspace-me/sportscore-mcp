# Glama Connectors Submission — SportScore MCP

Form: https://glama.ai/mcp/connectors (look for "Submit a connector" / "Add a connector" button)

## Server name
SportScore

## Endpoint URL
https://mcp.sportscore.com/mcp

## Transport
Streamable HTTP (MCP spec, protocol version `2024-11-05`). Supports both direct JSON responses and SSE streams depending on the `Accept` header.

## Authentication
None. Free public API, no API key required.

## Rate limits
~1000 requests / 24h / IP with 60-second edge caching. Sensible for any MCP workflow — a single chat session won't approach the limit.

## Short description (one line, under 120 chars)
Live scores, standings, top scorers, brackets, and player stats for football, basketball, cricket, and tennis. Free, no key.

## Full description (2-3 paragraphs)
SportScore MCP gives AI assistants real-time sports data across the four most-watched sports globally: football (soccer), basketball, cricket, and tennis. Ask "what Premier League matches are live?", "who leads La Liga scoring?", or "what's Barcelona's next fixture?" — the assistant gets structured data back from sportscore.com's public API.

Eight tools cover the common sports-data queries: live + recent matches, single match detail (score, status, timeline, lineups), team schedules, league standings, top scorers/assisters, player stats, knockout brackets, and live match tracker data. Tools are sport-parameterized, so the same `get_matches` tool works for Premier League as for NBA.

The API is free, requires no key, and attribution ("Powered by SportScore") rides along in every tool response — hosts can surface it to end users.

## Categories / tags
- Sports
- Data
- Real-time
- Free tier

## Icon
Use the SportScore favicon: https://sportscore.com/static/images/favicon-512.png
(If Glama wants a specific size, 512×512 PNG is available at that URL.)

## Links
- Source: https://github.com/Backspace-me/sportscore-mcp
- npm: https://www.npmjs.com/package/sportscore-mcp
- API docs: https://sportscore.com/developers/
- Terms: https://sportscore.com/developers/terms/
- Contact: api@sportscore.com

## Cross-reference
Already listed in the Glama server directory at:
https://glama.ai/mcp/servers/Backspace-me/sportscore-mcp
This connector submission is the hosted (remote) variant of the same server.
