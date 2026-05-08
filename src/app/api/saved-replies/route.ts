export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

export const GET = withAuth(async (req: NextRequest, user: any) => {
  try {
    const savedReplies = await prisma.savedReply.findMany({
      include: {
        team: { select: { id: true, name: true } },
        createdBy: { select: { id: true, username: true, name: true } }
      },
      orderBy: { title: 'asc' }
    });

    return NextResponse.json({ savedReplies });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch saved replies' }, { status: 500 });
  }
});

export const POST = withAuth(async (req: NextRequest, user: any) => {
  try {
    const body = await req.json();
    const { title, content, isPublic, teamId } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    const dbUser = await prisma.user.findFirst({
      where: { username: user.email }
    });

    const savedReply = await prisma.savedReply.create({
      data: {
        title,
        content,
        isPublic: isPublic || false,
        teamId,
        createdById: dbUser?.id
      },
      include: {
        team: { select: { id: true, name: true } },
        createdBy: { select: { id: true, username: true, name: true } }
      }
    });

    return NextResponse.json(savedReply);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to create saved reply' }, { status: 500 });
  }
});
