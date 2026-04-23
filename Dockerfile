# syntax=docker/dockerfile:1.6
#
# sportscore-mcp — Model Context Protocol server for SportScore.
#
# The image is intentionally tiny: the server is a single src/index.js
# with one dependency (@modelcontextprotocol/sdk). Multi-stage keeps the
# final image minimal — we don't ship npm, build tools, or the npm
# cache.
#
# Why Alpine: smallest working node base (~45 MB). Our deps are pure
# JS; no native compilation needed, so we don't need glibc.
#
# The default CMD runs the MCP server over stdio — which is what Glama
# (and Claude Desktop / Cursor / any MCP host) expects for introspection
# and tool calls.

# ---------- build stage ------------------------------------------------
FROM node:20-alpine AS build

WORKDIR /app

# Copy manifests first so the `npm ci` layer caches on code-only changes.
COPY package.json package-lock.json* ./

# Production-only install. --ignore-scripts is defensive — this package
# has no pre/postinstall hooks but it prevents a malicious transitive
# dep from executing during image build.
RUN npm ci --omit=dev --ignore-scripts

# ---------- runtime stage ----------------------------------------------
FROM node:20-alpine

# dumb-init reaps zombie children and forwards signals — matters because
# the MCP host (Claude Desktop etc.) sends SIGTERM on disconnect and we
# want a clean exit, not a stuck node process.
RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy the pruned production node_modules + source. Nothing else.
COPY --from=build /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY README.md LICENSE ./

# Run as the built-in non-root `node` user. No reason for root here —
# the server opens no ports, writes no files, just reads stdin / writes
# stdout.
USER node

# stdio is the MCP transport — no ports to EXPOSE.

# dumb-init as PID 1 for signal handling; node invokes the server.
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "src/index.js"]
