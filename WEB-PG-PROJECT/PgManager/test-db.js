import pg from 'pg'
const { Client } = pg

const client = new Client({
  connectionString: 'postgresql://postgres:Rk%4095023%2695023.@db.xdzshjbepsntlavtcmpp.supabase.co:5432/postgres'
})

async function run() {
  await client.connect()
  const payments = await client.query('SELECT * FROM payments LIMIT 5')
  const expenses = await client.query('SELECT * FROM expenses LIMIT 5')
  
  console.log("Payments:", payments.rows)
  console.log("Expenses:", expenses.rows)
  await client.end()
}
run().catch(console.error)
