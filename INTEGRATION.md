# Integration Guide

This guide explains how to integrate the existing applications (QBO Chatbot, Xero Chatbot, QBO Dashboard, Xero Dashboard) with the main portal's Single Sign-On (SSO).

## Architecture Overview

```
┌─────────────────┐
│   Main Portal   │ ← Single source of truth for authentication
│   (Port 3010)   │ ← Manages all OAuth tokens (QBO & Xero)
└────────┬────────┘
         │
    ┌────┴─────────────────────────────┐
    │                                   │
    ▼                                   ▼
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│   QBO   │  │  Xero   │  │   QBO   │  │  Xero   │
│ Chatbot │  │ Chatbot │  │Dashboard│  │Dashboard│
│ (3000)  │  │ (3001)  │  │ (3002)  │  │ (3003)  │
└─────────┘  └─────────┘  └─────────┘  └─────────┘
```

## Integration Methods

### Option 1: Shared Database (Recommended)

All applications use the same PostgreSQL database.

**Advantages**:
- Simplest implementation
- Real-time data sync
- No additional API calls needed

**Implementation**:

1. **Update all applications to use the same DATABASE_URL**:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/main_portal"
```

2. **Update Prisma schemas** in each application to match the main portal schema

3. **Use NextAuth with database sessions** in each app:
```typescript
// lib/auth.ts in each application
import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./db";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "database", // Use database sessions
  },
  // ... rest of config
};
```

### Option 2: JWT Token Validation

Applications validate JWT tokens issued by the main portal.

**Advantages**:
- Separate databases possible
- More isolated applications
- Scalable architecture

**Implementation**:

1. **Main Portal** issues JWT tokens with user info:
```typescript
// lib/auth.ts in main portal
callbacks: {
  async jwt({ token, user }) {
    if (user) {
      token.id = user.id;
      token.accountingService = user.accountingService;
    }
    return token;
  },
  async session({ session, token }) {
    session.user.id = token.id;
    session.user.accountingService = token.accountingService;
    return session;
  },
}
```

2. **Other applications** validate the JWT:
```typescript
// middleware.ts in other applications
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET 
  });
  
  if (!token) {
    return NextResponse.redirect(
      new URL('http://localhost:3010/login', request.url)
    );
  }
  
  return NextResponse.next();
}
```

### Option 3: API Gateway Pattern

Use the main portal as an API gateway for token management.

**Implementation**:

1. **Create token API** in main portal:
```typescript
// app/api/tokens/[service]/route.ts
export async function GET(
  request: Request,
  { params }: { params: { service: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  if (params.service === 'qbo') {
    const token = await getQboToken(session.user.id);
    return NextResponse.json({ token: token.accessToken });
  } else if (params.service === 'xero') {
    const token = await getXeroToken(session.user.id);
    return NextResponse.json({ token: token.accessToken });
  }
  
  return NextResponse.json({ error: "Invalid service" }, { status: 400 });
}
```

2. **Other applications fetch tokens** from main portal:
```typescript
// lib/tokens.ts in other applications
export async function getServiceToken(service: 'qbo' | 'xero') {
  const response = await fetch(
    `http://localhost:3010/api/tokens/${service}`,
    {
      credentials: 'include',
      headers: {
        'Cookie': document.cookie, // Forward cookies
      },
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to get token');
  }
  
  const { token } = await response.json();
  return token;
}
```

## Recommended Setup

### For Development

1. **Use Shared Database** (Option 1)
2. **All apps run on localhost** with different ports
3. **Cookie-based sessions** for simplicity

### For Production

1. **Use JWT Token Validation** (Option 2)
2. **Deploy on same domain** (e.g., portal.example.com, qbo.example.com)
3. **Use shared session cookie domain**
4. **Implement proper CORS** if on different domains

## Step-by-Step Integration

### 1. Update Each Application's NextAuth Config

```typescript
// In QBO Chatbot, Xero Chatbot, etc.
import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./db";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "database",
  },
  pages: {
    signIn: "http://localhost:3010/login", // Redirect to main portal
  },
  callbacks: {
    async session({ session, user }) {
      // Add user details
      session.user.id = user.id;
      session.user.accountingService = user.accountingService;
      return session;
    },
  },
};
```

### 2. Update Middleware to Check Authentication

```typescript
// middleware.ts in each application
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function middleware(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.redirect(
      "http://localhost:3010/login?callbackUrl=" + 
      encodeURIComponent(request.url)
    );
  }
  
  // Check service restriction
  const requiredService = getRequiredService(request.pathname);
  if (requiredService && session.user.accountingService !== requiredService) {
    return NextResponse.redirect(
      "http://localhost:3010/?error=wrong-service"
    );
  }
  
  return NextResponse.next();
}

function getRequiredService(pathname: string): string | null {
  if (pathname.startsWith('/qbo')) return 'QBO';
  if (pathname.startsWith('/xero')) return 'XERO';
  return null;
}
```

### 3. Remove OAuth Flows from Other Applications

Since the main portal manages all tokens:

1. **Remove OAuth routes** from other applications
2. **Remove token management logic**
3. **Fetch tokens through main portal API** or shared database

### 4. Update Token Access

**Option A: Shared Database**
```typescript
// lib/qbo.ts in QBO applications
import { prisma } from "./db";

export async function getQboToken(userId: string) {
  return await prisma.qboToken.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}
```

**Option B: API Call**
```typescript
// lib/qbo.ts in QBO applications
export async function getQboToken() {
  const response = await fetch(
    "http://localhost:3010/api/tokens/qbo",
    { credentials: "include" }
  );
  return await response.json();
}
```

### 5. Update Navigation

Add logout links that redirect to main portal:

```typescript
// components/Header.tsx
<a href="http://localhost:3010/api/auth/signout">
  Logout
</a>
```

## Testing the Integration

1. **Start Main Portal**: `cd main_portal && npm run dev`
2. **Start Other Apps**: Each on their respective ports
3. **Test Flow**:
   - Login via main portal (localhost:3010)
   - Navigate to QBO Chatbot (localhost:3000)
   - Should be automatically authenticated
   - Navigate to profile (localhost:3010/profile)
   - Connect QBO or Xero
   - Test token access in respective applications

## Environment Variables

### Main Portal (.env)
```env
NEXTAUTH_URL=http://localhost:3010
NEXTAUTH_SECRET=shared-secret-key
DATABASE_URL=postgresql://...
```

### Other Applications (.env)
```env
NEXTAUTH_URL=http://localhost:3000  # Each app's URL
NEXTAUTH_SECRET=shared-secret-key    # MUST be the same
DATABASE_URL=postgresql://...         # Same database
```

## Production Considerations

1. **Use HTTPS** for all applications
2. **Set proper CORS headers**
3. **Use environment-specific URLs**
4. **Implement rate limiting on token APIs**
5. **Add monitoring and logging**
6. **Use secrets management** (not .env files)
7. **Implement token refresh cron jobs**

## Troubleshooting

### "Not authenticated" errors
- Check NEXTAUTH_SECRET is the same across apps
- Verify DATABASE_URL is correct
- Check cookie domain settings

### Token not found
- Ensure user has connected service in main portal
- Check token hasn't expired
- Verify userId is being passed correctly

### CORS errors
- Add proper CORS headers
- Use same domain or configure CORS properly
- Check cookie SameSite settings

## Security Best Practices

1. **Never expose tokens** in client-side code
2. **Use HTTPS** in production
3. **Implement CSRF protection**
4. **Validate all requests**
5. **Log authentication attempts**
6. **Implement rate limiting**
7. **Regular security audits**

## Support

For integration issues:
1. Check all applications are using the same NEXTAUTH_SECRET
2. Verify database connectivity
3. Review console logs for errors
4. Test authentication flow step by step

