FROM oven/bun:1.3.10-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN bun install --production
FROM oven/bun:1.3.10-alpine
RUN apk add --no-cache ffmpeg tini
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY src ./src
USER bun
ENTRYPOINT ["/sbin/tini","--"]
CMD ["bun","src/main.ts"]
