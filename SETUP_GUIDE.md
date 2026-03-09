# عين النسر — Eagle Eye
# Phase 0 Setup Guide — دليل إعداد المرحلة صفر

---

## Prerequisites — المتطلبات الأساسية

Before starting, make sure you have these installed on your Mac:

```bash
# Check Node.js (need v18+)
node --version

# Check npm
npm --version

# Check git
git --version
```

If you don't have Node.js, install it:
```bash
# Using Homebrew
brew install node
```

---

## STEP 1: Create the GitHub Repository

```bash
# 1. Go to github.com and create a NEW repository named "eagle-eye"
#    - Private repository
#    - Do NOT initialize with README (we'll push our code)

# 2. Open Terminal on your Mac and navigate to where you want the project
cd ~/Projects  # or wherever you keep your code

# 3. Create the project folder
mkdir eagle-eye
cd eagle-eye

# 4. Initialize git
git init
git branch -M main
```

---

## STEP 2: Copy Project Files

Download the `eagle-eye` folder from this conversation (all the files I delivered).
Copy ALL contents into your `~/Projects/eagle-eye/` folder.

After copying, your folder structure should look like this:

```
eagle-eye/
├── .env.local              ← Has your Supabase keys (DO NOT commit)
├── .env.example
├── .gitignore
├── ROADMAP.md
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── public/
│   └── logo.svg
├── supabase/
│   ├── migrations/
│   │   ├── 001_core_schema.sql
│   │   ├── 002_request_system.sql
│   │   └── 003_gr_module.sql
│   └── seed/
│       └── 002_request_configs.sql
└── src/
    ├── middleware.ts
    ├── app/
    │   ├── layout.tsx
    │   ├── globals.css
    │   ├── page.tsx
    │   ├── login/
    │   │   └── page.tsx
    │   ├── api/
    │   │   └── auth/
    │   │       └── login/
    │   │           └── route.ts
    │   └── dashboard/
    │       ├── layout.tsx
    │       └── page.tsx
    ├── components/
    │   └── layout/
    │       ├── Sidebar.tsx
    │       └── TopBar.tsx
    └── lib/
        ├── supabase/
        │   ├── server.ts
        │   ├── client.ts
        │   └── session.ts
        └── utils/
            └── index.ts
```

Verify your `.env.local` exists and has the correct values:
```bash
cat .env.local
```

You should see:
```
NEXT_PUBLIC_SUPABASE_URL=https://jwhscbyyvzmyjunmmxnr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
NEXT_PUBLIC_APP_NAME=Eagle Eye
NEXT_PUBLIC_APP_NAME_AR=عين النسر
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## STEP 3: Install Dependencies

```bash
# Make sure you're in the eagle-eye directory
cd ~/Projects/eagle-eye

# Install all packages
npm install

# This will take 1-2 minutes. You should see no errors.
# If you see peer dependency warnings, that's fine — ignore them.
```

---

## STEP 4: Nuke the Old Supabase Schema

Your Supabase project already has tables from the previous build. We need to drop everything and start fresh.

### Option A: Via Supabase Dashboard (Recommended)

1. Go to **https://supabase.com/dashboard**
2. Select your project: **jwhscbyyvzmyjunmmxnr**
3. Go to **SQL Editor** (left sidebar)
4. Run this SQL to drop everything:

```sql
-- ============================================================
-- NUKE EVERYTHING — Drop all existing tables and types
-- Run this FIRST before the new migrations
-- ============================================================

-- Drop all tables (cascade will handle foreign keys)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all tables in public schema
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
    
    -- Drop all custom types
    FOR r IN (SELECT typname FROM pg_type t 
              JOIN pg_namespace n ON t.typnamespace = n.oid 
              WHERE n.nspname = 'public' AND t.typtype = 'e') LOOP
        EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
    END LOOP;
    
    -- Drop all sequences
    FOR r IN (SELECT sequencename FROM pg_sequences WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP SEQUENCE IF EXISTS public.' || quote_ident(r.sequencename) || ' CASCADE';
    END LOOP;
    
    -- Drop all functions
    FOR r IN (SELECT proname, oidvectortypes(proargtypes) as args 
              FROM pg_proc p
              JOIN pg_namespace n ON p.pronamespace = n.oid 
              WHERE n.nspname = 'public') LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS public.' || quote_ident(r.proname) || '(' || r.args || ') CASCADE';
    END LOOP;
END $$;
```

5. Click **Run** (or Cmd+Enter)
6. You should see "Success. No rows returned." — that means it worked.

### Option B: Full Project Reset (Alternative)

If you want a completely clean slate including auth users:
1. Go to Supabase Dashboard → **Settings** → **General**
2. Scroll to **Danger Zone**
3. Click **Pause Project**, then **Restore Project**

(This takes a few minutes but gives you a perfectly clean state)

---

## STEP 5: Run the New Migrations

Still in the **Supabase SQL Editor**, run these three migrations IN ORDER. Each one must succeed before running the next.

### Migration 1: Core Schema

1. Open the file `supabase/migrations/001_core_schema.sql`
2. Copy the ENTIRE contents
3. Paste into Supabase SQL Editor
4. Click **Run**
5. Expected: "Success. No rows returned."

### Migration 2: Request System

1. Open `supabase/migrations/002_request_system.sql`
2. Copy entire contents → Paste → **Run**
3. Expected: "Success. No rows returned."

### Migration 3: Government Relations Module

1. Open `supabase/migrations/003_gr_module.sql`
2. Copy entire contents → Paste → **Run**
3. Expected: "Success. No rows returned."

### Seed: Request Type Configs

1. Open `supabase/seed/002_request_configs.sql`
2. Copy entire contents → Paste → **Run**
3. Expected: "Success. No rows returned."

### Verify Everything Was Created

Run this in SQL Editor to check:

```sql
-- Count all tables
SELECT count(*) as total_tables 
FROM pg_tables 
WHERE schemaname = 'public';
-- Expected: ~34 tables

-- List all tables
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Verify request type configs were seeded
SELECT request_type, name_en FROM request_type_configs ORDER BY request_type;
-- Expected: 10 rows
```

---

## STEP 6: Create a Test User

You need at least one user in Supabase Auth + a matching employee record to log in.

### 6a. Create Auth User

1. Go to Supabase Dashboard → **Authentication** → **Users**
2. Click **Add User** → **Create New User**
3. Fill in:
   - Email: `nawwaf@mansourholding.com` (or any email you want)
   - Password: `EagleEye2026!` (or your preferred password)
   - Check **Auto Confirm User**
4. Click **Create User**
5. **IMPORTANT**: Copy the user's **UUID** from the table (it looks like `a1b2c3d4-e5f6-...`)

### 6b. Create Matching Employee + Company Records

Run this in SQL Editor (replace the UUID with the one you copied):

```sql
-- Insert Mansour Holding (parent company)
INSERT INTO companies (id, code, name_ar, name_en, is_holding, is_active)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'MH',
  'منصور القابضة',
  'Mansour Holding',
  true,
  true
);

-- Insert a sector
INSERT INTO sectors (id, code, name_ar, name_en, company_id)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'S',
  'قطاع الخدمات المساندة',
  'Support Services Sector',
  'a0000000-0000-0000-0000-000000000001'
);

-- Insert a department
INSERT INTO departments (id, code, name_ar, name_en, company_id, sector_id)
VALUES (
  'c0000000-0000-0000-0000-000000000001',
  'IT10',
  'تقنية المعلومات',
  'Information Technology',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001'
);

-- Insert the test employee
-- ⚠️ REPLACE 'YOUR-AUTH-USER-UUID-HERE' with the UUID you copied in step 6a
INSERT INTO employees (
  id, employee_code, auth_user_id,
  full_name_en, first_name_en, family_name_en,
  full_name_ar, first_name_ar, family_name_ar,
  company_id, department_id, email,
  employment_type, is_active
)
VALUES (
  'd0000000-0000-0000-0000-000000000001',
  '1577',
  'YOUR-AUTH-USER-UUID-HERE',   -- ← REPLACE THIS
  'Nawwaf Albahar',
  'Nawwaf',
  'Albahar',
  'نواف الباهر',
  'نواف',
  'الباهر',
  'a0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001',
  'nawwaf@mansourholding.com',
  'full_time',
  true
);

-- Give the user super_admin + ceo roles
INSERT INTO user_roles (employee_id, role, company_id, is_active)
VALUES 
  ('d0000000-0000-0000-0000-000000000001', 'super_admin', 'a0000000-0000-0000-0000-000000000001', true),
  ('d0000000-0000-0000-0000-000000000001', 'ceo', 'a0000000-0000-0000-0000-000000000001', true);
```

---

## STEP 7: Run the App Locally

```bash
# Back in your terminal, in the eagle-eye directory
cd ~/Projects/eagle-eye

# Start the development server
npm run dev
```

You should see:
```
  ▲ Next.js 15.2.4
  - Local:   http://localhost:3000
  - Ready in 2.3s
```

### Test it:

1. Open **http://localhost:3000** in your browser
2. You'll be redirected to the login page
3. Enter:
   - Email: `nawwaf@mansourholding.com`
   - Password: `EagleEye2026!`
4. Click **تسجيل الدخول**
5. You should land on the dashboard

---

## STEP 8: Push to GitHub

```bash
# Add all files
git add .

# Make the first commit
git commit -m "Phase 0: Eagle Eye foundation — schema, auth, UI"

# Connect to your GitHub repo (replace with your actual repo URL)
git remote add origin https://github.com/YOUR-USERNAME/eagle-eye.git

# Push
git push -u origin main
```

---

## STEP 9: Deploy to Vercel

1. Go to **https://vercel.com/new**
2. Click **Import Git Repository**
3. Select your `eagle-eye` repo
4. Vercel will auto-detect Next.js
5. **IMPORTANT** — Add Environment Variables before deploying:
   - Click **Environment Variables**
   - Add these three:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://jwhscbyyvzmyjunmmxnr.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(copy from .env.local)* |
| `SUPABASE_SERVICE_ROLE_KEY` | *(copy from .env.local)* |

6. Click **Deploy**
7. Wait 1-2 minutes for the build to complete
8. Vercel will give you a URL like `eagle-eye-xxx.vercel.app`

### Update Supabase Allowed URLs

1. Go to Supabase Dashboard → **Authentication** → **URL Configuration**
2. Add your Vercel URL to **Redirect URLs**:
   - `https://your-project.vercel.app/**`
3. Also add localhost for development:
   - `http://localhost:3000/**`

---

## STEP 10: Verify Everything Works

### Local Checklist:
- [ ] `npm run dev` starts without errors
- [ ] Login page loads at `localhost:3000`
- [ ] Language toggle (AR ↔ EN) works
- [ ] Login succeeds with test credentials
- [ ] Dashboard loads with sidebar navigation
- [ ] Sidebar shows all sections (Main, Gov Relations, Admin, Account)
- [ ] Logo displays correctly in sidebar

### Supabase Checklist:
- [ ] All 3 migrations ran successfully
- [ ] ~34 tables exist in the public schema
- [ ] Request type configs seeded (10 rows)
- [ ] Auth user exists
- [ ] Employee record linked to auth user
- [ ] User roles assigned

### Vercel Checklist:
- [ ] Build succeeds
- [ ] Production URL loads the login page
- [ ] Login works on production

---

## Troubleshooting

### "Invalid credentials" on login
- Check that the auth user email matches the employee email
- Check that `auth_user_id` in the employees table matches the UUID from Supabase Auth
- Go to Supabase → Authentication → Users and verify the user is confirmed

### "relation does not exist" error
- Migrations weren't run in order. Re-run the NUKE script (Step 4), then run migrations 1, 2, 3 in sequence.

### Blank dashboard after login
- The employee record might not be linked. Run this in SQL Editor:
```sql
SELECT e.id, e.full_name_en, e.auth_user_id, au.email
FROM employees e
LEFT JOIN auth.users au ON e.auth_user_id = au.id
WHERE e.employee_code = '1577';
```
- If `auth_user_id` is NULL, update it with the correct UUID.

### Sidebar not showing GR or Admin sections
- These sections are role-gated. Make sure your user has `super_admin` role:
```sql
SELECT * FROM user_roles 
WHERE employee_id = 'd0000000-0000-0000-0000-000000000001';
```

### Build fails on Vercel
- Make sure all 3 environment variables are set in Vercel
- Check that `SUPABASE_SERVICE_ROLE_KEY` (without NEXT_PUBLIC_ prefix) is added

---

## What's Next — Phase 1

Once Phase 0 is verified, we'll build Phase 1 (Core Workflow MVP):

1. **Master data import** — Script to import all 107 employees from your Excel
2. **Request creation** — Dynamic forms for all 10 request types
3. **Approval engine** — Auto-routing based on request type and rules
4. **Notifications** — In-app + email alerts
5. **SLA tracking** — Auto-set on submission, breach detection

Tell me when Phase 0 is running and we'll start Phase 1!

---

*Eagle Eye عين النسر — Mansour Holding — Setup Guide v1.0*
