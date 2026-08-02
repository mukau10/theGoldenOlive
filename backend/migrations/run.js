/**
 * Database Migration Runner
 * Tracks applied migrations in schema_migrations
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function tableExists(connection, name) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS c FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ?`,
    [name]
  );
  return Number(rows[0]?.c || 0) > 0;
}

async function runMigrations() {
  console.log('🔄 Starting database migrations...\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });

  try {
    const dbName = process.env.DB_NAME || 'thegoldenolive';
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✓ Database '${dbName}' ready`);
    await connection.query(`USE \`${dbName}\``);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const files = fs.readdirSync(__dirname)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    const [appliedRows] = await connection.query('SELECT filename FROM schema_migrations');
    const applied = new Set(appliedRows.map((r) => r.filename));

    // First-time tracking on an already-provisioned DB: mark existing files applied
    if (applied.size === 0 && (await tableExists(connection, 'orders'))) {
      console.log('ℹ Existing schema detected — seeding schema_migrations for current files\n');
      for (const file of files) {
        await connection.query('INSERT IGNORE INTO schema_migrations (filename) VALUES (?)', [file]);
        applied.add(file);
      }
    }

    console.log(`\n📁 Found ${files.length} migration file(s)\n`);

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`⏭  ${file} (already applied)`);
        continue;
      }

      console.log(`Running: ${file}`);
      const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');

      try {
        await connection.query(sql);
        await connection.query('INSERT INTO schema_migrations (filename) VALUES (?)', [file]);
        console.log(`✓ ${file} completed\n`);
      } catch (error) {
        if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.code === 'ER_DUP_ENTRY') {
          await connection.query(
            'INSERT IGNORE INTO schema_migrations (filename) VALUES (?)',
            [file]
          );
          console.log(`⚠ ${file} - already present, marked applied\n`);
        } else {
          throw error;
        }
      }
    }

    console.log('✅ All migrations completed successfully!\n');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runMigrations();
