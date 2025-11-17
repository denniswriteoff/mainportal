import axios from "axios";
import { prisma } from "./db";

const QBO_BASE_URL = "https://quickbooks.api.intuit.com/v3/company";
const QBO_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

export async function getQboToken(userId: string) {
  const tokenRecord = await prisma.qboToken.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  if (!tokenRecord) {
    throw new Error("No QBO token found");
  }

  // Check if token needs refresh
  if (new Date() >= tokenRecord.accessTokenExpiresAt) {
    return await refreshQboToken(tokenRecord.id);
  }

  return tokenRecord;
}

export async function refreshQboToken(tokenId: string) {
  const tokenRecord = await prisma.qboToken.findUnique({
    where: { id: tokenId },
  });

  if (!tokenRecord) {
    throw new Error("Token not found");
  }

  const response = await axios.post(
    QBO_TOKEN_URL,
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: tokenRecord.refreshToken,
    }),
    {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${process.env.QBO_CLIENT_ID}:${process.env.QBO_CLIENT_SECRET}`
        ).toString("base64")}`,
      },
    }
  );

  const { access_token, refresh_token, expires_in, x_refresh_token_expires_in } =
    response.data;

  const updatedToken = await prisma.qboToken.update({
    where: { id: tokenId },
    data: {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresIn: expires_in,
      refreshTokenExpiresIn: x_refresh_token_expires_in,
      accessTokenExpiresAt: new Date(Date.now() + expires_in * 1000),
      refreshTokenExpiresAt: x_refresh_token_expires_in
        ? new Date(Date.now() + x_refresh_token_expires_in * 1000)
        : null,
    },
  });

  return updatedToken;
}

export async function fetchQboData(userId: string, endpoint: string) {
  const token = await getQboToken(userId);

  const response = await axios.get(
    `${QBO_BASE_URL}/${token.realmId}/${endpoint}`,
    {
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        Accept: "application/json",
      },
    }
  );

  return response.data;
}

