import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { TicketPriority, TicketStatus } from '@/generated/prisma';

export const PATCH = withAuth(async (req: NextRequest, user: { email: string; id: number; name?: string; username: string; role: string }) => {
  try {
    const body = await req.json();
    const { ids, data } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No ticket IDs provided' }, { status: 400 });
    }

    // Role check if try to delete
    if (data.delete) {
      const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { role: true }
      });
      if (dbUser?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden: Only admins can delete tickets' }, { status: 403 });
      }

      await prisma.ticket.deleteMany({
        where: { id: { in: ids } }
      });
      return NextResponse.json({ success: true, count: ids.length, deleted: true });
    }

    // Otherwise it's an update
    const updateData: Record<string, string | number | null> = {};
    if (data.status && Object.values(TicketStatus).includes(data.status)) {
      updateData.status = data.status;
    }
    if (data.priority && Object.values(TicketPriority).includes(data.priority)) {
      updateData.priority = data.priority;
    }
    if ('assignedToId' in data) {
      updateData.assignedToId = data.assignedToId ? parseInt(data.assignedToId) : null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid update data provided' }, { status: 400 });
    }

    const result = await prisma.ticket.updateMany({
      where: { id: { in: ids } },
      data: updateData
    });

    // Logging bulk updates
    const dbUser = await prisma.user.findFirst({
      where: { username: user.email }
    });

    const logs: { ticketId: number; userId: number | undefined; action: string; field: string; oldValue: string | null; newValue: string | null }[] = [];
    let assignedUserName: string | null = null;
    if (updateData.assignedToId) {
      const assignedUser = await prisma.user.findUnique({ 
        where: { id: updateData.assignedToId as number }, 
        select: { name: true, username: true } 
      });
      assignedUserName = assignedUser ? (assignedUser.name || assignedUser.username) : 'Unassigned';
    } else if (updateData.assignedToId === null) {
      assignedUserName = 'Unassigned';
    }

    for (const id of ids) {
      if (updateData.status) {
        logs.push({ ticketId: id, userId: dbUser?.id, action: 'STATUS_CHANGE', field: 'status', oldValue: 'Bulk Update', newValue: String(updateData.status) });
      }
      if (updateData.priority) {
        logs.push({ ticketId: id, userId: dbUser?.id, action: 'PRIORITY_CHANGE', field: 'priority', oldValue: 'Bulk Update', newValue: String(updateData.priority) });
      }
      if ('assignedToId' in updateData) {
        logs.push({ ticketId: id, userId: dbUser?.id, action: 'ASSIGNMENT_CHANGE', field: 'assignedToId', oldValue: 'Bulk Update', newValue: assignedUserName });
      }
    }

    if (logs.length > 0) {
      await prisma.activityLog.createMany({
        data: logs
      });
    }

    return NextResponse.json({ success: true, count: result.count });
  } catch (error) {
    console.error('Bulk update error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
