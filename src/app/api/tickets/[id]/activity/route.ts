import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

export const GET = withAuth(async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    
    const logs = await prisma.activityLog.findMany({
      where: { ticketId: parseInt(id) },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { name: true, username: true } }
      }
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error('Failed to fetch activity logs:', error);
    return NextResponse.json({ error: 'Failed to fetch activity logs' }, { status: 500 });
  }
});
