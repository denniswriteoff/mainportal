# Writeoff Main Portal

Unified entry point for all Writeoff accounting applications.

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your credentials

# Initialize database
npx prisma generate
npx prisma db push
npm run db:seed

# Run development server
npm run dev
```

Visit `http://localhost:3010`

## Default Login

- **Email**: admin@example.com
- **Password**: admin123

See [SETUP.md](./SETUP.md) for detailed documentation.

## Features

- ✅ Single Sign-On (SSO)
- ✅ Unified user management
- ✅ QBO & Xero token management
- ✅ Modern dashboard with financial metrics
- ✅ Sidebar navigation to all apps
- ✅ User profile management

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript** - Type safety
- **NextUI v2** - Modern React UI library
- **Prisma + PostgreSQL** - Database ORM
- **NextAuth.js** - Authentication
- **Tailwind CSS** - Utility-first CSS
- **Recharts** - Data visualization
- **Framer Motion** - Animations

## Design

The application features a **minimalistic and modular design** using NextUI components with a soft beige (#E8E7BB) theme that provides a warm, professional aesthetic. See [DESIGN.md](./DESIGN.md) for detailed design system documentation.