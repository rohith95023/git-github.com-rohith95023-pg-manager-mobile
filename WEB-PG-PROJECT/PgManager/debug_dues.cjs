
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    const envLines = fs.readFileSync(envPath, 'utf8').split('\n');
    envLines.forEach(line => {
        const [key, ...vals] = line.split('=');
        if (key && vals.length > 0) {
            process.env[key.trim()] = vals.join('=').trim().replace(/^"(.*)"$/, '$1'); // Remove quotes
        }
    });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecentTenants() {
    console.log("Searching for tenants created recently...");
    const { data: tenants, error: tError } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (tError) {
        console.error("Error fetching tenants:", tError);
        return;
    }

    if (!tenants || tenants.length === 0) {
        console.log("No tenants found at all!");
        return;
    }

    console.log(`Found ${tenants.length} tenants. Most recent:`);
    tenants.forEach(t => {
        console.log(`- ${t.full_name} (${t.status}, ${t.stay_type}, PG: ${t.pg_id}) [ID: ${t.id}] Created at: ${t.created_at}`);
    });

    const { data: logs, error: lError } = await supabase
        .from('billing_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (!lError && logs && logs.length > 0) {
        console.log("\nRecent Billing Logs:");
        logs.forEach(log => {
            console.log(`- ${log.created_at} [${log.event_type}]: ${JSON.stringify(log.details)}`);
        });
    }
}

checkRecentTenants();
