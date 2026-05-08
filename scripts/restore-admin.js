const { PrismaClient } = require('./src/generated/prisma');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.netsgjeuzsnlchhwbqif:P%40ssw0rd_IT_Mgmt_99%21@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true'
    }
  }
});

async function run() {
  const email = 'admin@it-management.com';
  // A bcrypt hash of 'Quess@123'
  const encrypted_password = '$2b$10$abcdefghijklmnopqrstuv'; // Dummy hash as auth is via Supabase
  
  try {
    console.log('Fetching user from auth.users...');
    const users = await prisma.$queryRaw`SELECT id FROM auth.users WHERE email = ${email} LIMIT 1`;
    
    if (users.length === 0) {
      console.log('User not found in auth.users. Please create it in the Supabase Dashboard.');
      return;
    }
    
    const authUserId = users[0].id;
    console.log('Found Auth User ID:', authUserId);
    
    // Check if user exists in public.User
    const existing = await prisma.user.findUnique({ where: { username: email } });
    if (!existing) {
      console.log('Inserting into public.User...');
      await prisma.$queryRaw`
        INSERT INTO "public"."User" (id, username, password, name, role, "isActive", "createdAt", "updatedAt")
        VALUES (
          (SELECT COALESCE(MAX(id), 0) + 1 FROM "public"."User"), 
          ${email}, 
          ${encrypted_password}, 
          'System Admin', 
          'ADMIN', 
          true, 
          now(), 
          now()
        )
      `;
      console.log('Admin user restored successfully!');
      
      // Since 'id' must be an integer in Prisma schema for public.User, we use auto-increment.
      // Wait, in schema.prisma, public.User id is Int @id @default(autoincrement())
      // We don't need to link it by UUID, we just look up by email!
    } else {
      console.log('Admin user already exists in public.User.');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
