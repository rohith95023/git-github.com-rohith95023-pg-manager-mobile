const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: `postgresql://postgres:${encodeURIComponent('Rk@95023&95023.')}@db.xdzshjbepsntlavtcmpp.supabase.co:5432/postgres`,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  const migrationFile = process.argv[2];
  if (!migrationFile) {
    console.error('Usage: node execute_migration.cjs <filename.sql>');
    process.exit(1);
  }

  const sql = fs.readFileSync(path.join(__dirname, migrationFile), 'utf8');
  console.log(`\n🔧 Executing migration: ${migrationFile}...\n`);

  try {
    await pool.query(sql);
    console.log('✅ Migration complete!');
  } catch (err) {
    console.error('\n❌ Migration failed:');
    console.error('Message:', err.message);
    if (err.detail) console.error('Detail:', err.detail);
    if (err.hint) console.error('Hint:', err.hint);
    if (err.where) console.error('Where:', err.where);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
