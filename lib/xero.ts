import { XeroClient } from 'xero-node';
import { prisma } from '@/lib/db';

// Create Xero API client instance
export function createXeroClient(state?: string) {
  return new XeroClient({
    clientId: process.env.XERO_CLIENT_ID!,
    clientSecret: process.env.XERO_CLIENT_SECRET!,
    redirectUris: [process.env.XERO_REDIRECT_URI!],
    scopes: [
      'openid',
      'profile',
      'email',
      'accounting.transactions',
      'accounting.contacts',
      'accounting.settings',
      'offline_access',
      'accounting.reports.read',
      'payroll.settings',
      'payroll.employees',
      'payroll.timesheets'
    ],
    state: state
  });
}

export interface XeroTokenData {
  accessToken: string;
  refreshToken: string;
  idToken?: string;
  expiresIn: number;
  tokenType: string;
  scope?: string;
  tenantId: string;
}

export async function saveXeroTokens(userId: string, tokenData: XeroTokenData) {
  const expiresAt = new Date(Date.now() + tokenData.expiresIn * 1000);
  const refreshExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days

  return await prisma.xeroToken.upsert({
    where: {
      userId_tenantId: {
        userId,
        tenantId: tokenData.tenantId
      }
    },
    update: {
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
      idToken: tokenData.idToken,
      expiresIn: tokenData.expiresIn,
      tokenType: tokenData.tokenType,
      scope: tokenData.scope,
      accessTokenExpiresAt: expiresAt,
      refreshTokenExpiresAt: refreshExpiresAt,
      updatedAt: new Date()
    },
    create: {
      userId,
      tenantId: tokenData.tenantId,
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
      idToken: tokenData.idToken,
      expiresIn: tokenData.expiresIn,
      tokenType: tokenData.tokenType,
      scope: tokenData.scope,
      accessTokenExpiresAt: expiresAt,
      refreshTokenExpiresAt: refreshExpiresAt
    }
  });
}

export async function getXeroTokens(userId: string, tenantId?: string) {
  if (tenantId) {
    return await prisma.xeroToken.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId
        }
      }
    });
  }
  
  // Return all tokens for user if no specific tenant
  return await prisma.xeroToken.findMany({
    where: { userId }
  });
}

export async function refreshXeroToken(userId: string, tenantId: string) {
  const tokenRecord = await prisma.xeroToken.findUnique({
    where: {
      userId_tenantId: {
        userId,
        tenantId
      }
    }
  });

  if (!tokenRecord) {
    throw new Error('No Xero token found for user and tenant');
  }

  try {
    const xero = createXeroClient();
    await xero.initialize();
    
    // Set the refresh token for the API client
    xero.setTokenSet({
      access_token: tokenRecord.accessToken,
      refresh_token: tokenRecord.refreshToken,
      expires_in: tokenRecord.expiresIn,
      token_type: tokenRecord.tokenType,
      scope: tokenRecord.scope || undefined
    });

    const newTokenSet = await xero.refreshToken();
    
    if (newTokenSet.access_token && newTokenSet.refresh_token) {
      await saveXeroTokens(userId, {
        accessToken: newTokenSet.access_token,
        refreshToken: newTokenSet.refresh_token,
        idToken: newTokenSet.id_token,
        expiresIn: newTokenSet.expires_in || 1800,
        tokenType: newTokenSet.token_type || 'Bearer',
        scope: newTokenSet.scope,
        tenantId
      });

      return newTokenSet;
    }
  } catch (error) {
    console.error('Failed to refresh Xero token:', error);
    throw error;
  }
}

export async function revokeXeroToken(userId: string, tenantId: string) {
  const tokenRecord = await prisma.xeroToken.findUnique({
    where: {
      userId_tenantId: {
        userId,
        tenantId
      }
    }
  });

  if (!tokenRecord) {
    throw new Error('No Xero token found for user and tenant');
  }

  try {
    const xero = createXeroClient();
    await xero.initialize();
    
    // Set the token for revocation
    xero.setTokenSet({
      access_token: tokenRecord.accessToken,
      refresh_token: tokenRecord.refreshToken,
      expires_in: tokenRecord.expiresIn,
      token_type: tokenRecord.tokenType,
      scope: tokenRecord.scope || undefined
    });

    await xero.revokeToken();
    
    // Delete the token from database
    await prisma.xeroToken.delete({
      where: {
        userId_tenantId: {
          userId,
          tenantId
        }
      }
    });

    return true;
  } catch (error) {
    console.error('Failed to revoke Xero token:', error);
    throw error;
  }
}

export async function getXeroAuthUrl(state?: string): Promise<string> {
  const xero = createXeroClient(state);
  await xero.initialize();
  return await xero.buildConsentUrl();
}
