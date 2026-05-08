export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { calculateSlaBreachTime } from '@/lib/sla';
import { runAutomations } from '@/lib/automations';
import { TicketStatus, TicketPriority } from '@/generated/prisma';
import { sendTicketEmail } from '@/lib/email';
import { broadcast } from '@/app/api/realtime/tickets/route';
import { createRequestLogger } from '@/lib/logger';

export const GET = withAuth(async (req: NextRequest, user: any) => {
  const logger = createRequestLogger(req);

  try {
    logger.info('Fetching tickets', { user: user?.email });

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const skip = (page - 1) * pageSize;
    const skipPagination = searchParams.get('all') === 'true';
    const hasDueDate = searchParams.get('hasDueDate') === 'true';

    const whereClause: any = {};
    if (hasDueDate) {
      whereClause.dueDate = { not: null };
    }

    const [tickets, totalCount] = await Promise.all([
      prisma.ticket.findMany({
        where: whereClause,
        select: {
          id: true, title: true, status: true, priority: true,
          createdAt: true, updatedAt: true, dueDate: true, slaBreachAt: true,
          tags: true, requesterName: true, assetId: true, folderId: true,
          assignedTo: { select: { id: true, username: true, name: true } },
          _count: { select: { comments: true, checklists: true } }
        },
        orderBy: { createdAt: 'desc' },
        ...(skipPagination ? {} : { skip, take: pageSize })
      }),
      prisma.ticket.count({
        where: whereClause
      })
    ]);

    logger.info('Tickets fetched successfully', { count: tickets.length, totalCount });

    return NextResponse.json({
      tickets,
      pagination: {
        page: skipPagination ? 1 : page,
        pageSize: skipPagination ? totalCount : pageSize,
        totalCount,
        totalPages: skipPagination ? 1 : Math.ceil(totalCount / pageSize)
      }
    });
  } catch (err: any) {
    logger.error('Failed to fetch tickets', {
      error: err.message,
      stack: err.stack
    });
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 });
  }
});

export const POST = withAuth(async (req: NextRequest, user: any) => {
  const logger = createRequestLogger(req);

  try {
    logger.info('Creating new ticket', { user: user?.email });

    const body = await req.json();
    const { title, description, priority, status, assignedToId, assetId, tags } = body;

    if (!title || !description) {
      logger.warn('Ticket creation validation failed', { reason: 'Missing required fields' });
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
    }

    const validatedPriority = (priority && Object.values(TicketPriority).includes(priority)) ? (priority as TicketPriority) : TicketPriority.P2;
    const validatedStatus = (status && Object.values(TicketStatus).includes(status)) ? (status as TicketStatus) : TicketStatus.TODO;

    logger.debug('Ticket validation completed', { validatedPriority, validatedStatus });

    const slaBreachAt = await calculateSlaBreachTime(validatedPriority);
    logger.debug('SLA breach time calculated', { slaBreachAt });

    const ticket = await prisma.ticket.create({
      data: {
        title,
        description,
        priority: validatedPriority,
        status: validatedStatus,
        assignedToId: assignedToId ? parseInt(assignedToId.toString()) : undefined,
        assetId: assetId ? parseInt(assetId.toString()) : undefined,
        tags: tags || [],
        slaBreachAt: slaBreachAt || undefined
      },
      include: { assignedTo: { select: { id: true, username: true, name: true } } }
    });

    logger.info('Ticket created successfully', { ticketId: ticket.id, title: ticket.title });

    const dbUser = await prisma.user.findFirst({
      where: { username: (user as any).email }
    });

    await prisma.activityLog.create({
      data: {
        ticketId: ticket.id,
        userId: dbUser?.id,
        action: 'TICKET_CREATED',
        newValue: title
      }
    });

    logger.debug('Activity log created for ticket', { ticketId: ticket.id });

    const autoUpdatedTicket = await runAutomations('ON_TICKET_CREATED', ticket);
    logger.debug('Automations completed for ticket', { ticketId: ticket.id });

    // 3. Send Notifications
    const notificationPromises = [];

    // Notify Assignee
    if (ticket.assignedTo?.username) {
      notificationPromises.push(
        sendTicketEmail({
          type: 'ASSIGNED',
          ticket: autoUpdatedTicket as any,
          recipient: { email: ticket.assignedTo.username, name: ticket.assignedTo.name || 'Assignee' }
        }).catch(error => {
          logger.warn('Failed to send assignment notification', {
            ticketId: ticket.id,
            recipient: ticket.assignedTo?.username,
            error: error.message
          });
        })
      );
    }

    // Notify Admins for P0
    if (validatedPriority === TicketPriority.P0) {
      const adminUsers = await prisma.user.findMany({ where: { role: 'ADMIN' } });
      for (const admin of adminUsers) {
        if (admin.username && admin.username !== ticket.assignedTo?.username) {
          notificationPromises.push(
            sendTicketEmail({
              type: 'CREATED',
              ticket: autoUpdatedTicket as any,
              recipient: { email: admin.username, name: admin.name || 'Admin' }
            }).catch(error => {
              logger.warn('Failed to send admin notification', {
                ticketId: ticket.id,
                recipient: admin.username,
                error: error.message
              });
            })
          );
        }
      }
    }

    if (notificationPromises.length > 0) {
      await Promise.allSettled(notificationPromises);
      logger.debug('All notifications processed', { successCount: notificationPromises.length });
    }

    // Broadcast real-time update
    broadcast('ticket-created', {
      id: autoUpdatedTicket.id,
      title: autoUpdatedTicket.title,
      status: autoUpdatedTicket.status,
      priority: autoUpdatedTicket.priority,
      assignedToId: autoUpdatedTicket.assignedToId,
      assignedTo: autoUpdatedTicket.assignedTo,
      updatedAt: autoUpdatedTicket.updatedAt
    });

    logger.info('Ticket creation process completed', { ticketId: ticket.id });
    return NextResponse.json(autoUpdatedTicket);
  } catch (err: any) {
    logger.error('Ticket creation failed', {
      error: err.message,
      stack: err.stack,
      code: err.code
    });

    const isAuthError = err.message?.includes('Authentication failed') || err.message?.includes('password authentication failed');
    return NextResponse.json({
      error: isAuthError
        ? 'Database authentication failed. Check your DATABASE_URL in .env.'
        : `Failed to create ticket: ${err.message || 'Unknown error'}`
    }, { status: 500 });
  }
});
