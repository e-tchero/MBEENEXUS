#!/bin/bash

# Delivery Platform - Database Reset Script
# This script resets the database to its initial state

set -e

echo "🗄️  Resetting database..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Reset the database
echo "📦 Resetting Supabase database..."
supabase db reset

echo "✅ Database reset complete!"
echo ""
echo "Next steps:"
echo "1. Run 'pnpm db:seed' to seed the database"
echo "2. Run 'pnpm dev' to start the development server"
