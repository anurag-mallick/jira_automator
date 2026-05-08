export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

export const GET = withAuth(async (req: NextRequest, user: any) => {
  try {
    const spaces = await prisma.space.findMany({
      include: {
        folders: true
      },
      orderBy: { createdAt: 'asc' }
    });
    return NextResponse.json(spaces);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});

export const POST = withAuth(async (req: NextRequest, user: any) => {
    const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
    select: { role: true }
  });
  if (dbUser?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  try {
    const { name, description } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Space name is required' }, { status: 400 });
    }

    const space = await prisma.space.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null
      }
    });
    
    return NextResponse.json(space, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});

