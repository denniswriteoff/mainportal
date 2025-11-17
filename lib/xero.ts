import axios from "axios";
import { prisma } from "./db";

const XERO_API_URL = "https://api.xero.com/api.xro/2.0";
const XERO_TOKEN_URL = "https://identity.xero.com/connect/token";

export async function getXeroToken(userId: string) {
  const tokenRecord = await prisma.xeroToken.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  if (!tokenRecord) {
    throw new Error("No Xero token found");
  }

  // Check if token needs refresh
  if (new Date() >= tokenRecord.accessTokenExpiresAt) {
    return await refreshXeroToken(tokenRecord.id);
  }

  return tokenRecord;
}

export async function refreshXeroToken(tokenId: string) {
  const tokenRecord = await prisma.xeroToken.findUnique({
    where: { id: tokenId },
  });

  if (!tokenRecord) {
    throw new Error("Token not found");
  }

  const response = await axios.post(
    XERO_TOKEN_URL,
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: tokenRecord.refreshToken,
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

  const { access_token, refresh_token, expires_in } = response.data;

  const updatedToken = await prisma.xeroToken.update({
    where: { id: tokenId },
    data: {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresIn: expires_in,
      accessTokenExpiresAt: new Date(Date.now() + expires_in * 1000),
    },
  });

  return updatedToken;
}

export async function fetchXeroData(userId: string, endpoint: string) {
  const token = await getXeroToken(userId);

  const response = await axios.get(`${XERO_API_URL}/${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
      "xero-tenant-id": token.tenantId,
      Accept: "application/json",
    },
  });

  return response.data;
}

