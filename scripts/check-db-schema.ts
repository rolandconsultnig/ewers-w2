#!/usr/bin/env tsx

/**
 * Database Schema Check Script
 * Compares current database schema with expected schema from shared/schema.ts
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

interface TableInfo {
  table_name: string;
  columns: ColumnInfo[];
}

async function getCurrentDatabaseSchema(): Promise<Record<string, TableInfo>> {
  const result = await db.execute(sql`
    SELECT 
      t.table_name,
      c.column_name,
      c.data_type,
      c.is_nullable,
      c.column_default
    FROM information_schema.tables t
    JOIN information_schema.columns c ON t.table_name = c.table_name
    WHERE t.table_schema = 'public'
    ORDER BY t.table_name, c.ordinal_position
  `);

  const schema: Record<string, TableInfo> = {};
  
  (result as any).rows.forEach((row: any) => {
    if (!schema[row.table_name]) {
      schema[row.table_name] = {
        table_name: row.table_name,
        columns: []
      };
    }
    schema[row.table_name].columns.push({
      column_name: row.column_name,
      data_type: row.data_type,
      is_nullable: row.is_nullable,
      column_default: row.column_default
    });
  });

  return schema;
}

function generateSchemaSQL(currentSchema: Record<string, TableInfo>): string {
  let sql = '-- Current Database Schema\n';
  sql += '-- Generated on: ' + new Date().toISOString() + '\n\n';
  
  Object.keys(currentSchema).sort().forEach(tableName => {
    const table = currentSchema[tableName];
    sql += `-- Table: ${tableName}\n`;
    sql += `CREATE TABLE ${tableName} (\n`;
    
    table.columns.forEach((col, index) => {
      const nullable = col.is_nullable === 'YES' ? '' : ' NOT NULL';
      const defaultValue = col.column_default ? ` DEFAULT ${col.column_default}` : '';
      const comma = index < table.columns.length - 1 ? ',' : '';
      
      sql += `  ${col.column_name} ${col.data_type}${nullable}${defaultValue}${comma}\n`;
    });
    
    sql += `);\n\n`;
  });
  
  return sql;
}

async function main() {
  try {
    console.log('🔍 Checking current database schema...');
    
    const currentSchema = await getCurrentDatabaseSchema();
    
    // Generate schema file
    const schemaSQL = generateSchemaSQL(currentSchema);
    const schemaFile = path.join(process.cwd(), 'current-db-schema.sql');
    fs.writeFileSync(schemaFile, schemaSQL);
    
    console.log(`✅ Current schema written to: ${schemaFile}`);
    
    // Summary
    const tableCount = Object.keys(currentSchema).length;
    const totalColumns = Object.values(currentSchema).reduce((sum, table) => sum + table.columns.length, 0);
    
    console.log(`\n📊 Schema Summary:`);
    console.log(`   Tables: ${tableCount}`);
    console.log(`   Total Columns: ${totalColumns}`);
    
    console.log('\n📋 Tables found:');
    Object.keys(currentSchema).sort().forEach(tableName => {
      const columnCount = currentSchema[tableName].columns.length;
      console.log(`   - ${tableName} (${columnCount} columns)`);
    });
    
    // Check for key tables
    const keyTables = ['users', 'incidents', 'data_sources', 'collected_data', 'processed_data', 'alerts'];
    const missingTables = keyTables.filter(table => !currentSchema[table]);
    
    if (missingTables.length > 0) {
      console.log('\n❌ Missing key tables:', missingTables.join(', '));
    } else {
      console.log('\n✅ All key tables present');
    }
    
    // Check incidents table structure specifically
    if (currentSchema.incidents) {
      const incidentColumns = currentSchema.incidents.columns.map(c => c.column_name);
      const expectedIncidentColumns = [
        'id', 'title', 'description', 'location', 'region', 'state', 'lga',
        'severity', 'status', 'reported_at', 'reported_by', 'source_id',
        'coordinates', 'category', 'related_indicators', 'impacted_population',
        'media_urls', 'verification_status', 'is_pinned', 'audio_recording_url',
        'audio_transcription', 'reporting_method', 'transcription_confidence',
        'processing_status', 'proposed_responder_type', 'final_responder_type',
        'assigned_responder_team_id', 'supervisor_id', 'coordinator_id', 'routed_at'
      ];
      
      const missingIncidentColumns = expectedIncidentColumns.filter(col => !incidentColumns.includes(col));
      const extraIncidentColumns = incidentColumns.filter(col => !expectedIncidentColumns.includes(col));
      
      if (missingIncidentColumns.length > 0) {
        console.log('\n❌ Missing incidents columns:', missingIncidentColumns.join(', '));
      }
      
      if (extraIncidentColumns.length > 0) {
        console.log('\n⚠️  Extra incidents columns:', extraIncidentColumns.join(', '));
      }
      
      if (missingIncidentColumns.length === 0 && extraIncidentColumns.length === 0) {
        console.log('\n✅ Incidents table schema is up to date');
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking schema:', error);
    process.exit(1);
  }
}

main().catch(console.error);
