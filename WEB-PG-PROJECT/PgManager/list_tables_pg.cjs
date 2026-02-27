const { Pool } = require('pg');

const pool = new Pool({
  connectionString: `postgresql://postgres:${encodeURIComponent('Rk@95023&95023.')}@xdzshjbepsntlavtcmpp.supabase.co:5432/postgres`,
  ssl: { rejectUnauthorized: false }
});

async function listTables() {
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tables in public schema:', res.rows.map(r => r.table_name));
  } catch (err) {
    console.error('Error listing tables:', err);
  } finally {
    await pool.end();
  }
}

listTables();
