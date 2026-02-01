#!/bin/bash
set -e

echo "🚀 Bootstrapping Dairy Backend..."

echo "📦 Loading environment"
if [ ! -f .env ]; then
  echo "❌ .env file missing"
  exit 1
fi

echo "🗄️ Running migrations"
psql "$DATABASE_URL" -f migrations/001_init_schema.sql

echo "�� Seeding database"
node scripts/seed.js

echo "✅ Bootstrap completed"
