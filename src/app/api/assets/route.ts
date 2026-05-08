export const revalidate = 60;
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth";

export const GET = withAuth(async (req: NextRequest, user: any) => {
  try {
    const assets = await prisma.asset.findMany({
      include: {
        assignedTo: {
          select: { id: true, name: true, username: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(assets);
  } catch (error) {
    console.error("Error fetching assets:", error);
    return NextResponse.json({ error: "Failed to fetch assets" }, { status: 500 });
  }
});

export const POST = withAuth(async (req: NextRequest, user: any) => {
    const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
    select: { role: true }
  });
  if (dbUser?.role !== 'ADMIN' && dbUser?.role !== 'STAFF') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { 
      name, 
      type, 
      status, 
      description, 
      assignedToId,
      serialNumber,
      manufacturer,
      model,
      location,
      purchaseDate,
      warrantyExpiry,
      purchaseCost,
      specs
    } = body;

    const asset = await prisma.asset.create({
      data: {
        name,
        type,
        status: status || "ACTIVE",
        description,
        serialNumber,
        manufacturer,
        model,
        location,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null,
        purchaseCost: purchaseCost ? parseFloat(purchaseCost) : null,
        specs: specs || {},
        assignedToId: assignedToId ? parseInt(assignedToId, 10) : null,
      },
      include: {
        assignedTo: { select: { id: true, name: true, username: true } },
      },
    });

    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    console.error("Error creating asset:", error);
    return NextResponse.json({ error: "Failed to create asset" }, { status: 500 });
  }
});

