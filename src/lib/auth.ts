import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from './prisma';

if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET environment variable is not set');
const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function signToken(payload: object) {
  return new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
}

export async function getUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    if (!token) return null;
    const payload = await verifyToken(token);
    return payload;
  } catch {
    return null;
  }
}

export function withAuth(handler: (req: any, user: any, context?: any) => Promise<any>) {
  return async (req: any, context?: any) => {
    const user = await getUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    return handler(req, user, context);
  };
}

export async function requireAdmin(user: any) {
  if (!user || !user.email) return false;
  const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
    select: { role: true }
  });
  return dbUser?.role === 'ADMIN';
}
