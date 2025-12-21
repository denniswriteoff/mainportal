import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's creation date
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { createdAt: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get all announcements created after user account creation
    const announcements = await prisma.announcement.findMany({
      where: {
        createdAt: {
          gte: user.createdAt, // Only show announcements created after user signup
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Get user's read announcements
    const readAnnouncements = await prisma.userAnnouncement.findMany({
      where: {
        userId: session.user.id,
        read: true,
      },
      select: {
        announcementId: true,
      },
    });

    const readIds = new Set(readAnnouncements.map((r) => r.announcementId));

    // Filter to only unread announcements
    const unreadAnnouncements = announcements.filter(
      (announcement) => !readIds.has(announcement.id)
    );

    return NextResponse.json({
      announcements: unreadAnnouncements,
    });
  } catch (error) {
    console.error("Error fetching unread announcements:", error);
    return NextResponse.json(
      { error: "Failed to fetch announcements" },
      { status: 500 }
    );
  }
}

