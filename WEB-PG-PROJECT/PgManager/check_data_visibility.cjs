const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://postgres:Rk%4095023%2695023.@db.xdzshjbepsntlavtcmpp.supabase.co:5432/postgres"
});

async function main() {
    await client.connect();
    
    console.log("Checking database status counts to investigate 'Missing Data'...");
    
    const counts = await client.query(`
        SELECT 'pgs' as table, status::text, count(*) FROM public.pgs GROUP BY status
        UNION ALL
        SELECT 'rooms' as table, status::text, count(*) FROM public.rooms GROUP BY status
        UNION ALL
        SELECT 'tenants' as table, status::text, count(*) FROM public.tenants GROUP BY status
    `);
    console.log("\nCurrent status counts:");
    console.log(JSON.stringify(counts.rows, null, 2));

    await client.end();
}

main().catch(console.error);
