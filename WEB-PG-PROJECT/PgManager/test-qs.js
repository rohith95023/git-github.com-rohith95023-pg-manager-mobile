import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xdzshjbepsntlavtcmpp.supabase.co'
const supabaseKey = 'sb_publishable_xPl9e_Q2KCWEp6UbA6UMow_X-VtiIgM'
const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  const [paymentsRes, expensesRes] = await Promise.all([
    supabase.from('payments').select('amount, payment_date, created_at, status, pg_id, pgs(name)').limit(5),
    supabase.from('expenses').select('amount, date, created_at, pg_id, pgs(name)').limit(5)
  ]);
  
  console.log("Payments:", paymentsRes.data)
  console.log("Payments Error:", paymentsRes.error)
  console.log("Expenses:", expensesRes.data)
  console.log("Expenses Error:", expensesRes.error)
}

test()
