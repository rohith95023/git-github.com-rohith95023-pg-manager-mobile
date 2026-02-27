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
  const res = await client.query(`
    SELECT table_name, column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    ORDER BY table_name, column_name
  `);
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
