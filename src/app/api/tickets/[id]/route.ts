import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { calculateSlaBreachTime } from '@/lib/sla';
import { runAutomations } from '@/lib/automations';
import { sendTicketEmail } from '@/lib/email';
import { broadcast } from '@/app/api/realtime/tickets/route';

export const PATCH = withAuth(async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, priority, title, description, assignedToId, tags, dueDate, assetId } = body;

    const [currentTicket, dbUser] = await Promise.all([
      prisma.ticket.findUnique({
        where: { id: parseInt(id) }
      }),
      prisma.user.findFirst({
        where: { username: user.email }
      })
    ]);

    if (!currentTicket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

    const data: any = {};
    if (status !== undefined) data.status = status;
    if ('assignedToId' in body) {
      data.assignedToId = assignedToId ? parseInt(assignedToId) : null;
    }
    if ('assetId' in body) {
      data.assetId = assetId ? parseInt(assetId) : null;
    }
    if (tags !== undefined) {
      data.tags = tags;
    }
    if (dueDate !== undefined) {
      data.dueDate = dueDate ? new Date(dueDate).toISOString() : null;
    }
    if (priority !== undefined && priority !== currentTicket.priority) {
      // Re-calculate SLA if priority changed
      const slaBreachAt = await calculateSlaBreachTime(priority);
      if (slaBreachAt) {
        data.slaBreachAt = slaBreachAt;
      }
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id: parseInt(id) },
      data,
      include: { 
        assignedTo: { select: { id: true, username: true, name: true } },
        checklists: { orderBy: { createdAt: 'asc' } },
        asset: true
      }
    });

    const logs = [];
    if (status && status !== currentTicket.status) {
      logs.push({ ticketId: parseInt(id), userId: dbUser?.id, action: 'STATUS_CHANGE', field: 'status', oldValue: currentTicket.status, newValue: status });
    }
    if (priority && priority !== currentTicket.priority) {
      logs.push({ ticketId: parseInt(id), userId: dbUser?.id, action: 'PRIORITY_CHANGE', field: 'priority', oldValue: currentTicket.priority, newValue: priority });
    }
    if (dueDate !== undefined && new Date(dueDate).toISOString() !== currentTicket.dueDate?.toISOString()) {
      logs.push({ 
        ticketId: parseInt(id), 
        userId: dbUser?.id, 
        action: 'DUE_DATE_CHANGE', 
        field: 'dueDate', 
        oldValue: currentTicket.dueDate ? currentTicket.dueDate.toISOString() : null, 
        newValue: dueDate ? new Date(dueDate).toISOString() : null 
      });
    }
    if (title !== undefined && title !== currentTicket.title) {
      logs.push({ ticketId: parseInt(id), userId: dbUser?.id, action: 'TITLE_CHANGE', field: 'title', oldValue: currentTicket.title, newValue: title });
    }
    if (description !== undefined && description !== currentTicket.description) {
      logs.push({ 
        ticketId: parseInt(id), 
        userId: dbUser?.id, 
        action: 'DESCRIPTION_CHANGE', 
        field: 'description', 
        oldValue: null, 
        newValue: description ? description.substring(0, 120) + (description.length > 120 ? '...' : '') : null 
      });
    }
    if (tags !== undefined && JSON.stringify(tags) !== JSON.stringify(currentTicket.tags)) {
      logs.push({ ticketId: parseInt(id), userId: dbUser?.id, action: 'TAGS_CHANGE', field: 'tags', oldValue: currentTicket.tags.join(', '), newValue: tags.join(', ') });
    }
    if ('assignedToId' in body && assignedToId !== currentTicket.assignedToId) {
      const oldUser = currentTicket.assignedToId ? await prisma.user.findUnique({ where: { id: currentTicket.assignedToId }, select: { name: true, username: true } }) : null;
      const newUser = assignedToId ? await prisma.user.findUnique({ where: { id: parseInt(assignedToId) }, select: { name: true, username: true } }) : null;
      
      logs.push({ 
        ticketId: parseInt(id), 
        userId: dbUser?.id, 
        action: 'ASSIGNMENT_CHANGE', 
        field: 'assignedToId', 
        oldValue: oldUser ? (oldUser.name || oldUser.username) : null, 
        newValue: newUser ? (newUser.name || newUser.username) : null 
      });
    }

    if (logs.length > 0) {
      await prisma.activityLog.createMany({
        data: logs
      });
    }

    // Run Automations
    const autoUpdatedTicket = await runAutomations('ON_TICKET_UPDATED', updatedTicket as any);

    // Send assignment email if assignee changed
    if (data.assignedToId && data.assignedToId !== currentTicket.assignedToId) {
      if (updatedTicket.assignedTo?.username) {
        await sendTicketEmail({
          type: 'ASSIGNED',
          ticket: autoUpdatedTicket as any,
          recipient: { email: updatedTicket.assignedTo.username, name: updatedTicket.assignedTo.name || 'User' }
        });
      }
    } else if (data.status && data.status !== currentTicket.status) {
       // Send status update email if no new assignment, but status changed
       const userToNotify = updatedTicket.assignedTo;
       if (userToNotify && userToNotify.username) {
         await sendTicketEmail({
            type: data.status === 'RESOLVED' ? 'RESOLVED' : 'UPDATED',
            ticket: autoUpdatedTicket as any,
            recipient: { email: userToNotify.username, name: userToNotify.name || 'User' }
         });
       }
    }

    // Broadcast real-time update
    broadcast('ticket-updated', {
      id: autoUpdatedTicket.id,
      title: autoUpdatedTicket.title,
      status: autoUpdatedTicket.status,
      priority: autoUpdatedTicket.priority,
      assignedToId: autoUpdatedTicket.assignedToId,
      assignedTo: autoUpdatedTicket.assignedTo,
      updatedAt: autoUpdatedTicket.updatedAt
    });

    return NextResponse.json(autoUpdatedTicket);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update ticket' }, { status: 400 });
  }
});
export const DELETE = withAuth(async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    
    // Check if user is Admin
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
      select: { role: true }
    });

    if (dbUser?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Only admins can delete tickets' }, { status: 403 });
    }

    await prisma.ticket.delete({
      where: { id: parseInt(id) }
    });

    // Broadcast real-time update
    broadcast('ticket-deleted', {
      id: parseInt(id)
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete Error:", err);
    return NextResponse.json({ error: 'Failed to delete ticket' }, { status: 400 });
  }
});
