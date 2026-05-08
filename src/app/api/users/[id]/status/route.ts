export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth";

export const PUT = withAuth(async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string }> }) => {
  // Only admins can activate/deactivate users
  const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
    select: { role: true }
  });
  
  if (dbUser?.role !== 'ADMIN') {
    return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
  }

  try {
    const { id } = await params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid User ID" }, { status: 400 });
    }

    const { isActive } = await req.json();

    if (typeof isActive !== 'boolean') {
      return NextResponse.json({ error: "isActive must be a boolean" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isActive }
    });

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    console.error("Update User Status Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update user status" }, { status: 500 });
  }
});
