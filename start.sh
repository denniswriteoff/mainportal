#!/bin/bash

# Main Portal Startup Script

echo "🚀 Starting Main Portal..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "✅ Please edit .env with your configuration"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npx prisma generate

# Check if database is set up
echo "🗄️  Checking database..."
if npx prisma db push --accept-data-loss 2>&1 | grep -q "Error"; then
    echo "❌ Database connection failed. Please check your DATABASE_URL in .env"
    exit 1
fi

# Seed database
echo "🌱 Seeding database..."
npm run db:seed

# Start development server
echo "✨ Starting development server on http://localhost:3010"
npm run dev

