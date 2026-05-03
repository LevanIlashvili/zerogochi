# Zerogochi frontend — Next.js 14 mini-app
# Multi-stage: deps -> build (with NEXT_PUBLIC_* baked in via build args) ->
# tiny standalone runtime.

FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund --omit=optional

FROM node:20-alpine AS builder
WORKDIR /app

# NEXT_PUBLIC_* are baked into the static bundle at build time, so they have
# to be passed as build args. Pass them via Easypanel's Docker build args UI
# (or `--build-arg` on the command line).
ARG NEXT_PUBLIC_BACKEND_URL
ARG NEXT_PUBLIC_RPC_URL=https://evmrpc.0g.ai
ARG NEXT_PUBLIC_CHAIN_ID=16661
ARG NEXT_PUBLIC_FORWARDER
ARG NEXT_PUBLIC_ZEROGOCHI

ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_RPC_URL=$NEXT_PUBLIC_RPC_URL
ENV NEXT_PUBLIC_CHAIN_ID=$NEXT_PUBLIC_CHAIN_ID
ENV NEXT_PUBLIC_FORWARDER=$NEXT_PUBLIC_FORWARDER
ENV NEXT_PUBLIC_ZEROGOCHI=$NEXT_PUBLIC_ZEROGOCHI
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.json next.config.mjs next-env.d.ts ./
COPY src ./src
COPY public ./public

RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache tini

# Copy only what the standalone runtime needs.
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app

EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
