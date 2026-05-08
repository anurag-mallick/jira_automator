import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

export const DELETE = withAuth(async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    const viewId = parseInt(id);
    if (isNaN(viewId)) {
        return NextResponse.json({ error: 'Invalid view ID' }, { status: 400 });
    }

    // Verify ownership
    const existingView = await prisma.savedView.findUnique({
      where: { id: viewId }
    });

    if (!existingView) {
      return NextResponse.json({ error: 'Saved view not found' }, { status: 404 });
    }

    if (existingView.userId !== user.id) {
       return NextResponse.json({ error: 'Forbidden: You can only delete your own saved views' }, { status: 403 });
    }

    await prisma.savedView.delete({
      where: { id: viewId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete saved view:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
