export const revalidate = 60;
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

export const GET = withAuth(async (req: NextRequest, user: any) => {
  try {
    const columns = await prisma.kanbanColumn.findMany({
      orderBy: { order: 'asc' }
    });
    return NextResponse.json(columns);
  } catch (error: any) {
    console.error('Error fetching columns:', error);
    return NextResponse.json({ error: 'Failed to fetch columns' }, { status: 500 });
  }
});

export const POST = withAuth(async (req: NextRequest, user: any) => {
  try {
    // Only Admin can create new stages
      const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
      select: { role: true }
    });
    if (dbUser?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { title, order } = body;

    if (!title || typeof order !== 'number') {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const newCol = await prisma.kanbanColumn.create({
      data: { title, order }
    });

    return NextResponse.json(newCol);
  } catch (error: any) {
    console.error('Error creating column:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

export const PUT = withAuth(async (req: NextRequest, user: any) => {
  try {
      const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
      select: { role: true }
    });
    if (dbUser?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { columns } = body; // Array of { id, order, title }

    if (!Array.isArray(columns)) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    // Update in transaction to maintain order
    await prisma.$transaction(
      columns.map((col: any) => 
        prisma.kanbanColumn.update({
          where: { id: col.id },
          data: { order: col.order, title: col.title }
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating columns:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

