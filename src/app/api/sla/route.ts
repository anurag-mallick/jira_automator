import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, requireAdmin } from '@/lib/auth';

export const GET = withAuth(async (req: NextRequest, user: any) => {
  try {
    const policies = await prisma.sLAPolicy.findMany({
      orderBy: { priority: 'asc' }
    });
    // Convert minutes to hours for display
    const policiesInHours = policies.map(p => ({
      ...p,
      responseTimeHours: p.responseTimeMins / 60
    }));
    return NextResponse.json(policiesInHours);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch SLA policies' }, { status: 500 });
  }
});

export const POST = withAuth(async (req: NextRequest, user: any) => {
  const isAdmin = await requireAdmin(user);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { priority, responseTimeHours, name } = body;

    if (!priority || responseTimeHours === undefined) {
      return NextResponse.json({ error: 'Priority and response time are required' }, { status: 400 });
    }

    // Convert hours to minutes for storage
    const responseTimeMins = Math.round(parseFloat(responseTimeHours.toString()) * 60);

    const policy = await prisma.sLAPolicy.upsert({
      where: { priority },
      update: { 
        responseTimeMins, 
        name: name || priority 
      },
      create: { 
        priority, 
        responseTimeMins, 
        name: name || priority 
      }
    });

    return NextResponse.json({
        ...policy,
        responseTimeHours: policy.responseTimeMins / 60
    });
  } catch (error) {
    console.error('Failed to save SLA policy:', error);
    return NextResponse.json({ error: 'Failed to save SLA policy' }, { status: 500 });
  }
});
