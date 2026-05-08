const { PrismaClient } = require('./src/generated/prisma');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { subDays } = require('date-fns');

require('dotenv').config({ path: '.env.local' });

async function main() {
  const connectionString = process.env.DATABASE_URL;
  console.log("Testing with DATABASE_URL:", connectionString);
  const pool = new Pool({ 
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter, log: ['query', 'error', 'warn'] });

  try {
    const [
      total,
      statusGroups,
      priorityGroups,
      slaBreached,
      recentTickets
    ] = await Promise.all([
      prisma.ticket.count(),
      prisma.ticket.groupBy({
        by: ['status'],
        _count: { status: true }
      }),
      prisma.ticket.groupBy({
        by: ['priority'],
        _count: { priority: true }
      }),
      prisma.ticket.count({
        where: {
          slaBreachAt: { lt: new Date() },
          status: { notIn: ['RESOLVED', 'CLOSED'] }
        }
      }),
      prisma.ticket.findMany({
        where: { createdAt: { gte: subDays(new Date(), 7) } },
        select: { createdAt: true }
      })
    ]);

    console.log("Success:", {
      total,
      statusGroups,
      priorityGroups,
      slaBreached,
      recentTickets: recentTickets.length
    });
  } catch(e) {
    console.error("Prisma Error:");
    console.dir(e, { depth: null });
  } finally {
    await prisma.$disconnect();
  }
}

main();
