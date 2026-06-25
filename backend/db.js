const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// MySQL connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root123',
  database: process.env.DB_NAME || 'attendance_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create a connection pool (reuses connections efficiently)
const pool = mysql.createPool(dbConfig);

// Helper to run INSERT/UPDATE/DELETE queries — returns { lastID, changes }
const run = async (sql, params = []) => {
  const [result] = await pool.query(sql, params);
  return { lastID: result.insertId, changes: result.affectedRows };
};

// Helper to query multiple rows — returns an array
const query = async (sql, params = []) => {
  const [rows] = await pool.query(sql, params);
  return rows;
};

// Helper to query a single row — returns one object or undefined
const queryOne = async (sql, params = []) => {
  const [rows] = await pool.query(sql, params);
  return rows[0] || null;
};

// Initialize the database structure and default seeds
async function initializeDatabase() {
  try {
    // Create database if it does not exist using a temporary connection without database name
    const tempConnection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password
    });
    await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
    await tempConnection.end();

    // Test the connection
    const connection = await pool.getConnection();
    console.log('Connected to MySQL database.');
    connection.release();

    // Read and execute schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');

      // Clean comment lines first, then split by semicolon
      const cleanSql = schemaSql
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('--'))
        .join(' ');

      const statements = cleanSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const statement of statements) {
        try {
          await pool.query(statement);
        } catch (err) {
          // Ignore "index already exists" errors on re-runs
          if (!err.message.includes('Duplicate key name')) {
            console.error('Failed to execute statement:', statement);
            console.error('Error details:', err);
          }
        }
      }
      console.log('Database tables verified/created successfully.');
    } else {
      console.warn('schema.sql not found. Skipping table creation.');
    }

    // Seed default admin if table is empty
    const adminCheck = await queryOne('SELECT * FROM users WHERE username = ?', ['admin']);
    if (!adminCheck) {
      const passwordHash = bcrypt.hashSync('admin123', 10);
      await run(
        'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
        ['admin', passwordHash, 'admin']
      );
      console.log('Default administrator account created: admin / admin123');
    }
  } catch (err) {
    console.error('Database initialization failed:', err.message);
    console.error('Make sure MySQL is running and the "attendance_system" database exists.');
    process.exit(1);
  }
}

// Run initialization immediately
initializeDatabase();

module.exports = {
  pool,
  run,
  query,
  queryOne
};
