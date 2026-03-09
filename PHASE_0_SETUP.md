# Eagle Eye — Phase 0 Setup
# Copy-paste every block in order. Don't skip steps.
# Your files are at: /Users/macintosh/Desktop/Eagle Eye (Ultimate Edition)

────────────────────────────────────────────────────
  STEP 1 — VERIFY YOUR MAC IS READY
────────────────────────────────────────────────────

Open Terminal and paste this entire block:

```
echo "=== Checking prerequisites ==="
echo -n "Node.js: " && node --version 2>/dev/null || echo "❌ NOT INSTALLED — run: brew install node"
echo -n "npm:     " && npm --version 2>/dev/null || echo "❌ NOT INSTALLED"
echo -n "git:     " && git --version 2>/dev/null || echo "❌ NOT INSTALLED — run: brew install git"
echo ""
echo "=== Checking your project files ==="
BASE="/Users/macintosh/Desktop/Eagle Eye (Ultimate Edition)/eagle-eye"
for f in "package.json" ".env.local" "src/app/login/page.tsx" "supabase/migrations/001_core_schema.sql" "supabase/migrations/002_request_system.sql" "supabase/migrations/003_gr_module.sql" "supabase/seed/001_initial_setup.sql" "supabase/seed/002_request_configs.sql" "public/logo.svg"; do
  if [ -f "$BASE/$f" ]; then echo "✅ $f"; else echo "❌ MISSING: $f"; fi
done
echo ""
echo "=== Checking .env.local has Supabase keys ==="
grep -c "SUPABASE" "$BASE/.env.local" 2>/dev/null && echo "✅ Keys found" || echo "❌ .env.local missing or empty"
```

Everything should show ✅. If Node.js is missing, install it first:
  brew install node

If any project files are missing, re-download the eagle-eye folder from 
the previous prompt and make sure it's inside your "Eagle Eye (Ultimate Edition)" folder.


────────────────────────────────────────────────────
  STEP 2 — INSTALL DEPENDENCIES
────────────────────────────────────────────────────

Paste this:

```
cd "/Users/macintosh/Desktop/Eagle Eye (Ultimate Edition)/eagle-eye"
npm install
```

This takes 1-2 minutes. Ignore yellow "peer dependency" warnings — they're harmless.
When it finishes you should see "added XXX packages" with no red errors.


────────────────────────────────────────────────────
  STEP 3 — NUKE OLD SUPABASE SCHEMA
────────────────────────────────────────────────────

Now switch to your browser.

  1. Go to: https://supabase.com/dashboard/project/jwhscbyyvzmyjunmmxnr/sql/new
     (This opens the SQL Editor for your project)

  2. Delete anything in the editor, then paste this ENTIRE block and click Run:

```sql
-- NUKE everything from old build
DO $$ 
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $$;

DO $$ 
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT typname FROM pg_type t 
              JOIN pg_namespace n ON t.typnamespace = n.oid 
              WHERE n.nspname = 'public' AND t.typtype = 'e') LOOP
        EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
    END LOOP;
END $$;

DO $$ 
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT sequencename FROM pg_sequences WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP SEQUENCE IF EXISTS public.' || quote_ident(r.sequencename) || ' CASCADE';
    END LOOP;
END $$;

DO $$ 
DECLARE r RECORD;
BEGIN
    FOR r IN (
        SELECT p.oid::regprocedure::text as func_sig
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public'
    ) LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_sig || ' CASCADE';
    END LOOP;
END $$;

-- Verify clean slate
SELECT 'Tables: ' || count(*) FROM pg_tables WHERE schemaname = 'public'
UNION ALL
SELECT 'Types: ' || count(*) FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE n.nspname = 'public' AND t.typtype = 'e';
```

You should see two rows both showing 0. That means the old schema is gone.


────────────────────────────────────────────────────
  STEP 4 — RUN NEW MIGRATIONS (3 SQL blocks)
────────────────────────────────────────────────────

Stay in the SQL Editor. You'll run 3 files one after another.
Clear the editor before each one.

  4A. Open this file on your Mac:
      /Users/macintosh/Desktop/Eagle Eye (Ultimate Edition)/eagle-eye/supabase/migrations/001_core_schema.sql
      
      Select All (Cmd+A) → Copy (Cmd+C)
      Paste into SQL Editor → Click Run
      ✅ Expected: "Success. No rows returned."

  4B. Open this file:
      /Users/macintosh/Desktop/Eagle Eye (Ultimate Edition)/eagle-eye/supabase/migrations/002_request_system.sql
      
      Clear editor → Paste → Run
      ✅ Expected: "Success. No rows returned."

  4C. Open this file:
      /Users/macintosh/Desktop/Eagle Eye (Ultimate Edition)/eagle-eye/supabase/migrations/003_gr_module.sql
      
      Clear editor → Paste → Run
      ✅ Expected: "Success. No rows returned."

  4D. Verify all tables were created. Paste and run:

```sql
SELECT count(*) as total_tables FROM pg_tables WHERE schemaname = 'public';
```

      ✅ Expected: total_tables should be around 30-34.


────────────────────────────────────────────────────
  STEP 5 — SEED REQUEST TYPE CONFIGS
────────────────────────────────────────────────────

Still in SQL Editor. Open this file:
  /Users/macintosh/Desktop/Eagle Eye (Ultimate Edition)/eagle-eye/supabase/seed/002_request_configs.sql

Clear editor → Paste → Run
✅ Expected: "Success. No rows returned."

Verify:
```sql
SELECT request_type, name_en, name_ar FROM request_type_configs ORDER BY request_type;
```
✅ Expected: 10 rows (fund_disbursement, general_internal, leave_approval, etc.)


────────────────────────────────────────────────────
  STEP 6 — CREATE YOUR LOGIN USER
────────────────────────────────────────────────────

This step has two parts: create the auth user, then link it to employee data.

  6A. CREATE AUTH USER:
      Go to: https://supabase.com/dashboard/project/jwhscbyyvzmyjunmmxnr/auth/users
      
      Click "Add user" → "Create new user"
      
        Email:    nawwaf@mansourholding.com
        Password: EagleEye2026!
        ☑ Auto Confirm User  ← CHECK THIS BOX
      
      Click "Create user"
      
      Now COPY the UUID shown in the users table. It's the long ID that 
      looks like: 7a2b3c4d-1234-5678-abcd-ef1234567890
      
      You'll need it for the next part.

  6B. SEED COMPANIES + DEPARTMENTS + YOUR USER:
      Open this file:
        /Users/macintosh/Desktop/Eagle Eye (Ultimate Edition)/eagle-eye/supabase/seed/001_initial_setup.sql
      
      Open it in any text editor first (TextEdit, VS Code, etc.)
      Find the line that says:
        'YOUR-AUTH-USER-UUID-HERE',   -- ← ⚠️ REPLACE THIS
      
      Replace YOUR-AUTH-USER-UUID-HERE with the UUID you just copied.
      Keep the single quotes around it.
      
      Example — it should look like:
        '7a2b3c4d-1234-5678-abcd-ef1234567890',   -- ← ⚠️ REPLACE THIS
      
      Now copy the entire file → Paste in SQL Editor → Run
      
      ✅ Expected: A results table showing:
         Nawwaf Albahar | nawwaf@mansourholding.com | Mansour Holding | IT | {super_admin,ceo}


────────────────────────────────────────────────────
  STEP 7 — LAUNCH THE APP
────────────────────────────────────────────────────

Back in Terminal, paste:

```
cd "/Users/macintosh/Desktop/Eagle Eye (Ultimate Edition)/eagle-eye"
npm run dev
```

Wait for:
  ▲ Next.js 15.2.4
  - Local:   http://localhost:3000

Now open http://localhost:3000 in your browser.

  Login with:
    Email:    nawwaf@mansourholding.com
    Password: EagleEye2026!

You should see the Eagle Eye dashboard with the sidebar, 
KPI cards, quick actions, and your name in the top-right.


────────────────────────────────────────────────────
  STEP 8 — PUSH TO GITHUB + DEPLOY TO VERCEL
────────────────────────────────────────────────────

  8A. Create a repo on github.com:
      Go to https://github.com/new
      Name: eagle-eye
      Private: Yes
      Do NOT add README or .gitignore (we already have them)
      Click "Create repository"
      Copy the repo URL (looks like: https://github.com/YOURNAME/eagle-eye.git)

  8B. Paste in Terminal (replace YOUR-GITHUB-URL):

```
cd "/Users/macintosh/Desktop/Eagle Eye (Ultimate Edition)/eagle-eye"
git init
git add .
git commit -m "Phase 0: Eagle Eye foundation — schema, auth, UI, logo"
git branch -M main
git remote add origin YOUR-GITHUB-URL
git push -u origin main
```

  8C. Deploy to Vercel:
      Go to https://vercel.com/new
      Import your eagle-eye repo
      Before clicking Deploy, expand "Environment Variables" and add:
      
        NEXT_PUBLIC_SUPABASE_URL        → https://jwhscbyyvzmyjunmmxnr.supabase.co
        NEXT_PUBLIC_SUPABASE_ANON_KEY   → (copy from .env.local)
        SUPABASE_SERVICE_ROLE_KEY       → (copy from .env.local)
      
      Click Deploy. Wait 1-2 minutes.

  8D. After deploy, add your Vercel URL to Supabase:
      Go to: https://supabase.com/dashboard/project/jwhscbyyvzmyjunmmxnr/auth/url-configuration
      Add to "Redirect URLs":
        https://your-app-name.vercel.app/**


────────────────────────────────────────────────────
  DONE — VERIFY CHECKLIST
────────────────────────────────────────────────────

Run this quick check in Terminal:

```
cd "/Users/macintosh/Desktop/Eagle Eye (Ultimate Edition)/eagle-eye"
echo "=== Project Check ==="
echo -n "node_modules: " && [ -d node_modules ] && echo "✅ installed" || echo "❌ run npm install"
echo -n ".env.local:   " && [ -f .env.local ] && echo "✅ exists" || echo "❌ missing"
echo -n "git repo:     " && git remote -v 2>/dev/null | head -1 || echo "❌ not connected"
echo -n "Total files:  " && find src -type f | wc -l | tr -d ' '
echo ""
echo "Open http://localhost:3000 if dev server is running"
```

Everything working? Tell me and we start Phase 1 — 
importing all 107 employees from your Master Data Excel 
and building the request engine.


────────────────────────────────────────────────────
  TROUBLESHOOTING
────────────────────────────────────────────────────

PROBLEM: "Invalid credentials" on login
FIX: The auth user UUID wasn't linked properly. Run in SQL Editor:
  SELECT auth_user_id FROM employees WHERE employee_code = '1577';
  If it shows NULL or wrong UUID, update it:
  UPDATE employees SET auth_user_id = 'CORRECT-UUID-HERE' WHERE employee_code = '1577';

PROBLEM: Blank page after login  
FIX: The employee record doesn't exist or has wrong auth_user_id.
  Check: SELECT * FROM employees WHERE auth_user_id IS NOT NULL;

PROBLEM: Sidebar missing GR or Admin sections
FIX: Your user needs roles. Check:
  SELECT * FROM user_roles WHERE employee_id = 'd0000000-0000-0000-0000-000000000001';
  Should show super_admin and ceo.

PROBLEM: "relation does not exist" errors
FIX: Migrations ran out of order. Re-run Step 3 (nuke), then Step 4 (all 3 migrations in order).

PROBLEM: npm install fails
FIX: Make sure Node.js 18+ is installed: node --version
  If old: brew upgrade node

PROBLEM: Vercel build fails
FIX: All 3 env variables must be set in Vercel project settings.
  SUPABASE_SERVICE_ROLE_KEY is the one most commonly forgotten.
