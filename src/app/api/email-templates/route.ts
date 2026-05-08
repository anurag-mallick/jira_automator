export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';

const DEFAULT_TEMPLATES = [
  {
    name: 'Ticket Acknowledgement',
    type: 'ACKNOWLEDGEMENT',
    subject: 'We received your ticket #{{ ticket.id }}',
    content: `<p>Hello {{ customer.name | default: "Customer" }},</p>
<p>Thank you for contacting us. We have received your ticket and will respond within the SLA timeframe.</p>
<p><strong>Ticket Details:</strong></p>
<ul>
<li><strong>Ticket ID:</strong> #{{ ticket.id }}</li>
<li><strong>Subject:</strong> {{ ticket.title }}</li>
<li><strong>Priority:</strong> {{ ticket.priority }}</li>
</ul>
<p>You can track your ticket status at: <a href="{{ ticket_url }}">{{ ticket_url }}</a></p>
<p>Best regards,<br/>Support Team</p>`
  },
  {
    name: 'Agent Reply',
    type: 'REPLY',
    subject: 'Re: [Ticket #{{ ticket.id }}] {{ ticket.title }}',
    content: `<p>Hello {{ customer.name | default: "Customer" }},</p>
<p>{{ reply_content }}</p>
<p>If you have any further questions, please don't hesitate to reply to this email.</p>
<p>Best regards,<br/>{{ agent.name }}</p>
<p><em>Ticket #{{ ticket.id }} - {{ ticket.title }}</em></p>`
  },
  {
    name: 'Ticket Resolved',
    type: 'RESOLVED',
    subject: 'Ticket #{{ ticket.id }} has been resolved',
    content: `<p>Hello {{ customer.name | default: "Customer" }},</p>
<p>Your ticket has been marked as resolved.</p>
<p><strong>Resolution:</strong></p>
<p>{{ ticket.resolution | default: "The issue has been addressed." }}</p>
<p>If you're still experiencing issues, please reply to this email and we will reopen your ticket.</p>
<p>Best regards,<br/>Support Team</p>`
  },
  {
    name: 'Feedback Request',
    type: 'FEEDBACK',
    subject: 'How was your experience with Ticket #{{ ticket.id }}?',
    content: `<p>Hello {{ customer.name | default: "Customer" }},</p>
<p>We hope your issue has been resolved. We would appreciate your feedback on your experience.</p>
<p>Please take a moment to rate your experience: <a href="{{ feedback_url }}">Rate Now</a></p>
<p>Thank you for your time!</p>
<p>Best regards,<br/>Support Team</p>`
  }
];

export const GET = withAuth(async (req: NextRequest, user: any) => {
  try {
    const templates = await prisma.emailTemplate.findMany({
      orderBy: [{ type: 'asc' }, { name: 'asc' }]
    });

    return NextResponse.json({ templates });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
});

export const POST = withAuth(async (req: NextRequest, user: any) => {
  try {
    const body = await req.json();
    const { name, subject, content, type, isActive } = body;

    if (!name || !subject || !content) {
      return NextResponse.json({ error: 'Name, subject, and content are required' }, { status: 400 });
    }

    const template = await prisma.emailTemplate.create({
      data: {
        name,
        subject,
        content,
        type: type || 'CUSTOM',
        isActive: isActive !== false
      }
    });

    return NextResponse.json(template);
  } catch (err: any) {
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Template with this name already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
});

export const PUT = withAuth(async (req: NextRequest, user: any) => {
  try {
    const { initializeDefaults } = await req.json();

    if (initializeDefaults) {
      const created = [];
      for (const t of DEFAULT_TEMPLATES) {
        const existing = await prisma.emailTemplate.findUnique({
          where: { name: t.name }
        });
        if (!existing) {
          const createdTemplate = await prisma.emailTemplate.create({
            data: t
          });
          created.push(createdTemplate);
        }
      }
      return NextResponse.json({ message: 'Default templates initialized', created });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to initialize templates' }, { status: 500 });
  }
});
