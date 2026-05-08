export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { createRequestLogger } from '@/lib/logger';

// Create Knowledge Base Article
export const POST = withAuth(async (req: NextRequest, user: any) => {
  const logger = createRequestLogger(req);

  try {
    logger.info('Creating knowledge base article', { user: user?.email });

    const body = await req.json();
    const { title, content, category, tags, isPublished, teamId } = body;

    if (!title || !content) {
      logger.warn('Knowledge base article validation failed', { reason: 'Missing required fields' });
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    const dbUser = await prisma.user.findFirst({
      where: { username: user.email }
    });

    const article = await prisma.knowledgeBaseArticle.create({
      data: {
        title,
        content,
        category: category || 'General',
        tags: tags || [],
        isPublished: isPublished || false,
        teamId: teamId ? parseInt(teamId) : null,
        createdById: dbUser?.id,
        slug: title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      },
      include: {
        team: { select: { id: true, name: true } },
        createdBy: { select: { id: true, username: true, name: true } }
      }
    });

    logger.info('Knowledge base article created successfully', { articleId: article.id, title: article.title });

    return NextResponse.json(article);
  } catch (err: any) {
    logger.error('Failed to create knowledge base article', {
      error: err.message,
      stack: err.stack
    });
    return NextResponse.json({ error: 'Failed to create knowledge base article' }, { status: 500 });
  }
});

// Get Knowledge Base Articles
export const GET = withAuth(async (req: NextRequest, user: any) => {
  const logger = createRequestLogger(req);

  try {
    logger.info('Fetching knowledge base articles', { user: user?.email });

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const isPublished = searchParams.get('published') === 'true';

    const whereClause: any = {};
    if (category) whereClause.category = category;
    if (isPublished) whereClause.isPublished = true;
    if (search) whereClause.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { content: { contains: search, mode: 'insensitive' } },
      { tags: { hasSome: [search] } }
    ];

    const articles = await prisma.knowledgeBaseArticle.findMany({
      where: whereClause,
      include: {
        team: { select: { id: true, name: true } },
        createdBy: { select: { id: true, username: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    logger.info('Knowledge base articles fetched successfully', { count: articles.length });

    return NextResponse.json({ articles });
  } catch (err: any) {
    logger.error('Failed to fetch knowledge base articles', {
      error: err.message,
      stack: err.stack
    });
    return NextResponse.json({ error: 'Failed to fetch knowledge base articles' }, { status: 500 });
  }
});