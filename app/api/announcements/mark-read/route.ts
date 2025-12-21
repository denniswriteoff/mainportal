import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { announcementId } = await request.json();

    if (!announcementId) {
      return NextResponse.json(
        { error: "Announcement ID is required" },
        { status: 400 }
      );
    }

    // Mark announcement as read
    await prisma.userAnnouncement.upsert({
      where: {
        userId_announcementId: {
          userId: session.user.id,
          announcementId: announcementId,
        },
      },
      update: {
        read: true,
        readAt: new Date(),
      },
      create: {
        userId: session.user.id,
        announcementId: announcementId,
        read: true,
        readAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking announcement as read:", error);
    return NextResponse.json(
      { error: "Failed to mark announcement as read" },
      { status: 500 }
    );
  }
}

