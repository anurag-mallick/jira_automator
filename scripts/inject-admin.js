const { Client } = require('pg');
// Use pooler address which is more reliable for DNS
const connectionString = 'postgresql://postgres.netsgjeuzsnlchhwbqif:P%40ssw0rd_IT_Mgmt_99%21@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres';

async function run() {
  if (!connectionString) {
    console.error('DATABASE_URL is not defined in .env.local');
    process.exit(1);
  }

  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Connected to database.');

    const email = 'admin@horizon-it.com';
    const password = 'Admin123!';
    const name = 'Horizon Admin';

    console.log(`Injecting admin: ${email}`);

    // 1. Supabase Auth Injection
    // Using crypt() from pgcrypto
    const authInsert = await client.query(`
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, 
        email_confirmed_at, recovery_sent_at, last_sign_in_at, 
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
        confirmation_token, email_change, email_change_token_new, recovery_token
      )
      VALUES (
        '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 
        $1, crypt($2, gen_salt('bf')), 
        now(), now(), now(), 
        '{"provider": "email", "providers": ["email"]}', $3, 
        now(), now(), '', '', '', ''
      ) ON CONFLICT (email) DO UPDATE SET 
        encrypted_password = crypt($2, gen_salt('bf')),
        email_confirmed_at = now()
      RETURNING id;
    `, [email, password, JSON.stringify({ name })]);

    const userId = authInsert.rows[0].id;
    console.log(`Auth user created/updated with ID: ${userId}`);

    // 2. Identity Insertion
    await client.query(`
      INSERT INTO auth.identities (
        id, user_id, identity_data, provider, created_at, updated_at
      )
      VALUES (
        gen_random_uuid(), $1, jsonb_build_object('sub', $1::text, 'email', $2::text),
        'email', now(), now()
      ) ON CONFLICT (provider, identity_data) DO NOTHING;
    `, [userId, email]);

    // 3. Prisma Public User Injection
    await client.query(`
      INSERT INTO public."User" (username, email, password, name, role, "isActive", "createdAt", "updatedAt")
      VALUES ($1, $1, $2, $3, 'ADMIN', true, now(), now())
      ON CONFLICT (email) DO UPDATE SET 
        role = 'ADMIN', 
        password = $2,
        updatedAt = now();
    `, [email, password, name]);

    console.log('Public user created/updated.');
    console.log(`\nSUCCESS! Credentials injected:\nEmail: ${email}\nPassword: ${password}\n`);

  } catch (err) {
    console.error('Injection failed:', err);
    if (err.message.includes('extension "pgcrypto"')) {
        console.log('TIP: Try running "CREATE EXTENSION IF NOT EXISTS pgcrypto;" if possible.');
    }
  } finally {
    await client.end();
  }
}

run();
