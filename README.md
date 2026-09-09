# X Growth Agent

AI-powered, human-first X growth assistant for developers, AI builders, product makers, vibe coders, and indie hackers.

## Product principle

The agent optimizes for relevant audience growth, not spam or vanity metrics. It researches conversations, finds opportunities, drafts useful posts and replies, learns from performance, and keeps the human in control until autonomous actions are explicitly enabled.

## Current milestone

Phase 2 adds the real foundation behind the dashboard:

- X OAuth 2.0 Authorization Code with PKCE
- Secure encrypted storage for X access and refresh tokens
- Supabase persistence
- Authenticated X profile lookup
- Recent authored-post sync
- Approval-only behavior; no automated posting, replying, liking, or following

## Local setup

1. Create a Supabase project.
2. Run `supabase/migrations/001_growth_agent.sql` in the Supabase SQL editor.
3. Create an X developer App and enable OAuth 2.0.
4. Add this exact callback URL to the X App:

```text
http://localhost:3000/api/auth/x/callback
```

5. Copy `.env.example` to `.env.local` and fill in the values.
6. Generate a 32-byte encryption key for `XGA_ENCRYPTION_KEY`, for example:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

7. Install and run:

```bash
npm install
npm run dev
```

Then open http://localhost:3000 and choose **Connect X**.

## Environment

```text
X_CLIENT_ID
X_CLIENT_SECRET            # only required for confidential X clients
X_REDIRECT_URI
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SECRET_KEY        # server-only Supabase secret key
XGA_ENCRYPTION_KEY
```

Never commit `.env.local`, X tokens, Supabase secret keys, or encryption keys.

## Architecture

```text
X OAuth
   ↓
Account connection
   ↓
Encrypted token store
   ↓
X profile + post sync
   ↓
Research engine
   ↓
Opportunity scoring
   ↓
Content + reply agents
   ↓
Human approval
   ↓
Publishing + analytics
   ↓
Learning loop
```

## Safety / authenticity

The product is designed for genuine participation: no mass-following, fake engagement, spam replies, engagement pods, credential scraping, or browser automation intended to bypass platform controls.
