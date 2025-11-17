import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || !user.accountingService) {
      return NextResponse.json(
        { error: "No service connected" },
        { status: 400 }
      );
    }

    // Delete tokens based on service type
    if (user.accountingService === "QBO") {
      await prisma.qboToken.deleteMany({
        where: { userId: session.user.id },
      });
    } else if (user.accountingService === "XERO") {
      await prisma.xeroToken.deleteMany({
        where: { userId: session.user.id },
      });
    }

    // Update user
    await prisma.user.update({
      where: { id: session.user.id },
      data: { accountingService: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Disconnect service error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect service" },
      { status: 500 }
    );
  }
}

