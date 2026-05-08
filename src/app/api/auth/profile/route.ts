export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth";

export const GET = withAuth(async (req: NextRequest, user: any) => {
  try {
    // Email from JWT session
    const email = user.email;

    if (!email) {
      return NextResponse.json({ error: "Email not found in session" }, { status: 400 });
    }

    // Fetch full user profile from Prisma
    const dbUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        username: true,
        isActive: true
      }
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User profile not found in database" }, { status: 404 });
    }

    return NextResponse.json(dbUser);
  } catch (error: any) {
    console.error("Profile Fetch Error:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
});
