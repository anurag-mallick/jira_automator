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
    const { name, description } = await req.json();
    
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Space name is required' }, { status: 400 });
    }

    const space = await prisma.space.findUnique({ where: { id: parseInt(id) } });
    if (!space) {
      return NextResponse.json({ error: 'Space not found' }, { status: 404 });
    }

    const updated = await prisma.space.update({
      where: { id: parseInt(id) },
      data: {
        name: name.trim(),
        description: description?.trim() || null
      }
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
    
    const space = await prisma.space.findUnique({ where: { id: parseInt(id) } });
    if (!space) {
      return NextResponse.json({ error: 'Space not found' }, { status: 404 });
    }

    await prisma.space.delete({
      where: { id: parseInt(id) }
    });
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});
