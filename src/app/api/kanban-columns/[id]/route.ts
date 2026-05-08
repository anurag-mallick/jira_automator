import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

export const PUT = withAuth(async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string }> }) => {
    const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
    select: { role: true }
  });
  if (dbUser?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  try {
    const { id } = await params;
    const { title } = await req.json();
    
    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const col = await prisma.kanbanColumn.findUnique({ where: { id: parseInt(id) } });
    if (!col) {
      return NextResponse.json({ error: 'Column not found' }, { status: 404 });
    }

    const updated = await prisma.kanbanColumn.update({
      where: { id: parseInt(id) },
      data: { title: title.trim().toUpperCase().replace(/ /g, '_') }
    });
    
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});

export const DELETE = withAuth(async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string }> }) => {
    const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
    select: { role: true }
  });
  if (dbUser?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  try {
    const { id } = await params;
    
    const col = await prisma.kanbanColumn.findUnique({ where: { id: parseInt(id) } });
    if (!col) {
      return NextResponse.json({ error: 'Column not found' }, { status: 404 });
    }

    await prisma.kanbanColumn.delete({
      where: { id: parseInt(id) }
    });
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});
