# syntax=docker/dockerfile:1

# ---- Build: install everything, compile the client and server bundles ----------------
FROM node:22-bookworm-slim AS build
WORKDIR /app

# better-sqlite3 normally downloads a prebuilt binary. The toolchain is only here as a
# fallback for when one isn't available, and never makes it into the runtime image.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build \
 && npm prune --omit=dev --no-audit --no-fund

# ---- Runtime: just Node, production deps and the built files -------------------------
FROM node:22-bookworm-slim AS runtime

ARG APP_VERSION=dev
ENV NODE_ENV=production \
    APP_VERSION=${APP_VERSION} \
    HOST=0.0.0.0 \
    PORT=3000 \
    DATA_DIR=/data \
    STATIC_DIR=/app/dist/client \
    APP_TIMEZONE=Europe/London

WORKDIR /app
COPY --from=build --chown=1000:1000 /app/package.json ./package.json
COPY --from=build --chown=1000:1000 /app/node_modules ./node_modules
COPY --from=build --chown=1000:1000 /app/dist ./dist

# /data holds the SQLite database and any licensed hazard clips (/data/media).
RUN mkdir -p /data && chown 1000:1000 /data

# Numeric user so Kubernetes can verify runAsNonRoot. 1000 is the "node" user in this image.
USER 1000:1000
EXPOSE 3000
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

# Exec form so Node is PID 1 and gets SIGTERM directly. The server handles it and
# closes SQLite cleanly before exiting.
STOPSIGNAL SIGTERM
CMD ["node", "dist/server/index.js"]
