export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcast } from '@/app/api/realtime/tickets/route';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, ticketId, message } = body;

    if (!email || !ticketId || !message) {
      return NextResponse.json(
        { error: 'Email, ticketId, and message are required' },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    if (customer.isBlocked) {
      return NextResponse.json(
        { error: 'Your email has been blocked. Please contact support.' },
        { status: 403 }
      );
    }

    const ticket = await prisma.ticket.findFirst({
      where: {
        id: parseInt(ticketId),
        customerId: customer.id
      },
      include: {
        emailAccount: true,
        communications: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found or does not belong to this customer' },
        { status: 404 }
      );
    }

    const lastCommunication = ticket.communications[0];

    await prisma.communication.create({
      data: {
        subject: `Re: ${ticket.title}`,
        content: message,
        sender: email,
        senderName: customer.name || null,
        recipient: ticket.emailAccount?.email || 'support@localhost',
        ticketId: ticket.id,
        customerId: customer.id,
        emailAccountId: ticket.emailAccountId,
        direction: 'INBOUND',
        inReplyTo: lastCommunication?.messageId || undefined,
        references: lastCommunication?.references 
          ? `${lastCommunication.references} ${lastCommunication.messageId}`
          : lastCommunication?.messageId || undefined
      }
    });

    if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { status: 'IN_PROGRESS' }
      });
    }

    const updatedTicket = await prisma.ticket.findUnique({
      where: { id: ticket.id },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        updatedAt: true
      }
    });

    broadcast('ticket-updated', updatedTicket);

    return NextResponse.json({
      success: true,
      message: 'Reply sent successfully'
    });
  } catch (err) {
    console.error('Portal reply error:', err);
    return NextResponse.json(
      { error: 'Failed to send reply' },
      { status: 500 }
    );
  }
}
