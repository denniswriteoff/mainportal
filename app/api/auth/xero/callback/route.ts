import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { prisma } from "@/lib/db";

const XERO_TOKEN_URL = "https://identity.xero.com/connect/token";
const XERO_CONNECTIONS_URL = "https://api.xero.com/connections";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/profile?error=Invalid callback", request.url)
    );
  }

  try {
    const { userId } = JSON.parse(
      Buffer.from(state, "base64").toString("utf-8")
    );

    // Exchange code for tokens
    const tokenResponse = await axios.post(
      XERO_TOKEN_URL,
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.XERO_REDIRECT_URI!,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(
            `${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`
          ).toString("base64")}`,
        },
      }
    );

    const { access_token, refresh_token, expires_in, id_token } =
      tokenResponse.data;

    // Get tenant information
    const connectionsResponse = await axios.get(XERO_CONNECTIONS_URL, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const tenantId = connectionsResponse.data[0]?.tenantId;

    if (!tenantId) {
      throw new Error("No tenant found");
    }

    // Save token to database
    await prisma.xeroToken.create({
      data: {
        userId,
        tenantId,
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresIn: expires_in,
        idToken: id_token,
        tokenType: "Bearer",
        accessTokenExpiresAt: new Date(Date.now() + expires_in * 1000),
      },
    });

    // Update user's accounting service
    await prisma.user.update({
      where: { id: userId },
      data: { accountingService: "XERO" },
    });

    return NextResponse.redirect(new URL("/?success=xero-connected", request.url));
  } catch (error) {
    console.error("Xero OAuth error:", error);
    return NextResponse.redirect(
      new URL("/profile?error=Failed to connect Xero", request.url)
    );
  }
}

