import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, requesterName, priority } = body;
    
    if (!title || title.length > 200) return NextResponse.json({ error: 'Invalid title' }, { status: 400 });
    if (!description || description.length > 5000) return NextResponse.json({ error: 'Invalid description' }, { status: 400 });

    const validPriorities = ['P0', 'P1', 'P2', 'P3'];
    const safePriority = validPriorities.includes(priority) ? priority : 'P2';


    const newTicket = await prisma.ticket.create({
      data: {
        title,
        description,
        requesterName: requesterName || 'Anonymous',
        priority: safePriority,
        status: 'TODO'
      }
    });

    return NextResponse.json({ message: 'Ticket submitted successfully', ticketId: newTicket.id });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to submit ticket' }, { status: 400 });
  }
}
