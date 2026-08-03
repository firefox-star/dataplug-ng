FROM node:20-slim
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production
ENV PORT=10000
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_URL=file:/app/db/custom.db

RUN mkdir -p /app/db /app/uploads/payment_proofs

EXPOSE 10000
CMD ["sh", "-c", "npx prisma db push --accept-data-loss 2>&1; node .next/standalone/server.js"]
