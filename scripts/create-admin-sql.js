const { PrismaClient } = require('./src/generated/prisma');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.netsgjeuzsnlchhwbqif:P%40ssw0rd_IT_Mgmt_99%21@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres'
    }
  }
});

async function run() {
  const email = 'admin@it-management.com';
  // A bcrypt hash of 'AdminPassword123!@#'
  const encrypted_password = '$2b$10$pPOf8bQJccR158sP4s2yOu1aYf9l0.98B4M/s1fJ2.vX/3jT./BvS'; 

  console.log('Inserting into auth.users...');
  try {
    // 1. Insert into auth.users (Supabase's internal auth table)
    const [{ id: authUserId }] = await prisma.$queryRaw`
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, 
        email_confirmed_at, created_at, updated_at
      ) 
      VALUES (
        '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 
        ${email}, ${encrypted_password}, 
        now(), now(), now()
      )
      RETURNING id;
    `;
    
    // 2. Insert into auth.identities
    await prisma.$queryRaw`
      INSERT INTO auth.identities (
        id, user_id, identity_data, provider, created_at, updated_at
      )
      VALUES (
        gen_random_uuid(), ${authUserId}, jsonb_build_object('sub', ${authUserId}::text, 'email', ${email}::text),
        'email', now(), now()
      )
    `;

    console.log('User created in Auth with ID:', authUserId);
    
    console.log('Adding user to Prisma public.User...');
    const user = await prisma.user.create({
      data: {
        id: authUserId, // Match Supabase ID
        email: email,
        username: email,
        name: 'System Admin',
        role: 'ADMIN',
        password: encrypted_password, 
      }
    });

    console.log('User added to database:', user.id);
    console.log(`\nSUCCESS!\nEmail: ${email}\nPassword: AdminPassword123!@#\n`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
