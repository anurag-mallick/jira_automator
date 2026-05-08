export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth";

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const rawTickets = await prisma.ticket.findMany({
      select: {
        id: true,
        title: true,
        description: true, // Needed for Kanban search
        status: true,
        priority: true,
        assignedTo: { select: { name: true } },
        slaBreachAt: true,
        tags: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const groupedTickets = rawTickets.reduce((acc, ticket) => {
      const status = ticket.status;
      if (!acc[status]) acc[status] = [];
      acc[status].push(ticket);
      return acc;
    }, {} as Record<string, typeof rawTickets>);

    return NextResponse.json({ tickets: rawTickets, groupedTickets });
  } catch (error) {
    console.error("Error fetching kanban tickets:", error);
    return NextResponse.json({ error: "Failed to fetch tickets" }, { status: 500 });
  }
});
