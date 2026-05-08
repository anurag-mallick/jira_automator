export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

export const POST = withAuth(async (req: NextRequest, user: any) => {
    const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
    select: { role: true }
  });
  if (dbUser?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  try {
    const { name, spaceId } = await req.json();
    
    if (!name?.trim() || !spaceId) {
      return NextResponse.json({ error: 'Folder name and Space ID are required' }, { status: 400 });
    }

    const space = await prisma.space.findUnique({ where: { id: parseInt(spaceId) } });
    if (!space) {
      return NextResponse.json({ error: 'Space not found' }, { status: 404 });
    }

    const folder = await prisma.folder.create({
      data: {
        name: name.trim(),
        spaceId: parseInt(spaceId)
      }
    });
    
    return NextResponse.json(folder, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});

