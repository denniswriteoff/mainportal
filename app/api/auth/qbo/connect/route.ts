import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authorizationUrl = new URL(
    "https://appcenter.intuit.com/connect/oauth2"
  );
  authorizationUrl.searchParams.append("client_id", process.env.INTUIT_CLIENT_ID!);
  authorizationUrl.searchParams.append("response_type", "code");
  authorizationUrl.searchParams.append("scope", "com.intuit.quickbooks.accounting");
  authorizationUrl.searchParams.append("redirect_uri", process.env.INTUIT_REDIRECT_URI!);
  authorizationUrl.searchParams.append(
    "state",
    Buffer.from(JSON.stringify({ userId: session.user.id })).toString("base64")
  );

  return NextResponse.redirect(authorizationUrl.toString());
}

