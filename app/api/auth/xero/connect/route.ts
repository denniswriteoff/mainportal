import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authorizationUrl = new URL("https://login.xero.com/identity/connect/authorize");
  authorizationUrl.searchParams.append("client_id", process.env.XERO_CLIENT_ID!);
  authorizationUrl.searchParams.append("response_type", "code");
  authorizationUrl.searchParams.append(
    "scope",
    "openid profile email accounting.transactions accounting.contacts accounting.settings offline_access"
  );
  authorizationUrl.searchParams.append("redirect_uri", process.env.XERO_REDIRECT_URI!);
  authorizationUrl.searchParams.append(
    "state",
    Buffer.from(JSON.stringify({ userId: session.user.id })).toString("base64")
  );

  return NextResponse.redirect(authorizationUrl.toString());
}

