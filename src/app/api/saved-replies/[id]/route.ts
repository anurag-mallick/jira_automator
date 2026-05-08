export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

export const PUT = withAuth(async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    const body = await req.json();
    const { title, content, isPublic, teamId } = body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    if (teamId !== undefined) updateData.teamId = teamId;

    const savedReply = await prisma.savedReply.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        team: { select: { id: true, name: true } },
        createdBy: { select: { id: true, username: true, name: true } }
      }
    });

    return NextResponse.json(savedReply);
  } catch (err: any) {
    if (err.code === 'P2025') {
      return NextResponse.json({ error: 'Saved reply not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update saved reply' }, { status: 500 });
  }
});

export const DELETE = withAuth(async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    await prisma.savedReply.delete({
      where: { id: parseInt(id) }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.code === 'P2025') {
      return NextResponse.json({ error: 'Saved reply not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete saved reply' }, { status: 500 });
  }
});
