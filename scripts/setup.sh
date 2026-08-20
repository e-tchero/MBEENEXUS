#!/bin/bash

# Delivery Platform - Project Setup Script
# This script sets up the development environment

set -e

echo "🚀 Setting up Delivery Platform..."

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Please install it first:"
    echo "   npm install -g pnpm"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install it first:"
    echo "   https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"
echo "✅ pnpm version: $(pnpm --version)"

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Copy .env.example to .env if it doesn't exist
if [ ! -f .env ]; then
    echo "📋 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please update .env with your actual configuration values"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env with your Supabase credentials"
echo "2. Run 'pnpm dev' to start the development server"
echo "3. Visit http://localhost:3000"
echo ""
echo "Available commands:"
echo "  pnpm dev          - Start development server"
echo "  pnpm build        - Build for production"
echo "  pnpm lint         - Run linter"
echo "  pnpm typecheck    - Run type checking"
echo "  pnpm test         - Run tests"
echo "  pnpm db:migrate   - Run database migrations"
echo "  pnpm db:seed      - Seed database"
echo "  pnpm db:reset     - Reset database"
