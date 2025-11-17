# Project Summary: Writeoff Main Portal

## Overview

The Writeoff Main Portal is a unified entry point for all Writeoff accounting applications, providing Single Sign-On (SSO), centralized user management, and OAuth token management for both QuickBooks Online and Xero integrations.

## Architecture

```
┌─────────────────────────────────────────┐
│          Main Portal (Port 3010)         │
│  ┌─────────────────────────────────┐    │
│  │   Single Sign-On (NextAuth)     │    │
│  │   - User Authentication          │    │
│  │   - Session Management           │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │   Token Management               │    │
│  │   - QBO OAuth Tokens             │    │
│  │   - Xero OAuth Tokens            │    │
│  │   - Auto Token Refresh           │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │   Unified Database (PostgreSQL)  │    │
│  │   - Users                        │    │
│  │   - QBO Tokens                   │    │
│  │   - Xero Tokens                  │    │
│  │   - Sessions                     │    │
│  └─────────────────────────────────┘    │
└───────────────┬─────────────────────────┘
                │
    ┌───────────┴───────────┐
    │                       │
    ▼                       ▼
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│   QBO   │  │  Xero   │  │   QBO   │  │  Xero   │
│ Chatbot │  │ Chatbot │  │Dashboard│  │Dashboard│
│ (3000)  │  │ (3001)  │  │ (3002)  │  │ (3003)  │
└─────────┘  └─────────┘  └─────────┘  └─────────┘
```

## Key Features

### 1. Single Sign-On (SSO)
- Centralized authentication using NextAuth.js
- Credential-based login with bcrypt password hashing
- Session management with JWT tokens
- Automatic session refresh

### 2. Unified User Management
- Single user table across all applications
- User roles: Admin and regular users
- Profile management (name, email, password)
- Service restriction: Users can connect either QBO or Xero (not both)

### 3. Token Management
- Centralized OAuth flow for QBO and Xero
- Automatic token refresh before expiration
- Secure token storage in database
- Token validation and error handling

### 4. Modern Dashboard
- Minimalistic NextUI design
- Real-time financial metrics
- Interactive charts (Recharts)
- Responsive layout (mobile, tablet, desktop)

### 5. Sidebar Navigation
- Quick access to connected services
- Dynamic links based on user's service (QBO or Xero)
- Profile management access
- Clean, icon-based navigation

## Database Schema

### User
```prisma
model User {
  id                    String    @id @default(cuid())
  name                  String?
  email                 String    @unique
  passwordHash          String
  isAdmin               Boolean   @default(false)
  accountingService     String?   // 'QBO' or 'XERO'
  qboTokens             QboToken[]
  xeroTokens            XeroToken[]
  // ... other fields
}
```

### QboToken
```prisma
model QboToken {
  id                    String    @id @default(cuid())
  userId                String
  realmId               String
  accessToken           String
  refreshToken          String
  accessTokenExpiresAt  DateTime
  // ... other fields
}
```

### XeroToken
```prisma
model XeroToken {
  id                    String    @id @default(cuid())
  userId                String
  tenantId              String
  accessToken           String
  refreshToken          String
  accessTokenExpiresAt  DateTime
  // ... other fields
}
```

## API Routes

### Authentication
- `POST /api/auth/signin` - User login
- `GET /api/auth/signout` - User logout
- `GET /api/auth/session` - Get current session

### OAuth Integration
- `GET /api/qbo/connect` - Initiate QBO OAuth
- `GET /api/qbo/callback` - QBO OAuth callback
- `GET /api/xero/connect` - Initiate Xero OAuth
- `GET /api/xero/callback` - Xero OAuth callback

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard metrics

### Profile
- `POST /api/profile/update` - Update user profile
- `POST /api/profile/change-password` - Change password
- `POST /api/profile/disconnect-service` - Disconnect service

## Technology Stack

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **NextUI v2**: Modern React UI library
- **Tailwind CSS**: Utility-first CSS
- **Recharts**: Charts and data visualization
- **Framer Motion**: Smooth animations

### Backend
- **Next.js API Routes**: Serverless API endpoints
- **NextAuth.js**: Authentication solution
- **Prisma**: Type-safe database ORM
- **PostgreSQL**: Relational database

### DevOps
- **Docker**: Containerization
- **Docker Compose**: Multi-container setup
- **Prisma Migrations**: Database versioning

## Design System

### Visual Design
- **Minimalistic**: Clean, uncluttered interfaces
- **Modular**: Reusable NextUI components
- **Soft Beige Theme**: Primary color #E8E7BB (warm, professional aesthetic)
- **Typography**: Inter font family
- **Spacing**: 4px base unit (Tailwind scale)

### Components
- Cards with subtle shadows
- Gradient buttons
- Bordered inputs
- Chip badges for status
- Avatar components
- Responsive charts

See [DESIGN.md](./DESIGN.md) for complete design documentation.

## Security Features

### Authentication
- Bcrypt password hashing (12 rounds)
- JWT session tokens
- Secure cookie storage
- CSRF protection

### OAuth
- State parameter validation
- Secure token storage
- HTTPS redirect URIs (production)
- Token encryption in database

### API Security
- Session validation on all protected routes
- Rate limiting ready (configurable)
- Input validation with Zod
- SQL injection prevention (Prisma)

## Deployment

### Development
```bash
npm install
cp .env.example .env
# Edit .env with your credentials
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

### Production
```bash
# Using Docker
docker-compose up -d

# Or manual deployment
npm install
npx prisma migrate deploy
npm run build
npm start
```

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection
- `NEXTAUTH_URL` - Application URL
- `NEXTAUTH_SECRET` - JWT secret
- `QBO_CLIENT_ID/SECRET` - QuickBooks credentials
- `XERO_CLIENT_ID/SECRET` - Xero credentials

## Integration with Other Apps

### Shared Database Approach (Recommended)
All applications use the same PostgreSQL database:
1. Share `DATABASE_URL` across all apps
2. Use same Prisma schema
3. Sessions automatically shared
4. Tokens accessible to all apps

### API Gateway Approach
Main portal provides token API:
1. Other apps fetch tokens via API
2. Separate databases possible
3. More isolated architecture
4. Requires API authentication

See [INTEGRATION.md](./INTEGRATION.md) for detailed integration guide.

## Migration from Existing Databases

The project includes a migration guide to consolidate data from separate QBO and Xero databases into the unified main portal database.

See [MIGRATION.md](./MIGRATION.md) for step-by-step migration instructions.

## File Structure

```
main_portal/
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # NextAuth endpoints
│   │   ├── qbo/          # QBO OAuth
│   │   ├── xero/         # Xero OAuth
│   │   ├── dashboard/    # Dashboard data
│   │   └── profile/      # User profile
│   ├── components/       # React components
│   │   ├── Sidebar.tsx
│   │   ├── DashboardContent.tsx
│   │   ├── FinancialCard.tsx
│   │   ├── EngagementChart.tsx
│   │   ├── PaymentHistory.tsx
│   │   └── ProfileContent.tsx
│   ├── login/           # Login page
│   ├── profile/         # Profile page
│   ├── layout.tsx       # Root layout
│   ├── page.tsx         # Dashboard page
│   └── globals.css      # Global styles
├── lib/
│   ├── auth.ts          # NextAuth config
│   ├── db.ts            # Prisma client
│   ├── qbo.ts           # QBO API helpers
│   └── xero.ts          # Xero API helpers
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── seed.ts          # Seed data
├── types/               # TypeScript types
├── public/              # Static assets
└── docs/
    ├── README.md
    ├── SETUP.md
    ├── DESIGN.md
    ├── MIGRATION.md
    └── INTEGRATION.md
```

## Default Users (After Seeding)

**Admin User:**
- Email: admin@example.com
- Password: admin123
- Permissions: Full access, can create users

**Test User:**
- Email: user@example.com  
- Password: user123
- Permissions: Regular user access

⚠️ **Change these credentials in production!**

## Next Steps

1. **Setup**: Follow [SETUP.md](./SETUP.md)
2. **Configure OAuth**: Set up QBO and Xero developer apps
3. **Integrate Apps**: Connect existing applications (see [INTEGRATION.md](./INTEGRATION.md))
4. **Migrate Data**: Transfer existing data (see [MIGRATION.md](./MIGRATION.md))
5. **Customize**: Adjust branding, colors, and features
6. **Deploy**: Deploy to production environment

## Support & Documentation

- **Setup Guide**: [SETUP.md](./SETUP.md)
- **Design System**: [DESIGN.md](./DESIGN.md)
- **Integration Guide**: [INTEGRATION.md](./INTEGRATION.md)
- **Migration Guide**: [MIGRATION.md](./MIGRATION.md)

## License

Proprietary - All rights reserved

## Version

1.0.0 - Initial Release

