export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { createRequestLogger } from '@/lib/logger';
import cache from '@/lib/cache';

// Search Knowledge Base with caching
export const GET = withAuth(async (req: NextRequest, user: any) => {
  const logger = createRequestLogger(req);

  try {
    logger.info('Searching knowledge base', { user: user?.email });

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '20');
    const includeDrafts = searchParams.get('drafts') === 'true';

    if (!query && !category) {
      logger.warn('Knowledge base search validation failed', { reason: 'No search query or category provided' });
      return NextResponse.json({ error: 'Query or category is required' }, { status: 400 });
    }

    const cacheKey = `kb-search-${query}-${category}-${includeDrafts}-${limit}`;
    const cachedResults = await cache.get(cacheKey);

    if (cachedResults) {
      logger.debug('Knowledge base search cache hit', { cacheKey });
      return NextResponse.json(cachedResults);
    }

    const whereClause: any = {};
    if (!includeDrafts) whereClause.isPublished = true;
    if (category) whereClause.category = category;

    if (query) {
      whereClause.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { content: { contains: query, mode: 'insensitive' } },
        { tags: { hasSome: [query] } },
        { category: { contains: query, mode: 'insensitive' } }
      ];
    }

    const articles = await prisma.knowledgeBaseArticle.findMany({
      where: whereClause,
      include: {
        team: { select: { id: true, name: true } },
        createdBy: { select: { id: true, username: true, name: true } }
      },
      orderBy: [
        { isPublished: 'desc' },
        { createdAt: 'desc' }
      ],
      take: limit
    });

    const result = {
      success: true,
      articles,
      count: articles.length,
      cached: false
    };

    // Cache results for 5 minutes
    await cache.set(cacheKey, result, { ttl: 300 });

    logger.info('Knowledge base search completed', {
      query,
      category,
      count: articles.length,
      cached: false
    });

    return NextResponse.json(result);
  } catch (err: any) {
    logger.error('Knowledge base search failed', {
      error: err.message,
      stack: err.stack
    });
    return NextResponse.json({
      success: false,
      error: 'Failed to search knowledge base',
      articles: []
    }, { status: 500 });
  }
});