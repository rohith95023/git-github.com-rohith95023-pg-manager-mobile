const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://postgres:Rk%4095023%2695023.@db.xdzshjbepsntlavtcmpp.supabase.co:5432/postgres"
});

async function main() {
    await client.connect();
    
    const namesRes = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
    `);
    
    const results = [];
    for (const row of namesRes.rows) {
        const name = row.table_name;
        try {
            const countRes = await client.query('SELECT count(*) FROM public."' + name + '"');
            results.push({ table: name, rows: countRes.rows[0].count });
        } catch (e) {
            results.push({ table: name, rows: 'Error: ' + e.message });
        }
    }
    
    console.log(JSON.stringify(results, null, 2));

    await client.end();
}

main().catch(console.error);
