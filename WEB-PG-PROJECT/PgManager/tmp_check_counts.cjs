const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://postgres:Rk%4095023%2695023.@db.xdzshjbepsntlavtcmpp.supabase.co:5432/postgres"
});

async function main() {
    await client.connect();
    
    console.log("Checking PGs, Rooms, and Beds status counts...");
    
    const pgs = await client.query(`SELECT status, count(*) FROM public.pgs GROUP BY status`);
    console.log("\nPGs:");
    console.log(JSON.stringify(pgs.rows, null, 2));

    const rooms = await client.query(`SELECT status, count(*) FROM public.rooms GROUP BY status`);
    console.log("\nRooms:");
    console.log(JSON.stringify(rooms.rows, null, 2));

    const beds = await client.query(`SELECT status, count(*) FROM public.beds GROUP BY status`);
    console.log("\nBeds:");
    console.log(JSON.stringify(beds.rows, null, 2));

    const tenants = await client.query(`SELECT status, count(*) FROM public.tenants GROUP BY status`);
    console.log("\nTenants:");
    console.log(JSON.stringify(tenants.rows, null, 2));

    await client.end();
}

main().catch(console.error);
