# Main Portal Setup Guide

This is the unified entry point for all Writeoff applications (QBO Chatbot, Xero Chatbot, QBO Dashboard, Xero Dashboard).

## Features

- **Single Sign-On (SSO)**: Centralized authentication for all applications
- **Unified User Management**: One profile for all services
- **Centralized Token Management**: Manages both QBO and Xero OAuth tokens
- **Modern Dashboard**: Minimalistic NextUI design with soft beige theme (#E8E7BB)
- **Service Restriction**: Users can connect either QBO or Xero (not both)
- **Responsive Design**: Works seamlessly on mobile, tablet, and desktop
- **Modular Components**: Built with NextUI for consistency and maintainability

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- QuickBooks Online Developer Account
- Xero Developer Account

## Installation

1. **Install dependencies**:
```bash
npm install
```

2. **Set up environment variables**:
```bash
cp .env.example .env
```

Edit `.env` and add your credentials:
- Database connection string
- NextAuth secret (generate with: `openssl rand -base64 32`)
- QBO OAuth credentials
- Xero OAuth credentials
- URLs for external applications

3. **Set up database**:
```bash
npx prisma generate
npx prisma db push
npx prisma db seed
```

4. **Run development server**:
```bash
npm run dev
```

The application will be available at `http://localhost:3010`

## Default Users

After seeding, you can login with:

**Admin User**:
- Email: `admin@example.com`
- Password: `admin123`

**Test User**:
- Email: `user@example.com`
- Password: `user123`

**⚠️ Change these passwords in production!**

## OAuth Setup

### QuickBooks Online

1. Go to [Intuit Developer Portal](https://developer.intuit.com/)
2. Create a new app
3. Add OAuth redirect URI: `http://localhost:3010/api/qbo/callback`
4. Copy Client ID and Client Secret to `.env`

### Xero

1. Go to [Xero Developer Portal](https://developer.xero.com/)
2. Create a new app
3. Add OAuth redirect URI: `http://localhost:3010/api/xero/callback`
4. Copy Client ID and Client Secret to `.env`

## Integrating with Other Applications

### External Application Configuration

To enable SSO from other applications, they need to redirect to the main portal for authentication. Update each application to:

1. Use the main portal's authentication endpoint
2. Share the same database (or sync user data)
3. Validate JWT tokens issued by the main portal

### Sidebar Links

The sidebar automatically shows links to connected services:
- QBO users see: QBO Chat and QBO Dashboard links
- Xero users see: Xero Chat and Xero Dashboard links

Configure the URLs in `.env`:
```
QBO_CHATBOT_URL=http://localhost:3000
XERO_CHATBOT_URL=http://localhost:3001
QBO_DASHBOARD_URL=http://localhost:3002
XERO_DASHBOARD_URL=http://localhost:3003
```

## Database Schema

The unified database includes:
- **User**: Single user table with `accountingService` field ('QBO' or 'XERO')
- **QboToken**: QuickBooks OAuth tokens
- **XeroToken**: Xero OAuth tokens
- **Session/Account**: NextAuth session management

## Production Deployment

1. Set up PostgreSQL database
2. Set all environment variables in your hosting platform
3. Run migrations: `npx prisma migrate deploy`
4. Update OAuth redirect URIs to production URLs
5. Set `NEXTAUTH_URL` to your production domain

## Port Configuration

The main portal runs on port 3010 by default. You can change this in `package.json`:
```json
"dev": "next dev -p 3010"
```

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check DATABASE_URL format in `.env`
- Ensure database exists

### OAuth Not Working
- Verify redirect URIs match exactly
- Check client ID and secret are correct
- Ensure service (QBO/Xero) credentials are valid

### Session Issues
- Verify NEXTAUTH_SECRET is set
- Check NEXTAUTH_URL matches your domain
- Clear browser cookies and try again

## Support

For issues or questions, contact your system administrator.

