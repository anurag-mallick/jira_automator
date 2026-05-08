import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

export const GET = withAuth(async () => {
  try {
    const now = new Date();
    // Fetch unresolved tickets that have an SLA set
    const tickets = await prisma.ticket.findMany({
      where: {
        status: { notIn: ['RESOLVED', 'CLOSED'] },
        slaBreachAt: { not: null }
      },
      select: {
        id: true,
        title: true,
        priority: true,
        status: true,
        slaBreachAt: true,
        assignedTo: { select: { name: true, username: true } },
      },
      orderBy: { slaBreachAt: 'asc' }
    });

    const breached: any[] = [];
    const under1h: any[] = [];
    const under4h: any[] = [];
    const under24h: any[] = [];
    const safe: any[] = [];

    for (const ticket of tickets) {
      if (!ticket.slaBreachAt) continue;
      const t = ticket.slaBreachAt.getTime();
      const diff = t - now.getTime();
      const hours = diff / (1000 * 60 * 60);

      if (diff < 0) {
        breached.push(ticket);
      } else if (hours <= 1) {
        under1h.push(ticket);
      } else if (hours <= 4) {
        under4h.push(ticket);
      } else if (hours <= 24) {
        under24h.push(ticket);
      } else {
        safe.push(ticket);
      }
    }

    return NextResponse.json({
      breached,
      under1h,
      under4h,
      under24h,
      safe
    });
  } catch (error) {
    console.error('Failed to fetch SLA data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
