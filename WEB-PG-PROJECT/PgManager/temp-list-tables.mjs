import { Client } from 'pg';

const client = new Client({
  host: 'xdzshjbepsntlavtcmpp.supabase.co',
  port: 5432,
  user: 'postgres',
  database: 'postgres',
  password: process.env.PGPASSWORD,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  await client.connect();
  const res = await client.query(`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_schema NOT IN ('pg_catalog','information_schema')
    ORDER BY table_schema, table_name
  `);
  if (res.rows.length === 0) {
    console.log('No user tables found.');
  } else {
    const grouped = res.rows.reduce((acc, row) => {
      acc[row.table_schema] = acc[row.table_schema] || [];
      acc[row.table_schema].push(row.table_name);
      return acc;
    }, {});
    for (const schema of Object.keys(grouped)) {
      console.log(`${schema}:`);
      grouped[schema].forEach(table => console.log(`  - ${table}`));
    }
  }
  await client.end();
})().catch(async (err) => {
  console.error('Failed to retrieve tables:', err.message || err);
  await client.end().catch(() => {});
  process.exit(1);
});
