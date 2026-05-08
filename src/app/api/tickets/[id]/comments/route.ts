import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { sendTicketEmail } from '@/lib/email';

export const GET = withAuth(async (req: NextRequest, _user: { email: string; id: number; name?: string; username: string; role: string }, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    const ticketId = parseInt(id);
    if (isNaN(ticketId)) {
      return NextResponse.json({ error: 'Invalid ticket ID' }, { status: 400 });
    }

    const comments = await prisma.comment.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            role: true
          }
        }
      }
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error('Failed to fetch comments:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});

export const POST = withAuth(async (req: NextRequest, user: { email: string; id: number; name?: string; username: string; role: string }, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    const ticketId = parseInt(id);
    if (isNaN(ticketId)) {
      return NextResponse.json({ error: 'Invalid ticket ID' }, { status: 400 });
    }

    const body = await req.json();
    const { content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 });
    }

    // 1. Create the comment
    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        ticketId,
        authorId: user.id,
        authorName: user.name || user.username,
      },
      include: {
         author: { select: { id: true, name: true, username: true } },
         ticket: { select: { title: true } }
      }
    });

    // Log the comment addition
    const dbUser = await prisma.user.findFirst({
      where: { username: user.email }
    });

    const truncatedContent = content.length > 80 ? content.substring(0, 80) + '...' : content;
    
    await prisma.activityLog.create({
      data: {
        ticketId,
        userId: dbUser?.id,
        action: 'COMMENT_ADDED',
        newValue: truncatedContent
      }
    });

    // 2. Parse @mentions
    // Look for @username
    const mentionRegex = /@([a-zA-Z0-9_\-\.]+)/g;
    const matches = [...content.matchAll(mentionRegex)];
    const mentionedUsernames = matches.map(m => m[1]);

    if (mentionedUsernames.length > 0) {
      // Find the associated users
      const mentionedUsers = await prisma.user.findMany({
        where: {
          username: { in: mentionedUsernames }
        },
        select: { email: true, name: true, username: true }
      });

    // 3. Send Emails
    const notificationPromises = [];

    // Notify ticket assignee about the new comment
    const fullTicket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { assignedTo: true }
    });

    if (fullTicket?.assignedTo?.username && fullTicket.assignedToId !== user.id) {
      notificationPromises.push(
        sendTicketEmail({
          type: 'NEW_COMMENT',
          ticket: fullTicket as any,
          recipient: { email: fullTicket.assignedTo.username, name: fullTicket.assignedTo.name || 'Assignee' },
          comment: content
        })
      );
    }

    // Notify mentioned users
    if (mentionedUsers.length > 0) {
      mentionedUsers.forEach(mentionedUser => {
        if (mentionedUser.email && mentionedUser.email !== (fullTicket?.assignedTo?.username)) {
           notificationPromises.push(
             sendTicketEmail({
               type: 'NEW_COMMENT',
               ticket: fullTicket as any,
               recipient: { email: mentionedUser.email, name: mentionedUser.name || 'User' },
               comment: `You were mentioned: ${content}`
             })
           );
        }
      });
    }

    if (notificationPromises.length > 0) {
      Promise.allSettled(notificationPromises).then(results => {
        results.forEach((res, i) => {
          if (res.status === 'rejected') console.error(`Notification ${i} failed:`, res.reason);
        });
      });
    }
    }

    return NextResponse.json(comment, { status: 201 });

  } catch (error) {
    console.error('Failed to create comment:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
