export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { createRequestLogger } from '@/lib/logger';

// Get Single Knowledge Base Article
export const GET = withAuth(async (req: NextRequest, user: any, context: any) => {
  const logger = createRequestLogger(req);

  try {
    const articleId = parseInt(context.params.id);
    logger.info('Fetching knowledge base article', { articleId, user: user?.email });

    const article = await prisma.knowledgeBaseArticle.findUnique({
      where: { id: articleId },
      include: {
        team: { select: { id: true, name: true } },
        createdBy: { select: { id: true, username: true, name: true } }
      }
    });

    if (!article) {
      logger.warn('Knowledge base article not found', { articleId });
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    logger.info('Knowledge base article fetched successfully', { articleId });

    return NextResponse.json(article);
  } catch (err: any) {
    logger.error('Failed to fetch knowledge base article', {
      articleId: context.params.id,
      error: err.message,
      stack: err.stack
    });
    return NextResponse.json({ error: 'Failed to fetch knowledge base article' }, { status: 500 });
  }
});

// Update Knowledge Base Article
export const PUT = withAuth(async (req: NextRequest, user: any, context: any) => {
  const logger = createRequestLogger(req);

  try {
    const articleId = parseInt(context.params.id);
    logger.info('Updating knowledge base article', { articleId, user: user?.email });

    const body = await req.json();
    const { title, content, category, tags, isPublished, teamId } = body;

    const article = await prisma.knowledgeBaseArticle.findUnique({
      where: { id: articleId }
    });

    if (!article) {
      logger.warn('Knowledge base article not found for update', { articleId });
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const updatedArticle = await prisma.knowledgeBaseArticle.update({
      where: { id: articleId },
      data: {
        title: title || article.title,
        content: content || article.content,
        category: category || article.category,
        tags: tags || article.tags,
        isPublished: isPublished !== undefined ? isPublished : article.isPublished,
        teamId: teamId ? parseInt(teamId) : article.teamId,
        updatedAt: new Date(),
        slug: title ? title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : article.slug
      },
      include: {
        team: { select: { id: true, name: true } },
        createdBy: { select: { id: true, username: true, name: true } }
      }
    });

    logger.info('Knowledge base article updated successfully', { articleId });

    return NextResponse.json(updatedArticle);
  } catch (err: any) {
    logger.error('Failed to update knowledge base article', {
      articleId: context.params.id,
      error: err.message,
      stack: err.stack
    });
    return NextResponse.json({ error: 'Failed to update knowledge base article' }, { status: 500 });
  }
});

// Delete Knowledge Base Article
export const DELETE = withAuth(async (req: NextRequest, user: any, context: any) => {
  const logger = createRequestLogger(req);

  try {
    const articleId = parseInt(context.params.id);
    logger.info('Deleting knowledge base article', { articleId, user: user?.email });

    const article = await prisma.knowledgeBaseArticle.findUnique({
      where: { id: articleId }
    });

    if (!article) {
      logger.warn('Knowledge base article not found for deletion', { articleId });
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    await prisma.knowledgeBaseArticle.delete({
      where: { id: articleId }
    });

    logger.info('Knowledge base article deleted successfully', { articleId });

    return NextResponse.json({ success: true, message: 'Article deleted successfully' });
  } catch (err: any) {
    logger.error('Failed to delete knowledge base article', {
      articleId: context.params.id,
      error: err.message,
      stack: err.stack
    });
    return NextResponse.json({ error: 'Failed to delete knowledge base article' }, { status: 500 });
  }
});