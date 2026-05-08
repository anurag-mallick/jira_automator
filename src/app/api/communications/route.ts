export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

export const GET = withAuth(async (req: NextRequest, user: any) => {
  try {
    const { searchParams } = new URL(req.url);
    const ticketId = searchParams.get('ticketId');
    const customerId = searchParams.get('customerId');
    const accountId = searchParams.get('accountId');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const skip = (page - 1) * pageSize;

    const whereClause: any = {};
    if (ticketId) whereClause.ticketId = parseInt(ticketId);
    if (customerId) whereClause.customerId = parseInt(customerId);
    if (accountId) whereClause.emailAccountId = parseInt(accountId);

    const [communications, totalCount] = await Promise.all([
      prisma.communication.findMany({
        where: whereClause,
        include: {
          ticket: { select: { id: true, title: true, status: true } },
          customer: { select: { id: true, email: true, name: true } },
          emailAccount: { select: { id: true, email: true, emailAccountName: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      prisma.communication.count({ where: whereClause })
    ]);

    return NextResponse.json({
      communications,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize)
      }
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch communications' }, { status: 500 });
  }
});
