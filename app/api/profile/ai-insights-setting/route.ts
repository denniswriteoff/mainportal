import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { enableAiFinancialInsights } = await request.json();

    // Update user setting
    await prisma.user.update({
      where: { id: session.user.id },
      data: { enableAiFinancialInsights: Boolean(enableAiFinancialInsights) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("AI insights setting update error:", error);
    return NextResponse.json(
      { error: "Failed to update setting" },
      { status: 500 }
    );
  }
}

