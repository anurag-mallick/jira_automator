export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createRequestLogger } from '@/lib/logger';

// Public Knowledge Base Search
export const GET = async (req: NextRequest) => {
  const logger = createRequestLogger(req);

  try {
    logger.info('Public knowledge base search initiated');

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '10');

    const whereClause: any = {
      isPublished: true
    };

    if (category) whereClause.category = category;
    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { tags: { hasSome: [search] } }
      ];
    }

    const articles = await prisma.knowledgeBaseArticle.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        content: true,
        category: true,
        tags: true,
        slug: true,
        createdAt: true,
        updatedAt: true,
        createdBy: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    logger.info('Public knowledge base search completed', { count: articles.length, searchQuery: search });

    return NextResponse.json({
      success: true,
      articles,
      count: articles.length
    });
  } catch (err: any) {
    logger.error('Public knowledge base search failed', {
      error: err.message,
      stack: err.stack
    });
    return NextResponse.json({
      success: false,
      error: 'Failed to search knowledge base',
      articles: []
    }, { status: 500 });
  }
};