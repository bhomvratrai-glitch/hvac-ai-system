# 🤖 HVAC AI Lead Conversion System

**Fully autonomous, 100% free AI-powered sales machine for HVAC businesses in India.**

Built by Bhomvrat Rai. Powered by Groq + Supabase + GitHub Actions.

## Architecture

```
Groq (Llama 3.1 70B) → AI Brain (free)
Supabase Edge Functions → API layer (free)
Supabase Postgres → Database (free)
GitHub Actions → Cron automation (free, 2000 min/month)
Gmail API → Email sending (free)
Vercel/GitHub Pages → Dashboard hosting (free)
```

## Features

- **AI Chatbot**: Hindi-English conversational bot for HVAC lead qualification
- **Auto Email Sequences**: Day 0 → Day 2 → Day 5 → Day 8 follow-ups
- **Inbox Monitor**: AI classifies replies (INTERESTED/NOT_INTERESTED/QUESTION)
- **Prospect Finder**: Auto-scrapes HVAC businesses by city
- **Lead Capture API**: Website form → Database → Notification
- **Command Center Dashboard**: Real-time pipeline visibility

## Setup

### 1. Get Free API Keys
- **Groq**: Sign up at [console.groq.com](https://console.groq.com) → Get free API key
- **Gmail OAuth**: Create project at [console.cloud.google.com](https://console.cloud.google.com) → Enable Gmail API → Create OAuth credentials

### 2. Set Supabase Secrets
```bash
# In Supabase Dashboard → Edge Functions → Secrets
GROQ_API_KEY=your_groq_key
GMAIL_REFRESH_TOKEN=your_token
GMAIL_CLIENT_ID=your_client_id
GMAIL_CLIENT_SECRET=your_client_secret
```

### 3. Run Database Migrations
Execute `supabase/migrations/001_full_schema.sql` in Supabase SQL editor.

### 4. Deploy Edge Functions
Deploy each function from `supabase/functions/` directory.

### 5. Set GitHub Secrets
```
SUPABASE_URL=https://your-project.supabase.co
```

### 6. Deploy Dashboard
Host `dashboard/index.html` on Vercel or GitHub Pages. Update SUPABASE_URL and SUPABASE_KEY.

## Cost: ₹0/month forever

All services used are within free tier limits.

## License

MIT - Do whatever you want with it.
