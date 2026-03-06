const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://postgres:Rk%4095023%2695023.@db.xdzshjbepsntlavtcmpp.supabase.co:5432/postgres"
});

async function main() {
    await client.connect();
    
    console.log("Checking RLS Policies for rooms table...");
    const res = await client.query(`
        SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check 
        FROM pg_policies 
        WHERE tablename = 'rooms'
    `);
    console.log(JSON.stringify(res.rows, null, 2));

    await client.end();
}

main().catch(console.error);
