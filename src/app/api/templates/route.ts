import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, requireAdmin } from '@/lib/auth';

export const GET = withAuth(async () => {
  try {
    const templates = await prisma.ticketTemplate.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(templates);
  } catch (error) {
    console.error('Failed to fetch templates:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});

export const POST = withAuth(async (req: NextRequest, _user: any) => {
  const adminCheck = await requireAdmin(_user);
  if (!adminCheck) {
    return NextResponse.json({ error: 'Unauthorized. Admins only.' }, { status: 403 });
  }

  try {
    const data = await req.json();
    const template = await prisma.ticketTemplate.create({
      data: {
        name: data.name,
        description: data.description || '',
        status: data.status || 'TODO',
        priority: data.priority || 'P2',
        tags: data.tags || [],
        checklists: data.checklists || []
      }
    });
    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('Failed to create template:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
