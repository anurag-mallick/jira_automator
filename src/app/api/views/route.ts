import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

export const GET = withAuth(async (req: NextRequest, user: any) => {
  try {
    const views = await prisma.savedView.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(views);
  } catch (error) {
    console.error('Failed to fetch saved views:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});

export const POST = withAuth(async (req: NextRequest, user: any) => {
  try {
    const body = await req.json();
    const { name, query } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
       return NextResponse.json({ error: 'Invalid name provided' }, { status: 400 });
    }

    if (!query || typeof query !== 'object') {
       return NextResponse.json({ error: 'Invalid query object provided' }, { status: 400 });
    }

    const savedView = await prisma.savedView.create({
      data: {
        name: name.trim(),
        query,
        userId: user.id
      }
    });

    return NextResponse.json(savedView, { status: 201 });
  } catch (error) {
    console.error('Failed to create saved view:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
