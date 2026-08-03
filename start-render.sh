#!/bin/sh
# Startup script for Render.com
set -e

echo "[startup] Creating directories..."
mkdir -p /app/db /app/uploads/payment_proofs

echo "[startup] Running Prisma db push..."
npx prisma db push --accept-data-loss 2>&1 || echo "[startup] Prisma push completed (may have errors)"

echo "[startup] Starting server..."
exec node server.js
