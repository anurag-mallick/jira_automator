import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const POST = withAuth(async (req: Request) => {
  try {
    const { title, description } = await req.json();

    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
    }

    // --- Intelligent Triage Logic (Keywords/Rules) ---
    let priority = 'P2'; // Default
    const text = (title + ' ' + description).toLowerCase();

    // Critical Keywords
    if (text.includes('urgent') || text.includes('emergency') || text.includes('down') || text.includes('outage') || text.includes('security breach')) {
      priority = 'P0';
    } else if (text.includes('broken') || text.includes('error') || text.includes('blocked') || text.includes('failure')) {
      priority = 'P1';
    } else if (text.includes('request') || text.includes('how to') || text.includes('question')) {
      priority = 'P3';
    }

    // --- Intelligent Assignment logic ---
    const staff = await prisma.user.findMany({
      where: { role: 'STAFF' },
      include: {
        _count: {
          select: { tickets: { where: { status: { notIn: ['RESOLVED', 'CLOSED'] } } } }
        }
      }
    });

    if (staff.length === 0) {
      return NextResponse.json({
        priority,
        assignedToId: null,
        assignedToName: 'Unassigned',
        reason: 'No staff available for assignment'
      });
    }

    // Simple load balancer: pick staff with minimum ticket count
    const sortedStaff = staff.sort((a, b) => (a._count as { tickets: number }).tickets - (b._count as { tickets: number }).tickets);
    const assignedToId = sortedStaff[0]?.id;

    const triageResult = {
      priority,
      assignedToId,
      assignedToName: sortedStaff[0]?.name || 'Staff',
      reason: `Auto-triaged based on keywords: ${priority === 'P0' ? 'Critical' : priority === 'P1' ? 'Major' : 'Routine'}`
    };

    return Response.json(triageResult);
  } catch (err: unknown) {
    console.error('Triage error:', err);
    return Response.json({ error: 'Triage failed', details: (err as Error).message }, { status: 500 });
  }
});
