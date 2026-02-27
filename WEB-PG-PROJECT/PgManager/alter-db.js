import pg from 'pg'
const { Client } = pg

const client = new Client({
  connectionString: 'postgresql://postgres:Rk%4095023%2695023.@db.xdzshjbepsntlavtcmpp.supabase.co:5432/postgres'
})

async function run() {
  await client.connect()
  try {
    await client.query(`
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender text;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dob date;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();
    `)
    console.log("Altered profiles table successfully")
  } catch(e) {
    console.log("Error:", e.message)
  }
  await client.end()
}
run().catch(console.error)
