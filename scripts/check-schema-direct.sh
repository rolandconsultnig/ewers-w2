#!/bin/bash

# Direct database schema check using psql
# Bypasses Node.js SSL certificate issues

echo "🔍 Checking production database schema..."

# Database connection
DB_URL="postgresql://ewers_user:Samolan123@localhost:5432/ewers_db"

# Create schema file
echo "-- Production Database Schema" > production-db-schema.sql
echo "-- Generated on: $(date)" >> production-db-schema.sql
echo "-- Database: ewers_db" >> production-db-schema.sql
echo "" >> production-db-schema.sql

echo "📊 Tables found:"
psql "$DB_URL?sslmode=disable" -c "\dt" | grep -E "^\s+[a-z_]" | while read line; do
    table=$(echo $line | awk '{print $2}')
    echo "   - $table"
    
    # Get table structure
    echo "-- Table: $table" >> production-db-schema.sql
    echo "CREATE TABLE $table (" >> production-db-schema.sql
    
    # Get columns
    psql "$DB_URL?sslmode=disable" -c "\d $table" | grep -E "^\s+[a-z_]" | while read column_line; do
        column=$(echo $column_line | awk '{print $1}')
        type=$(echo $column_line | awk '{print $2}')
        default=$(echo $column_line | awk '{for(i=3;i<=NF;i++) printf $i" "}')
        
        # Clean up the default value
        default=$(echo $default | sed 's/default:://g' | sed 's/default//g' | sed 's/:://g' | xargs)
        
        if [[ -n "$default" ]]; then
            echo "  $column $type DEFAULT $default," >> production-db-schema.sql
        else
            echo "  $column $type," >> production-db-schema.sql
        fi
    done
    
    # Remove trailing comma and close table
    sed '$ s/,$//' production-db-schema.sql > temp && mv temp production-db-schema.sql
    echo ");" >> production-db-schema.sql
    echo "" >> production-db-schema.sql
done

echo ""
echo "✅ Schema written to: production-db-schema.sql"

# Check for key tables
echo ""
echo "🔍 Checking for key tables..."

key_tables=("users" "incidents" "data_sources" "collected_data" "processed_data" "alerts")

for table in "${key_tables[@]}"; do
    exists=$(psql "$DB_URL?sslmode=disable" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$table')")
    if [[ "$exists" == "t" ]]; then
        echo "✅ $table table exists"
    else
        echo "❌ $table table missing"
    fi
done

# Check incidents table columns
echo ""
echo "🔍 Checking incidents table structure..."
if psql "$DB_URL?sslmode=disable" -c "\d incidents" > /dev/null 2>&1; then
    echo "Incidents table columns:"
    psql "$DB_URL?sslmode=disable" -c "\d incidents" | grep -E "^\s+[a-z_]" | awk '{print "   - " $1 " (" $2 ")"}'
    
    # Check for missing expected columns
    expected_columns=("lga" "related_indicators" "impacted_population" "media_urls" "verification_status" "is_pinned" "audio_recording_url" "audio_transcription" "reporting_method" "transcription_confidence" "processing_status" "proposed_responder_type" "final_responder_type" "assigned_responder_team_id" "supervisor_id" "coordinator_id" "routed_at")
    
    echo ""
    echo "Missing columns in incidents table:"
    for col in "${expected_columns[@]}"; do
        exists=$(psql "$DB_URL?sslmode=disable" -tAc "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = '$col')")
        if [[ "$exists" != "t" ]]; then
            echo "   - $col"
        fi
    done
else
    echo "❌ Incidents table not found"
fi

# Check users table columns
echo ""
echo "🔍 Checking users table structure..."
if psql "$DB_URL?sslmode=disable" -c "\d users" > /dev/null 2>&1; then
    echo "Users table columns:"
    psql "$DB_URL?sslmode=disable" -c "\d users" | grep -E "^\s+[a-z_]" | awk '{print "   - " $1 " (" $2 ")"}'
    
    # Check for missing expected columns
    expected_columns=("security_level" "permissions" "department" "position" "phone_number" "email" "active" "last_login" "avatar")
    
    echo ""
    echo "Missing columns in users table:"
    for col in "${expected_columns[@]}"; do
        exists=$(psql "$DB_URL?sslmode=disable" -tAc "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = '$col')")
        if [[ "$exists" != "t" ]]; then
            echo "   - $col"
        fi
    done
else
    echo "❌ Users table not found"
fi

echo ""
echo "🚀 To apply schema updates, run:"
echo "   psql \"$DB_URL?sslmode=disable\" -f update-database-schema.sql"
