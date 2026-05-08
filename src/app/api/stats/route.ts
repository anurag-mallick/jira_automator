import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { subDays } from 'date-fns';

export const GET = withAuth(async () => {
  try {
    // Run parallel counts and aggregations
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

    // End of aggregation

    return NextResponse.json({
      total,
      statusGroups,
      priorityGroups,
      slaBreached,
      recentTickets
    });
  } catch (error: any) {
    console.error('Stats fetch error:');
    console.dir(error, { depth: null });
    if (error.message) console.error('Error MESSAGE:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
