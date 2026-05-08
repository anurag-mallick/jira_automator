export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateSlaBreachTime } from '@/lib/sla';
import { sendTicketEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name, subject, description, priority, ticketType } = body;

    if (!email || !subject || !description) {
      return NextResponse.json(
        { error: 'Email, subject, and description are required' },
        { status: 400 }
      );
    }

    let customer = await prisma.customer.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          email: email.toLowerCase(),
          name: name || null
        }
      });
    }

    if (customer.isBlocked) {
      return NextResponse.json(
        { error: 'Your email has been blocked. Please contact support.' },
        { status: 403 }
      );
    }

    const validPriorities = ['P0', 'P1', 'P2', 'P3'];
    const validatedPriority = validPriorities.includes(priority) ? priority : 'P2';
    const slaBreachAt = await calculateSlaBreachTime(validatedPriority as any);

    const ticket = await prisma.ticket.create({
      data: {
        title: subject,
        description,
        requesterName: name || email,
        requesterEmail: email,
        status: 'TODO',
        priority: validatedPriority as any,
        customerId: customer.id,
        viaCustomerPortal: true,
        ticketType: ticketType || 'INCIDENT',
        slaBreachAt: slaBreachAt || undefined
      },
      include: {
        customer: true,
        emailAccount: true
      }
    });

    await prisma.communication.create({
      data: {
        subject,
        content: description,
        sender: email,
        senderName: name || null,
        recipient: ticket.emailAccount?.email || 'support@localhost',
        ticketId: ticket.id,
        customerId: customer.id,
        emailAccountId: ticket.emailAccountId,
        direction: 'INBOUND'
      }
    });

    if (ticket.emailAccount?.autoResponse) {
      try {
        await sendTicketEmail({
          type: 'CREATED',
          ticket: ticket as any,
          recipient: { email: customer.email, name: customer.name || customer.email }
        });
      } catch (emailErr) {
        console.error('Failed to send acknowledgement email:', emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        title: ticket.title,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt
      }
    });
  } catch (err: any) {
    console.error('Portal ticket creation error:', err);
    return NextResponse.json(
      { error: 'Failed to create ticket' },
      { status: 500 }
    );
  }
}
