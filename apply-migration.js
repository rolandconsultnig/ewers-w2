import pg from 'pg';
import fs from 'fs';

const { Client } = pg;

async function applyMigration() {
  const client = new Client({
    connectionString: 'postgresql://postgres:Samolan123@localhost:5432/zzzEAN'
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const sql = fs.readFileSync('add-incident-columns.sql', 'utf8');
    await client.query(sql);
    
    console.log('✅ Migration applied successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await client.end();
  }
}

applyMigration();
