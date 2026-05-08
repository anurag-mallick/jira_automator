import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createRequestLogger } from '@/lib/logger';

export function withLogging(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    const logger = createRequestLogger(req);
    const startTime = Date.now();

    try {
      logger.info('Request started', {
        method: req.method,
        path: req.nextUrl.pathname,
        query: Object.fromEntries(req.nextUrl.searchParams.entries())
      });

      const response = await handler(req);

      const duration = Date.now() - startTime;
      logger.info('Request completed', {
        status: response.status,
        duration: `${duration}ms`
      });

      return response;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error('Request failed', {
        error: error.message,
        stack: error.stack,
        duration: `${duration}ms`
      });

      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      );
    }
  };
}

export function logRequest(req: NextRequest) {
  const logger = createRequestLogger(req);
  logger.info('Request received', {
    method: req.method,
    path: req.nextUrl.pathname,
    userAgent: req.headers.get('user-agent'),
    ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  });
}
