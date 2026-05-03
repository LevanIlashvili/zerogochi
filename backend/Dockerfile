# Zerogochi backend — NestJS + ethers + 0G SDKs
# Long-running process: HTTP API + Telegram bot polling + nag cron.
# Persistent state (users.json) lives at /app/data — mount a volume there.

FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++ libc6-compat
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund --omit=optional

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8787
ENV USERS_FILE=/app/data/users.json
RUN apk add --no-cache tini && mkdir -p /app/data
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.json nest-cli.json ./
COPY src ./src

# Drop privileges
RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app

EXPOSE 8787
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["npx", "tsx", "src/main.ts"]
