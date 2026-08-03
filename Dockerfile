# Dependencies
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --frozen-lockfile 2>/dev/null || npm install

# Builder
FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# Runner
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=10000
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_URL=file:/app/db/custom.db

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

# Also copy node_modules for Prisma CLI at runtime
COPY --from=builder /app/node_modules ./node_modules

RUN mkdir -p /app/db /app/uploads/payment_proofs

EXPOSE 10000
CMD ["sh", "-c", "npx prisma db push --accept-data-loss 2>&1; node server.js"]
