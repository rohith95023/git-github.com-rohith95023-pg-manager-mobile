const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:Rk%4095023%2695023.@xdzshjbepsntlavtcmpp.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false },
});

async function inspect() {
  try {
    const client = await pool.connect();
    
    console.log('--- Inspecting archive_pg_cascade function ---');
    const funcRes = await client.query(`
      SELECT pg_get_functiondef(p.oid) 
      FROM pg_proc p 
      JOIN pg_namespace n ON p.pronamespace = n.oid 
      WHERE n.nspname = 'public' AND p.proname = 'archive_pg_cascade';
    `);
    if (funcRes.rows.length > 0) {
      console.log(funcRes.rows[0].pg_get_functiondef);
    } else {
      console.log('Function archive_pg_cascade not found');
    }

    console.log('\n--- Inspecting beds table constraints ---');
    const constRes = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) 
      FROM pg_constraint 
      WHERE conrelid = 'beds'::regclass;
    `);
    constRes.rows.forEach(row => {
      console.log(`${row.conname}: ${row.pg_get_constraintdef}`);
    });

    client.release();
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

inspect();
