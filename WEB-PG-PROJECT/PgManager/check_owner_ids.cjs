const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://postgres:Rk%4095023%2695023.@db.xdzshjbepsntlavtcmpp.supabase.co:5432/postgres"
});

async function main() {
    await client.connect();
    
    console.log("Checking owner_id alignment across tables...");
    
    console.log("\nPGs:");
    const pgs = await client.query(`SELECT id, name, owner_id, status FROM public.pgs`);
    console.log(JSON.stringify(pgs.rows, null, 2));

    console.log("\nTenants:");
    const tenants = await client.query(`SELECT id, full_name, owner_id, status FROM public.tenants`);
    console.log(JSON.stringify(tenants.rows, null, 2));

    console.log("\nRecent Profiles:");
    const profiles = await client.query(`SELECT id, full_name, role FROM public.profiles`);
    console.log(JSON.stringify(profiles.rows, null, 2));

    await client.end();
}

main().catch(console.error);
