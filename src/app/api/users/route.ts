export const revalidate = 60;
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth";

async function getUsersHandler(req: NextRequest, user: any) {
  try {
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
      select: { role: true }
    });
    const isAdmin = dbUser?.role === 'ADMIN';

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        isActive: true,
        ...(isAdmin ? { email: true, role: true, createdAt: true } : {})
      },
      where: isAdmin ? {} : { isActive: true },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
import bcrypt from 'bcryptjs';
import { sendTicketEmail } from '@/lib/email';

async function createUserHandler(req: NextRequest, user: any) {
  try {
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
      select: { role: true }
    });
    if (dbUser?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data = await req.json();
    
    const passwordToHash = data.password || 'Welcome@123';
    const hashed = await bcrypt.hash(passwordToHash, 10);

    const newUser = await prisma.user.create({
      data: {
        username: data.username || data.email?.split('@')[0] || 'user',
        email: data.email,
        name: data.name || '',
        role: data.role || 'STAFF',
        password: hashed,
        isActive: true
      }
    });

    try {
      await sendTicketEmail({
        type: 'USER_CREATED',
        recipient: { email: data.email, name: data.name || data.username || 'User' },
        password: passwordToHash
      });
    } catch (mailErr) {
      console.error("Failed to send welcome email:", mailErr);
    }

    return NextResponse.json(newUser, { status: 201 });
  } catch (error: Error | any) {
    console.error("Create User Error:", error);
    return NextResponse.json({ error: (error as Error).message || "Failed to create user" }, { status: 500 });
  }
}

export const GET = withAuth(getUsersHandler);
export const POST = withAuth(createUserHandler);

