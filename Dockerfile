# Single image: gateway API + admin dashboard, run as two processes in one container.

FROM node:20-alpine AS web-deps
WORKDIR /web
COPY web/package*.json ./
RUN npm install

FROM node:20-alpine AS web-builder
WORKDIR /web
COPY --from=web-deps /web/node_modules ./node_modules
COPY web/ ./
RUN npm run build

FROM node:20-alpine AS server-deps
WORKDIR /server
COPY server/package*.json ./
# python3/make/g++: fallback toolchain for sqlite3's native binding in case
# no prebuilt binary matches this platform (musl/arm64/etc).
RUN apk add --no-cache --virtual .build-deps python3 make g++ \
  && npm install --omit=dev \
  && apk del .build-deps

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# server
COPY --from=server-deps /server/node_modules ./server/node_modules
COPY server/ ./server/

# web (standalone output requires next.config.ts: output: "standalone")
COPY --from=web-builder /web/public ./web/public
COPY --from=web-builder /web/.next/standalone ./web/
COPY --from=web-builder /web/.next/static ./web/.next/static

COPY start.sh ./start.sh
RUN chmod +x ./start.sh

ENV PORT=4000
ENV EXPRESS_API_URL=http://localhost:4000

# Embedded SQLite storage when DB_HOST isn't set (see server/config/vars.js).
# Declared as a volume so the database survives container restarts even
# without an explicit bind mount.
RUN mkdir -p ./server/data
VOLUME /app/server/data

EXPOSE 4000 3000

CMD ["./start.sh"]
