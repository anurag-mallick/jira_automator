import { NextResponse, type NextRequest } from 'next/server';

const rateLimit = new Map<string, { count: number; lastReset: number }>();
const LIMIT = 100;
const WINDOW = 60 * 1000;

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api')) {
    const ip = request.headers.get('x-forwarded-for') || 'anonymous';
    const now = Date.now();
    const current = rateLimit.get(ip) || { count: 0, lastReset: now };
    if (now - current.lastReset > WINDOW) {
      current.count = 0;
      current.lastReset = now;
    }
    current.count++;
    rateLimit.set(ip, current);
    if (current.count > LIMIT) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
