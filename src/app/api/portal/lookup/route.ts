export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    const ticketId = searchParams.get('ticketId');

    if (!email || !ticketId) {
      return NextResponse.json(
        { error: 'Email and ticketId are required' },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'No tickets found for this email' },
        { status: 404 }
      );
    }

    const ticket = await prisma.ticket.findFirst({
      where: {
        id: parseInt(ticketId),
        customerId: customer.id
      },
      include: {
        comments: {
          orderBy: { createdAt: 'asc' }
        },
        communications: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            subject: true,
            content: true,
            direction: true,
            sender: true,
            senderName: true,
            createdAt: true
          }
        },
        assignedTo: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found or does not belong to this customer' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ticket: {
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        resolution: ticket.resolution,
        assignedTo: ticket.assignedTo,
        comments: ticket.comments,
        communications: ticket.communications
      }
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to lookup ticket' },
      { status: 500 }
    );
  }
}
