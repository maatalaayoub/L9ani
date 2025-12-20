# Environment Variables Setup Guide

## Required Environment Variables

Your `.env.local` file should contain:

```
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Groq API (FREE - for AI Chatbot)
GROQ_API_KEY=gsk_your-groq-api-key-here
GROQ_MODEL=llama-3.1-8b-instant  # Optional
```

---

## Supabase Setup

### The Problem
You're seeing "Error checking email availability" because the `/api/email-check` endpoint requires the `SUPABASE_SERVICE_ROLE_KEY` environment variable, which is currently missing.

### The Solution

#### Step 1: Get Your Service Role Key
1. Go to your **Supabase Dashboard**
2. Click on **Settings** (gear icon in sidebar)
3. Click on **API**
4. Scroll down to **Project API keys**
5. Find the **`service_role`** key (it's a long secret key)
6. Click the **copy** icon to copy it

#### Step 2: Add It to Your .env.local File
1. Open the file `.env.local` in your project root (create it if it doesn't exist)
2. Add this line (replace `your-service-role-key-here` with the actual key you copied):

```
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

---

## AI Chatbot Setup (Groq API - FREE)

The AI Assistant uses Groq API which is completely free!

### Step 1: Get Your Groq API Key
1. Go to **https://console.groq.com/keys**
2. Sign in or create a free account
3. Click **"Create API Key"**
4. Give it a name (e.g., "L9ani Chatbot")
5. Copy the key immediately

### Step 2: Add to .env.local
```
GROQ_API_KEY=gsk_your-groq-api-key-here
```

### Optional: Choose Model
```
GROQ_MODEL=llama-3.1-8b-instant  # Default, fast and free
# GROQ_MODEL=llama-3.3-70b-versatile  # More capable
```

---

### Fallback Mode
If the Groq API key is not configured (or the API fails), the chatbot will automatically fall back to a simple offline response mode with basic navigation suggestions.

---

## After Adding Variables

### Restart Your Development Server
**CRITICAL:** Environment variables are only loaded when the server starts.

1. Stop your current `npm run dev` process (Ctrl+C in the terminal)
2. Start it again: `npm run dev`

### Test
After the server restarts, the features should work correctly!

## Security Note
⚠️ **NEVER** commit the `.env.local` file to Git. It contains sensitive keys that could give attackers full access to your services. The `.gitignore` file should already be protecting it.
