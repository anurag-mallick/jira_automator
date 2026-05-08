import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

export const POST = withAuth(async (req: NextRequest, user: { email: string; id: number; name?: string; username: string; role: string }, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    const { title } = await req.json();

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const item = await prisma.checklistItem.create({
      data: {
        title,
        ticketId: parseInt(id)
      }
    });

    const dbUser = await prisma.user.findFirst({
      where: { username: user.email }
    });

    await prisma.activityLog.create({
      data: {
        ticketId: parseInt(id),
        userId: dbUser?.id,
        action: 'CHECKLIST_ITEM_ADDED',
        newValue: title
      }
    });

    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: 'Failed to create checklist item' }, { status: 500 });
  }
});
