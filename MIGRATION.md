# Database Migration Guide

This guide helps you migrate data from existing QBO and Xero databases to the unified main portal database.

## Overview

The main portal consolidates two separate databases:
- QBO applications database
- Xero applications database

Into one unified database with:
- Combined User table
- Both QboToken and XeroToken tables
- Centralized authentication

## Pre-Migration Checklist

- [ ] Backup all existing databases
- [ ] Set up new main portal database
- [ ] Test migration scripts on development environment first
- [ ] Notify users of downtime (if applicable)

## Migration Steps

### 1. Export Existing Data

#### From QBO Database

```sql
-- Export users
COPY (
  SELECT id, name, email, "emailVerified", image, "passwordHash", 
         "isAdmin", "canModifySystemPrompt", "canCreateUsers", 
         "createdAt", "updatedAt"
  FROM "User"
) TO '/tmp/qbo_users.csv' WITH CSV HEADER;

-- Export QBO tokens
COPY (
  SELECT id, "userId", "realmId", token_type, access_token, 
         refresh_token, expires_in, x_refresh_token_expires_in, 
         id_token, access_token_expires_at, refresh_token_expires_at, 
         "createdAt", "updatedAt"
  FROM "QboToken"
) TO '/tmp/qbo_tokens.csv' WITH CSV HEADER;
```

#### From Xero Database

```sql
-- Export users
COPY (
  SELECT id, name, email, "emailVerified", image, "passwordHash", 
         "isAdmin", "createdAt", "updatedAt"
  FROM "User"
) TO '/tmp/xero_users.csv' WITH CSV HEADER;

-- Export Xero tokens
COPY (
  SELECT id, "userId", "tenantId", access_token, refresh_token, 
         id_token, expires_in, token_type, scope, 
         access_token_expires_at, refresh_token_expires_at, 
         created_at, updated_at
  FROM xero_tokens
) TO '/tmp/xero_tokens.csv' WITH CSV HEADER;
```

### 2. Merge User Data

Create a script to merge users from both databases:

```typescript
// scripts/merge-users.ts
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as csv from 'csv-parser';

const prisma = new PrismaClient();

async function mergeUsers() {
  const qboUsers = await readCSV('/tmp/qbo_users.csv');
  const xeroUsers = await readCSV('/tmp/xero_users.csv');
  
  // Merge users by email
  const userMap = new Map();
  
  for (const user of qboUsers) {
    userMap.set(user.email, {
      ...user,
      accountingService: 'QBO',
      source: 'qbo'
    });
  }
  
  for (const user of xeroUsers) {
    if (userMap.has(user.email)) {
      // User exists in both - handle conflict
      console.warn(\`User \${user.email} exists in both databases\`);
      // Keep QBO user, but note the conflict
    } else {
      userMap.set(user.email, {
        ...user,
        accountingService: 'XERO',
        source: 'xero'
      });
    }
  }
  
  // Insert merged users
  for (const [email, user] of userMap) {
    await prisma.user.create({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified ? new Date(user.emailVerified) : null,
        image: user.image,
        passwordHash: user.passwordHash,
        isAdmin: user.isAdmin,
        canModifySystemPrompt: user.canModifySystemPrompt || false,
        canCreateUsers: user.canCreateUsers || false,
        accountingService: user.accountingService,
        createdAt: new Date(user.createdAt),
        updatedAt: new Date(user.updatedAt),
      },
    });
    console.log(\`Migrated user: \${email}\`);
  }
}

// Run migration
mergeUsers()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

### 3. Import Token Data

After users are migrated, import the token data:

```sql
-- Import QBO tokens (adjust user IDs if needed)
COPY qbo_tokens(
  id, "userId", "realmId", token_type, access_token, 
  refresh_token, expires_in, x_refresh_token_expires_in, 
  id_token, access_token_expires_at, refresh_token_expires_at, 
  "createdAt", "updatedAt"
)
FROM '/tmp/qbo_tokens.csv' WITH CSV HEADER;

-- Import Xero tokens (adjust user IDs if needed)
COPY xero_tokens(
  id, "userId", "tenantId", access_token, refresh_token, 
  id_token, expires_in, token_type, scope, 
  access_token_expires_at, refresh_token_expires_at, 
  created_at, updated_at
)
FROM '/tmp/xero_tokens.csv' WITH CSV HEADER;
```

### 4. Handle User ID Conflicts

If user IDs conflict between databases:

```sql
-- Generate new UUIDs and update references
-- This is a complex operation - test thoroughly!

-- Create a mapping table
CREATE TEMP TABLE user_id_mapping (
  old_id VARCHAR,
  new_id VARCHAR,
  source VARCHAR
);

-- Update foreign key references
-- QBO tokens
UPDATE qbo_tokens qt
SET "userId" = m.new_id
FROM user_id_mapping m
WHERE qt."userId" = m.old_id AND m.source = 'qbo';

-- Xero tokens
UPDATE xero_tokens xt
SET "userId" = m.new_id
FROM user_id_mapping m
WHERE xt."userId" = m.old_id AND m.source = 'xero';
```

### 5. Verify Migration

Run verification queries:

```sql
-- Check user count
SELECT COUNT(*) as total_users, 
       COUNT(CASE WHEN "accountingService" = 'QBO' THEN 1 END) as qbo_users,
       COUNT(CASE WHEN "accountingService" = 'XERO' THEN 1 END) as xero_users
FROM "User";

-- Check token counts
SELECT 
  (SELECT COUNT(*) FROM qbo_tokens) as qbo_tokens,
  (SELECT COUNT(*) FROM xero_tokens) as xero_tokens;

-- Check for orphaned tokens
SELECT COUNT(*) FROM qbo_tokens qt
LEFT JOIN "User" u ON qt."userId" = u.id
WHERE u.id IS NULL;

SELECT COUNT(*) FROM xero_tokens xt
LEFT JOIN "User" u ON xt."userId" = u.id
WHERE u.id IS NULL;
```

## Post-Migration

1. **Test Authentication**: Ensure users can login
2. **Test OAuth**: Verify QBO and Xero connections work
3. **Update Other Applications**: Point them to the new database
4. **Monitor**: Watch for errors in the first 24-48 hours
5. **Cleanup**: After successful migration, archive old databases

## Rollback Plan

If migration fails:

1. Keep old databases untouched during migration
2. Have database backups ready
3. Test rollback procedure beforehand
4. Document the rollback steps

```bash
# Rollback steps
1. Stop main portal application
2. Restore old database configurations
3. Restart old applications
4. Investigate migration issues
```

## Handling Duplicate Users

If a user exists in both databases with the same email:

**Option 1**: Merge accounts (recommended)
- Keep one user record
- Merge token data if user had both QBO and Xero
- Note: Current design restricts to one service per user

**Option 2**: Create separate accounts
- Append suffix to email (e.g., user+xero@example.com)
- User will need to choose which account to use

**Option 3**: Manual resolution
- Contact users to choose preferred service
- Migrate only the preferred service data

## Support

For migration assistance:
1. Test migration on development database first
2. Document any issues encountered
3. Keep detailed logs of all migration operations
4. Have a database administrator available during migration

## Timeline Recommendation

- **Day 1**: Export data, verify exports
- **Day 2**: Set up new database, run migration scripts
- **Day 3**: Verify data, test authentication
- **Day 4**: Update application configurations
- **Day 5**: Go live, monitor closely

