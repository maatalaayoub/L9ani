# Email Check API - Missing Environment Variable Fix

## The Problem
You're seeing "Error checking email availability" because the `/api/email-check` endpoint requires the `SUPABASE_SERVICE_ROLE_KEY` environment variable, which is currently missing.

## The Solution

### Step 1: Get Your Service Role Key
1. Go to your **Supabase Dashboard**
2. Click on **Settings** (gear icon in sidebar)
3. Click on **API**
4. Scroll down to **Project API keys**
5. Find the **`service_role`** key (it's a long secret key)
6. Click the **copy** icon to copy it

### Step 2: Add It to Your .env.local File
1. Open the file `.env.local` in your project root (create it if it doesn't exist)
2. Add this line (replace `your-service-role-key-here` with the actual key you copied):

```
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

Your `.env.local` file should look something like this:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 3: Restart Your Development Server
**CRITICAL:** Environment variables are only loaded when the server starts.

1. Stop your current `npm run dev` process (Ctrl+C in the terminal)
2. Start it again: `npm run dev`

### Step 4: Test
After the server restarts, try changing your email again. The error should be gone!

## Security Note
⚠️ **NEVER** commit the `.env.local` file to Git. It contains sensitive keys that could give attackers full access to your database. The `.gitignore` file should already be protecting it.
