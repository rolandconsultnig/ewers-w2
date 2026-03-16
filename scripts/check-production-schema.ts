#!/usr/bin/env tsx

/**
 * Production Database Schema Check Script
 * Connects to production database and generates schema report
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

// Production database connection
const DATABASE_URL = "postgresql://ewers_user:Samolan123@localhost:5432/ewers_db";

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
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: false
  });
  const db = drizzle(pool);
  
  try {
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
        AND t.table_type = 'BASE TABLE'
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
  } finally {
    await pool.end();
  }
}

function generateSchemaSQL(currentSchema: Record<string, TableInfo>): string {
  let sql = '-- Production Database Schema\n';
  sql += '-- Generated on: ' + new Date().toISOString() + '\n';
  sql += '-- Database: ewers_db\n\n';
  
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

function generateMigrationSQL(currentSchema: Record<string, TableInfo>): string {
  let sql = '-- Migration SQL for Production Database\n';
  sql += '-- Generated on: ' + new Date().toISOString() + '\n\n';
  
  // Check for incidents table specifically
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
      sql += '-- Missing columns in incidents table:\n';
      missingIncidentColumns.forEach(col => {
        const columnDefs: Record<string, string> = {
          'lga': 'text',
          'related_indicators': 'integer[]',
          'impacted_population': 'integer',
          'media_urls': 'text[]',
          'verification_status': 'text DEFAULT \'unverified\'',
          'is_pinned': 'boolean DEFAULT false',
          'audio_recording_url': 'text',
          'audio_transcription': 'text',
          'reporting_method': 'text DEFAULT \'text\'',
          'transcription_confidence': 'integer',
          'processing_status': 'text DEFAULT \'draft\'',
          'proposed_responder_type': 'text',
          'final_responder_type': 'text',
          'assigned_responder_team_id': 'integer',
          'supervisor_id': 'integer',
          'coordinator_id': 'integer',
          'routed_at': 'timestamp'
        };
        
        if (columnDefs[col]) {
          sql += `ALTER TABLE incidents ADD COLUMN ${col} ${columnDefs[col]};\n`;
        }
      });
      sql += '\n';
    }
  }
  
  // Check users table
  if (currentSchema.users) {
    const userColumns = currentSchema.users.columns.map(c => c.column_name);
    const expectedUserColumns = [
      'id', 'username', 'password', 'full_name', 'role', 'security_level',
      'permissions', 'department', 'position', 'phone_number', 'email',
      'active', 'last_login', 'avatar'
    ];
    
    const missingUserColumns = expectedUserColumns.filter(col => !userColumns.includes(col));
    
    if (missingUserColumns.length > 0) {
      sql += '-- Missing columns in users table:\n';
      missingUserColumns.forEach(col => {
        const columnDefs: Record<string, string> = {
          'security_level': 'integer DEFAULT 1',
          'permissions': 'jsonb DEFAULT \'["view"]\'',
          'department': 'text',
          'position': 'text',
          'phone_number': 'text',
          'email': 'text',
          'active': 'boolean DEFAULT true',
          'last_login': 'timestamp',
          'avatar': 'text'
        };
        
        if (columnDefs[col]) {
          sql += `ALTER TABLE users ADD COLUMN ${col} ${columnDefs[col]};\n`;
        }
      });
      sql += '\n';
    }
  }
  
  return sql;
}

async function main() {
  try {
    console.log('🔍 Checking production database schema...');
    
    const currentSchema = await getCurrentDatabaseSchema();
    
    // Generate schema file
    const schemaSQL = generateSchemaSQL(currentSchema);
    const schemaFile = path.join(process.cwd(), 'production-db-schema.sql');
    fs.writeFileSync(schemaFile, schemaSQL);
    
    console.log(`✅ Current schema written to: ${schemaFile}`);
    
    // Generate migration file
    const migrationSQL = generateMigrationSQL(currentSchema);
    const migrationFile = path.join(process.cwd(), 'production-migration.sql');
    fs.writeFileSync(migrationFile, migrationSQL);
    
    console.log(`✅ Migration script written to: ${migrationFile}`);
    
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
    
    console.log('\n🚀 To apply migrations to production, run:');
    console.log('   psql "postgresql://ewers_user:Samolan123@localhost:5432/ewers_db" -f production-migration.sql');
    
  } catch (error) {
    console.error('❌ Error checking schema:', error);
    process.exit(1);
  }
}

main().catch(console.error);
