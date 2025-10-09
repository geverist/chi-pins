#!/bin/bash

# Supabase connection details
DB_URL="postgresql://postgres.xxwqmakcrchgefgzrulf:Chicago2024!@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

echo "Running pin_comments localization migration..."

# Run the migration
psql "$DB_URL" -f ../supabase/migrations/20251009_pin_comments_localized.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully!"

    # Test the function
    echo ""
    echo "Testing geographic filtering..."
    psql "$DB_URL" -c "SELECT COUNT(*) as comment_count FROM get_comments_in_bounds(41.4, 42.3, -88.5, -87.0, 100);"

    echo "✅ pin_comments table ready with geographic indexing"
else
    echo "❌ Migration failed"
    exit 1
fi
