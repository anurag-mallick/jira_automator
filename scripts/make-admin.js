const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('./src/generated/prisma');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const email = 'admin@it-management.com';
    const updatedUser = await prisma.user.update({
      where: { email },
      data: { role: 'ADMIN' },
    });
    console.log(`Successfully promoted ${email} to ADMIN.`);
    console.log(JSON.stringify(updatedUser, null, 2));
  } catch (error) {
    if (error.code === 'P2025') {
      console.error('User not found in database.');
    } else {
      console.error('An error occurred:', error);
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
