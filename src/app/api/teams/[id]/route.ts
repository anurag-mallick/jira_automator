export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

export const GET = withAuth(async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    const team = await prisma.team.findUnique({
      where: { id: parseInt(id) },
      include: {
        agents: {
          select: { id: true, username: true, name: true, email: true, isActive: true }
        },
        _count: { select: { tickets: true } }
      }
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    return NextResponse.json(team);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 });
  }
});

export const PUT = withAuth(async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, description, isActive, roundRobin, agentIds } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (roundRobin !== undefined) updateData.roundRobin = roundRobin;

    if (agentIds !== undefined) {
      updateData.agents = {
        set: agentIds.map((id: number) => ({ id }))
      };
    }

    const team = await prisma.team.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        agents: {
          select: { id: true, username: true, name: true, email: true, isActive: true }
        }
      }
    });

    return NextResponse.json(team);
  } catch (err: any) {
    if (err.code === 'P2025') {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update team' }, { status: 500 });
  }
});

export const DELETE = withAuth(async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    await prisma.team.delete({
      where: { id: parseInt(id) }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.code === 'P2025') {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete team' }, { status: 500 });
  }
});
