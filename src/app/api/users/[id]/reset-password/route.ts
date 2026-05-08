export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth";
import bcrypt from 'bcryptjs';

export const POST = withAuth(async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string }> }) => {
  const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
    select: { role: true }
  });
  if (dbUser?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid User ID" }, { status: 400 });
    }

    const hashed = await bcrypt.hash('Welcome@123', 10);
    
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashed,
      }
    });

    return NextResponse.json({ message: "Password reset to default (Welcome@123) successfully" });
  } catch (error: any) {
    console.error("Reset Password Error:", error);
    return NextResponse.json({ error: error.message || "Failed to reset password" }, { status: 500 });
  }
});
