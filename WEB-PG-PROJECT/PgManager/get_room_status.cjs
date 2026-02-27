const { Client } = require('pg');
const client = new Client({
  host: 'db.xdzshjbepsntlavtcmpp.supabase.co',
  port: 5432,
  user: 'postgres',
  database: 'postgres',
  password: 'Rk@95023&95023.',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  const res = await client.query("SELECT status FROM rooms");
  console.log(res.rows);
  await client.end();
}

run().catch(console.error);
