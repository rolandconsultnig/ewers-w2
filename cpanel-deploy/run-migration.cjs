/**
 * Database migration helper for cPanel deployment
 * 
 * Use with caution and ONLY for initial setup.
 * Remove this file after running migrations for security.
 */

const { execSync } = require('child_process');
require('dotenv').config();

// Security token (change this to a random string)
const SECURITY_TOKEN = 'change_this_to_a_random_string';

// Simple HTTP server to handle migration
const http = require('http');
const url = require('url');

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const providedToken = parsedUrl.query.token;
  
  res.setHeader('Content-Type', 'application/json');
  
  if (!providedToken || providedToken !== SECURITY_TOKEN) {
    res.statusCode = 403;
    res.end(JSON.stringify({ error: 'Access denied. Invalid token.' }));
    return;
  }
  
  // Verify database connection
  if (!process.env.DATABASE_URL) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: 'DATABASE_URL not set in environment variables.' }));
    return;
  }
  
  try {
    // Run migrations
    console.log('Running database migrations...');
    execSync('npx drizzle-kit push:pg', { stdio: 'inherit' });
    
    res.statusCode = 200;
    res.end(JSON.stringify({ 
      success: true, 
      message: 'Database migrations completed successfully. REMOVE THIS FILE NOW for security purposes.' 
    }));
  } catch (error) {
    console.error('Migration error:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: error.message }));
  }
});

// Start server on port 8080 or the port specified in environment
const PORT = process.env.MIGRATION_PORT || 8080;
server.listen(PORT, () => {
  console.log(`Migration server running at http://localhost:${PORT}`);
  console.log(`Access with token: http://localhost:${PORT}/?token=${SECURITY_TOKEN}`);
  console.log('WARNING: Delete this file after running migrations!');
});