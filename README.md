# ⚓ SoberAnchor

The definitive directory-first platform for addiction and recovery resources.

## Tech Stack
- **Framework**: Next.js 16 (App Router, TypeScript)
- **Styling**: Tailwind CSS v4
- **Database**: Supabase (PostgreSQL + PostGIS)
- **Deployment**: Vercel

## Getting Started

```bash
npm install
cp .env.local.example .env.local
# Add your Supabase keys to .env.local
npm run dev
```

## Pages
- `/` — Homepage with guided discovery flow
- `/find` — Directory (facilities + meetings from Supabase)
- `/find/[id]` — Facility detail with lead capture form
- `/resources` — Content hub
- `/our-story` — Angel's story
- `/for-providers` — B2B landing page

## Deployment
Connected to Vercel via GitHub. Push to `main` to deploy.
