const fs = require('fs');
const path = require('path');
const { Client } = require(path.join(__dirname, '../web-admin/node_modules/pg'));

async function main() {
  const sqlFile = path.join(__dirname, 'complete_setup.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');

  // Supabase direct connection configuration
  const client = new Client({
    host: 'db.ohwslpcuetrpkqhvvszu.supabase.co',
    port: 5432,
    user: 'postgres',
    password: 'U3hM8k*v@U/HBPu',
    database: 'postgres',
    ssl: {
      rejectUnauthorized: false,
    },
  });

  console.log('Connecting to Supabase PostgreSQL (db.ohwslpcuetrpkqhvvszu.supabase.co)...');
  try {
    await client.connect();
    console.log('Connected successfully!');

    console.log('Executing complete_setup.sql...');
    await client.query(sql);
    console.log('SUCCESS: ALL TABLES, MIGRATIONS, RLS POLICIES & SEED DATA APPLIED!');

    // Query customers count to verify
    const res = await client.query('SELECT count(*) FROM public.customers;');
    console.log(`Verification: Found ${res.rows[0].count} customers in public.customers.`);
  } catch (err) {
    console.error('Migration error:', err.message || err);
  } finally {
    await client.end();
  }
}

main();
