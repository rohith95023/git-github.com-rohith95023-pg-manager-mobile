const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: `postgresql://postgres:${encodeURIComponent('Rk@95023&95023.')}@xdzshjbepsntlavtcmpp.supabase.co:5432/postgres`,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

async function applyMigration() {
  console.log('\n🔧 Applying Cascade Fix Migration...\n');

  try {
    const sqlPath = path.join(__dirname, 'migration_fix_cascade_deletion.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Connecting to database...');
    const client = await pool.connect();
    console.log('Connected.');

    try {
        console.log('Executing SQL...');
        await client.query(sql);
        console.log('✅ SQL executed successfully');

        // Verify current status of orphaned tenants
        const result = await client.query(`
            SELECT count(*) FROM tenants 
            WHERE status = 'DELETED' AND pg_id IS NULL
        `);
        console.log(`\n📋 Orphaned tenants now marked as DELETED: ${result.rows[0].count}`);
    } finally {
        client.release();
    }

    console.log('\n✅ Migration complete!');
    
  } catch (err) {
      console.error('\n❌ ERROR during migration:');
      console.error(err);
      process.exit(1);
  } finally {
    await pool.end();
  }
}

applyMigration();
