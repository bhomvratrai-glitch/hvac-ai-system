# Quick Setup Guide (5 minutes)

## Step 1: Get Groq API Key (30 seconds)
1. Go to https://console.groq.com
2. Sign up with Google
3. Click 'API Keys' → 'Create API Key'
4. Copy the key

## Step 2: Set Supabase Secrets (2 minutes)
1. Go to Supabase Dashboard → your project (hvac-ai-chatbot)
2. Click 'Edge Functions' in sidebar
3. Click 'Manage Secrets'
4. Add: GROQ_API_KEY = (paste your key)

## Step 3: Run Database Migration (1 minute)
1. Go to Supabase → SQL Editor
2. Paste contents of supabase/migrations/001_full_schema.sql
3. Click 'Run'

## Step 4: Deploy Edge Functions
Brain will deploy these automatically via Supabase MCP.

## Step 5: Gmail OAuth Setup (for auto-email, optional)
This requires creating a Google Cloud project. Brain can guide you through it.
Alternatively, Brain can send emails via ClickUp's Gmail integration.

## That's it!
The system runs on:
- GitHub Actions cron (3x daily auto-emails + inbox check)
- Supabase Edge Functions (AI brain, APIs)
- Dashboard auto-refreshes every 30 seconds
