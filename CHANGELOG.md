# Changelog

All notable changes to sportscore-mcp will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] — 2026-04-23

### Added
- `mcpName` in `package.json` for MCP Registry validation.

### Changed
- Namespace: `io.github.backspace-me/sportscore-mcp` (required for official MCP Registry listing).

## [0.1.0] — 2026-04-23

### Added
- Initial release.
- 8 tools mapping to the SportScore public REST API:
  `get_matches`, `get_match_detail`, `get_team_schedule`, `get_standings`,
  `get_top_scorers`, `get_player`, `get_bracket`, `get_tracker`.
- Stdio transport (compatible with Claude Desktop, Cursor, Continue, Zed).
- Attribution footer in every tool response.
- `SPORTSCORE_API_BASE` and `SPORTSCORE_UA` environment overrides.
