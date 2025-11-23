import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { prisma } from "@/lib/db";

const QBO_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const realmId = searchParams.get("realmId");

  if (!code || !state || !realmId) {
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
      QBO_TOKEN_URL,
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.INTUIT_REDIRECT_URI!,
      }),
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(
            `${process.env.INTUIT_CLIENT_ID}:${process.env.INTUIT_CLIENT_SECRET}`
          ).toString("base64")}`,
        },
      }
    );

    const {
      access_token,
      refresh_token,
      expires_in,
      x_refresh_token_expires_in,
      id_token,
    } = tokenResponse.data;

    // Save token to database
    await prisma.qboToken.create({
      data: {
        userId,
        realmId,
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresIn: expires_in,
        refreshTokenExpiresIn: x_refresh_token_expires_in,
        idToken: id_token,
        tokenType: "Bearer",
        accessTokenExpiresAt: new Date(Date.now() + expires_in * 1000),
        refreshTokenExpiresAt: x_refresh_token_expires_in
          ? new Date(Date.now() + x_refresh_token_expires_in * 1000)
          : null,
      },
    });

    // Update user's accounting service
    await prisma.user.update({
      where: { id: userId },
      data: { accountingService: "QBO" },
    });

    return NextResponse.redirect(new URL("/profile?success=qbo-connected", request.url));
  } catch (error) {
    console.error("QBO OAuth error:", error);
    return NextResponse.redirect(
      new URL("/profile?error=Failed to connect QuickBooks", request.url)
    );
  }
}

