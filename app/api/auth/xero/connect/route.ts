import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getXeroAuthUrl } from "@/lib/xero";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const authorizationUrl = await getXeroAuthUrl(
      Buffer.from(JSON.stringify({ userId: session.user.id })).toString("base64")
    );
    return NextResponse.redirect(authorizationUrl);
  } catch (error) {
    console.error("Failed to generate Xero auth URL:", error);
    return NextResponse.json({ error: "Failed to generate authorization URL" }, { status: 500 });
  }
}
