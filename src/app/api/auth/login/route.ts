import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Invalid credentials or inactive account' }, { status: 401 });
    }
    
    // Check password
    let valid = false;
    // Check if the stored password matches (it might not be hashed yet if it's old data, but new data will be)
    // We should try bcrypt first, if it fails and it's not a bcrypt hash, we can do a direct compare for migration purposes or just fail.
    // The instructions say to hash all passwords going forward.
    try {
        if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$') || user.password.startsWith('$2y$')) {
           valid = await bcrypt.compare(password, user.password);
        } else {
           // Legacy plain text check (should ideally prompt password reset, but for now allow to login and maybe hash it?)
           valid = (password === user.password);
           
           // Opportunistic hashing: if they logged in with plaintext, hash it now so next time it's secure.
           if (valid) {
               const hashed = await bcrypt.hash(password, 10);
               await prisma.user.update({
                   where: { id: user.id },
                   data: { password: hashed }
               });
           }
        }
    } catch(e) {
        console.error("Password comparison error", e);
    }

    if (!valid) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = await signToken({ id: user.id, email: user.email, role: user.role, name: user.name, username: user.username });
    const res = NextResponse.json({ ok: true, user: { id: user.id, email: user.email, role: user.role, name: user.name, username: user.username } });
    
    res.cookies.set('session', token, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax', 
        path: '/',
        maxAge: 60 * 60 * 24 * 7 // 7 days
    });
    
    return res;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
