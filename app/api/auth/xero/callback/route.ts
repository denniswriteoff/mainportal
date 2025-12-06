import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createXeroClient, saveXeroTokens } from "@/lib/xero";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    return NextResponse.redirect(
      new URL(`/profile?error=${encodeURIComponent(errorDescription || error)}`, request.url)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/profile?error=Invalid callback", request.url)
    );
  }

  try {
    const { userId } = JSON.parse(
      Buffer.from(state, "base64").toString("utf-8")
    );

    // Exchange code for tokens using xero-node
    const xero = createXeroClient(state);
    await xero.initialize();
    const tokenSet = await xero.apiCallback(request.url);

    if (!tokenSet.access_token || !tokenSet.refresh_token) {
        throw new Error("Failed to get tokens from Xero");
    }

    // Update tenants to get the list of connected organizations
    await xero.updateTenants();

    const tenantId = xero.tenants[0]?.tenantId;
    if (!tenantId) {
        throw new Error("No tenant found");
    }

    // Save tokens
    await saveXeroTokens(userId, {
        accessToken: tokenSet.access_token,
        refreshToken: tokenSet.refresh_token,
        idToken: tokenSet.id_token,
        expiresIn: tokenSet.expires_in || 1800,
        tokenType: tokenSet.token_type || 'Bearer',
        scope: tokenSet.scope,
        tenantId: tenantId
    });

    // Update user's accounting service
    await prisma.user.update({
      where: { id: userId },
      data: { accountingService: "XERO" },
    });

    return NextResponse.redirect(new URL("/profile?success=xero-connected", request.url));
  } catch (error) {
    console.error("Xero OAuth error:", error);
    return NextResponse.redirect(
      new URL(`/profile?error=${encodeURIComponent(error instanceof Error ? error.message : "Failed to connect Xero")}`, request.url)
    );
  }
}
