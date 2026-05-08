import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

export const PATCH = withAuth(async (req: NextRequest, user: { email: string; id: number; name?: string; username: string; role: string }, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    const { isCompleted, title } = await req.json();

    const data: { isCompleted?: boolean; title?: string } = {};
    if (isCompleted !== undefined) data.isCompleted = isCompleted;
    if (title !== undefined) data.title = title;

    const item = await prisma.checklistItem.update({
      where: { id: parseInt(id) },
      data
    });

    if (isCompleted !== undefined) {
      const dbUser = await prisma.user.findFirst({
        where: { username: user.email }
      });

      await prisma.activityLog.create({
        data: {
          ticketId: item.ticketId,
          userId: dbUser?.id,
          action: isCompleted ? 'CHECKLIST_ITEM_COMPLETED' : 'CHECKLIST_ITEM_UNCOMPLETED',
          newValue: item.title
        }
      });
    }

    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: 'Failed to update checklist item' }, { status: 500 });
  }
});

export const DELETE = withAuth(async (req: NextRequest, _user: { email: string; id: number; name?: string; username: string; role: string }, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    
    await prisma.checklistItem.delete({
      where: { id: parseInt(id) }
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete checklist item' }, { status: 500 });
  }
});
