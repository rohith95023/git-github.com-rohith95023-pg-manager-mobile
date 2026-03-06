const { Client } = require('pg');
const client = new Client({ connectionString: "postgresql://postgres:Rk%4095023%2695023.@db.xdzshjbepsntlavtcmpp.supabase.co:5432/postgres" });
async function main() {
    await client.connect();
    const pgs = await client.query('SELECT name, owner_id FROM public.pgs');
    pgs.rows.forEach(r => console.log(`PG: ${r.name} OWNER: ${r.owner_id}`));
    const profiles = await client.query('SELECT full_name, id FROM public.profiles');
    profiles.rows.forEach(r => console.log(`PROFILE: ${r.full_name} ID: ${r.id}`));
    await client.end();
}
main();
