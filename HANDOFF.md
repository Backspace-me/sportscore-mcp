# sportscore-mcp — ship checklist

This repo is built, committed, and functionally verified (tools/list and tools/call both work against the live sportscore.com API). Everything below needs your hands (GitHub login, npm account, registry accounts).

## 1. Create the GitHub repo + push

```bash
# From this directory (C:\Users\cancu\AppData\Local\Temp\claude-sportscore-mcp)

# Option A — use gh CLI if you have it:
gh repo create Backspace-me/sportscore-mcp \
  --public \
  --description "MCP server for SportScore — live scores, standings, top scorers, brackets for football, basketball, cricket, tennis. Free public API." \
  --homepage "https://sportscore.com/developers/" \
  --source=. \
  --push

# Option B — manually:
#   1. Go to https://github.com/organizations/Backspace-me/repositories/new
#      Name: sportscore-mcp
#      Visibility: Public
#      (no README, no license, no gitignore — we already have them)
#   2. Back here:
git remote add origin https://github.com/Backspace-me/sportscore-mcp.git
git push -u origin main
```

Add these GitHub topics on the repo settings page (helps discovery): `mcp`, `model-context-protocol`, `claude`, `cursor`, `sports`, `football`, `basketball`, `cricket`, `tennis`, `api`.

## 2. Publish to npm

Requires an npm account with publish rights on the `sportscore-mcp` name (or an org that owns it).

```bash
# First time? Log in:
npm login

# Double-check what's going to ship:
npm pack --dry-run

# Publish:
npm publish --access public
```

After publish, verify it installs:

```bash
npx -y sportscore-mcp   # should print "sportscore-mcp connected (API=...)" on stderr and then sit waiting on stdio
```

## 3. Tag the release on GitHub

```bash
git tag -a v0.1.0 -m "sportscore-mcp 0.1.0 — initial release"
git push --tags
```

Then on GitHub: Releases → Draft a new release → pick `v0.1.0` → copy the CHANGELOG.md entry into the body → publish.

## 4. Submit to MCP registries

### 4a. Anthropic Connectors (highest-value placement)

Destination: Anthropic's official connector directory (shown inside Claude.ai). Submission path varies — the current known path is via the MCP servers list maintained by Anthropic. Check https://www.anthropic.com/engineering/desktop-extensions and https://docs.claude.com/en/docs/mcp for the latest submission process; usually a PR or a form.

Expect to provide:

- Name: SportScore
- Short description: *"Live scores and sports data — football, basketball, cricket, tennis."*
- Long description: see README.md
- npm install command: `npx -y sportscore-mcp`
- Category: Sports / Data
- Icon: 1024×1024 PNG (grab one from https://sportscore.com/static/img/logo-sq.png or similar)
- Trust & safety statement: free public API, no auth, no PII handling, read-only

### 4b. Official MCP Registry

Repo: https://github.com/modelcontextprotocol/servers

1. Fork
2. Add an entry under the community servers list (format: link + one-line description). The repo's CONTRIBUTING.md will have the exact path.
3. Open a PR. Title suggestion: *"Add sportscore-mcp — live scores for football, basketball, cricket, tennis"*.
4. Body — paste the README.md "What it gives your AI assistant" section.

### 4c. Smithery

URL: https://smithery.ai/

1. Sign in with GitHub.
2. Click "Submit a server" / "Add server".
3. Point at https://github.com/Backspace-me/sportscore-mcp
4. Smithery autodetects config from `package.json` and the MCP server manifest.

### 4d. Claude MCP directory (glama.ai, claudemcp.com, awesome-mcp-servers)

- https://glama.ai/mcp/servers — form submission
- https://www.claudemcp.com/ — PR to their repo
- https://github.com/punkpeye/awesome-mcp-servers — PR adding a bullet under the appropriate category

All three accept a github URL + one-line description; write once, submit to all three.

## 5. Announce

Publish three announcement posts in the first 48 hours to seed initial traffic and backlinks:

- **Reddit — r/ClaudeAI and r/MCP**: title *"Live sports data for your Claude / Cursor workflows — sportscore-mcp"*. Show 2–3 example prompts. Link to npm + GitHub.
- **Hacker News** — "Show HN: SportScore MCP — free sports data for AI assistants". Post around 07:00 Pacific on a weekday for best front-page odds.
- **r/SportScoreLiveSports** (our own subreddit) — pinned post: *"Announcing: control SportScore from Claude / Cursor"*.

## 6. Track the backlinks that come back

For each registry we get listed on, the backlink to `https://sportscore.com/developers/` (or `https://sportscore.com/`) is the domain-authority payoff. After submission, re-run `curl -s https://sportscore.com/admin/backlinks/` in a week to see new referrers logged by Django's referer tracking.

---

## Local verification (already done, for your records)

```text
✓ MCP initialize handshake: protocolVersion=2024-11-05
✓ tools/list returns 8 tools
✓ get_matches tool call: HTTP 200, live data, attribution footer present
✓ All dependencies installed: 91 packages, clean
✓ git repo initialized, one commit on `main`
```

The package is ready to publish. Nothing blocking on the code side.
