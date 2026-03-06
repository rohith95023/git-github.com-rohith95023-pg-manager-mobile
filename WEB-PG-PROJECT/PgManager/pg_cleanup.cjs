const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://postgres:Rk%4095023%2695023.@db.xdzshjbepsntlavtcmpp.supabase.co:5432/postgres"
});

async function main() {
    await client.connect();
    
    console.log("--- 1. Verification ---");
    
    const floorsCount = await client.query('SELECT count(*) FROM public.floors');
    const snapshotCount = await client.query('SELECT count(*) FROM public.system_data_snapshots');
    
    console.log(`Floors row count: ${floorsCount.rows[0].count}`);
    console.log(`Snapshots row count: ${snapshotCount.rows[0].count}`);

    const depCheck = await client.query(`
        SELECT
            tc.table_name as dependent_table,
            ccu.table_name as target_table
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND ccu.table_name IN ('floors', 'system_data_snapshots')
    `);
    
    console.log("Foreign Key Dependencies found:", depCheck.rows);

    if (depCheck.rows.length === 0 && floorsCount.rows[0].count === '0' && snapshotCount.rows[0].count === '0') {
        console.log("\n--- 2. Dropping Tables ---");
        await client.query('DROP TABLE public.floors');
        console.log("Table 'floors' dropped.");
        await client.query('DROP TABLE public.system_data_snapshots');
        console.log("Table 'system_data_snapshots' dropped.");
    } else {
        console.log("\n--- ABORTED: SAFE CLEANUP FAILED ---");
        if (depCheck.rows.length > 0) console.log("Dependencies found. Cannot drop safely.");
        if (floorsCount.rows[0].count !== '0') console.log("Floors table is not empty.");
    }

    console.log("\n--- 3. Remaining Tables ---");
    const remaining = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
    `);
    console.log(remaining.rows.map(r => r.table_name));

    await client.end();
}

main().catch(console.error);
