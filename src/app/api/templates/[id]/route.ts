import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, requireAdmin } from '@/lib/auth';

export const DELETE = withAuth(async (req: NextRequest, _user: any, { params }: { params: Promise<{ id: string }> }) => {
  const adminCheck = await requireAdmin(_user);
  if (!adminCheck) {
    return NextResponse.json({ error: 'Unauthorized. Admins only.' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const viewId = parseInt(id);
    if (isNaN(viewId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    await prisma.ticketTemplate.delete({
      where: { id: viewId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete template:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
