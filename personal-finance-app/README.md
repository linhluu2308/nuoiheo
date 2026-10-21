# Nuôi heo

A personal finance web app for one person: record spending, income and transfers between
wallets, and see how much has been spent, how much is left until the end of the month, and how
much was saved. Works on desktop and phone with the same data.

- What the app does and why: [design.md](design.md) (the approved spec, in Vietnamese)
- Built with React + TypeScript (Vite), Tailwind, Recharts; data and Google sign-in by Supabase;
  hosted on Vercel

## Run it on your computer

1. Install Node.js (version 20 or newer).
2. In this folder, install the libraries:
   ```
   npm install
   ```
3. Copy `.env.example` to `.env.local` and fill in the two values from
   Supabase → Project Settings → API. Use the **publishable** key only — never the secret /
   service_role key. `.env.local` is ignored by git.
4. Start the app and open http://localhost:5173:
   ```
   npm run dev
   ```

Other commands:

| Command | What it does |
|---|---|
| `npm test` | Runs the automatic checks for the money calculations |
| `npm run build` | Checks the code for errors and builds the site into `dist/` |

## One-time Supabase setup

1. **Tables:** in Supabase → SQL Editor, run all of [supabase/schema.sql](supabase/schema.sql).
   It is safe to re-run: when the file gains a table (e.g. `planned`), run it again before deploying.
2. **Who may use the app:** in the SQL Editor, add your Google account:
   ```sql
   insert into private.allowed_emails (email) values ('you@gmail.com');
   ```
   Any other Google account can sign in but cannot see or change any data.
3. **Sign-in:** Authentication → Providers → turn on Google.
4. **Redirects:** Authentication → URL Configuration → add `http://localhost:5173` and the
   Vercel address (e.g. `https://nuoiheo.vercel.app`) to Redirect URLs.

## Vercel settings

- **Root Directory:** `personal-finance-app`
- **Framework Preset:** Vite
- **Environment Variables** (Production, Preview, Development):
  `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` — same values as `.env.local`.
  Redeploy after changing them.

`vercel.json` makes page addresses such as `/so-ghi` work when the page is refreshed.

## Where things are

| Folder | Contents |
|---|---|
| `src/pages/` | The 5 screens: Overview, Ledger, Wallets & categories, Planned (one-off + recurring), Reports |
| `src/components/` | Shared pieces: layout, forms, charts |
| `src/lib/` | The money calculations (`finance.ts`) and helpers; `finance.test.ts` checks them |
| `src/data/` | Sign-in, loading and saving to Supabase |
| `supabase/` | Database setup script |
