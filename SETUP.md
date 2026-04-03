# Project Zero — Complete Setup Guide
## From Zero to Live in ~60 Minutes

---

## FILE OVERVIEW

| File | Purpose |
|------|---------|
| `index.html` | Main landing page (deploy this) |
| `dashboard.html` | Analytics dashboard (keep private) |
| `notion-proxy.js` | Serverless function for Notion API |
| `SETUP.md` | This guide |

---

## STEP 1: SUPABASE (Free — 5 min)

### 1.1 Create Account
→ https://supabase.com → Sign Up → Create new project

### 1.2 Create Tables
Go to **SQL Editor** in your Supabase dashboard and run:

```sql
-- VISITS TABLE
create table visits (
  id           bigserial primary key,
  session_id   text,
  timestamp    timestamptz default now(),
  device_type  text,
  country      text,
  city         text,
  referral     text,
  page_url     text,
  utm_source   text,
  utm_medium   text,
  utm_campaign text
);

-- LEADS TABLE
create table leads (
  id         bigserial primary key,
  email      text unique,
  session_id text,
  source     text,
  timestamp  timestamptz default now(),
  status     text default 'lead'
);

-- PURCHASES TABLE
create table purchases (
  id             bigserial primary key,
  session_id     text,
  email          text,
  transaction_id text unique,
  amount         decimal(10,2),
  currency       text default 'USD',
  timestamp      timestamptz default now(),
  status         text default 'completed'
);
```

### 1.3 Enable Row Level Security + Public Insert
```sql
-- Allow public inserts (your landing page)
alter table visits  enable row level security;
alter table leads   enable row level security;
alter table purchases enable row level security;

create policy "public insert visits"    on visits    for insert with check (true);
create policy "public insert leads"     on leads     for insert with check (true);
create policy "public insert purchases" on purchases for insert with check (true);

-- Allow anon select (for dashboard — restrict this in production)
create policy "anon select visits"    on visits    for select using (true);
create policy "anon select leads"     on leads     for select using (true);
create policy "anon select purchases" on purchases for select using (true);
```

### 1.4 Get Your Credentials
- Go to **Settings → API**
- Copy: **Project URL** and **anon public key**

---

## STEP 2: PAYPAL (Free — 10 min)

### 2.1 Create PayPal Developer App
→ https://developer.paypal.com
1. Log in with your PayPal business account
2. Go to **My Apps & Credentials**
3. Click **Create App** → give it a name
4. Copy your **Client ID** (use Sandbox first, then switch to Live)

### 2.2 Test in Sandbox
- Use sandbox credentials first
- Test buyer account: create one at developer.paypal.com → Sandbox → Accounts

### 2.3 Switch to Live
- In the PayPal dashboard, toggle from Sandbox → Live
- Copy the **Live Client ID**

---

## STEP 3: NOTION (Free — 10 min)

### 3.1 Create Integration
→ https://notion.so/my-integrations
1. Click **+ New Integration**
2. Name it "Project Zero"
3. Copy the **Internal Integration Token**

### 3.2 Create Three Databases
In your Notion workspace, create 3 databases:

**Database 1: Leads**
| Column | Type |
|--------|------|
| Email | Title |
| Session ID | Text |
| Timestamp | Date |
| Status | Select (Lead, Customer) |

**Database 2: Purchases**
| Column | Type |
|--------|------|
| Email | Title |
| Amount | Number |
| Transaction ID | Text |
| Timestamp | Date |
| Status | Select |

**Database 3: Daily Summary**
| Column | Type |
|--------|------|
| Date | Title |
| Total Visitors | Number |
| Total Leads | Number |
| Total Customers | Number |
| Revenue (USD) | Number |
| Conversion Rate (%) | Number |

### 3.3 Connect Integration to Each Database
- Open each database → click **...** → **Add connections** → select "Project Zero"

### 3.4 Get Database IDs
- Open database as full page
- Copy URL: `https://notion.so/YOUR-DB-ID?v=...`
- The ID is the part after `notion.so/` and before `?`

---

## STEP 4: NOTION PROXY (Free via Netlify — 10 min)

The Notion API requires a server-side call (token must stay secret).
We use a free Netlify Function.

### 4.1 Deploy to Netlify
1. Create account at https://netlify.com
2. Create a new site from GitHub (or drag-and-drop deploy)
3. In **Site Settings → Environment Variables**, add:

```
NOTION_TOKEN=secret_xxxxxxxxxxxx
NOTION_LEADS_DB=your-leads-db-id
NOTION_PURCHASES_DB=your-purchases-db-id
NOTION_SUMMARY_DB=your-summary-db-id
```

4. Create folder: `netlify/functions/`
5. Place `notion-proxy.js` inside it (rename to `notion.js`)
6. Deploy — your function will be at:
   `https://your-site.netlify.app/.netlify/functions/notion`

---

## STEP 5: UPDATE CONFIG IN index.html

Find the `CONFIG` block near the bottom of `index.html`:

```javascript
const CONFIG = {
  SUPABASE_URL:     'https://YOUR_PROJECT.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',
  PAYPAL_CLIENT_ID:  'YOUR_PAYPAL_CLIENT_ID',
  PAYPAL_AMOUNT:     '47.00',
  PAYPAL_CURRENCY:   'USD',
  PRIVATE_APP_URL:   'https://your-app-link.com/dashboard',
  NOTION_PROXY_URL:  'https://your-site.netlify.app/.netlify/functions/notion',
};
```

Replace each value. Also update the `dashboard.html` `NOTION_PROXY` variable.

---

## STEP 6: DEPLOY LANDING PAGE (Free — 5 min)

### Option A: Netlify (Recommended)
1. Drag `index.html` to https://app.netlify.com/drop
2. Get instant URL like `random-name.netlify.app`
3. Add custom domain in settings (optional)

### Option B: GitHub Pages
1. Push `index.html` to a GitHub repo
2. Settings → Pages → Deploy from main branch

### Option C: Cloudflare Pages
1. Connect GitHub repo at https://pages.cloudflare.com
2. Build settings: none needed (static HTML)

---

## STEP 7: GOOGLE DRIVE EXPORTS (Optional)

The dashboard exports CSV files directly to your computer.
To auto-save to Google Drive:

1. Install the Google Drive desktop app
2. Set your browser's download folder to your Drive folder
3. Or use Google Apps Script to automate uploads:

```javascript
// In Google Apps Script (script.google.com):
// Set this to run daily via a time-based trigger

function importFromSupabase() {
  const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
  const SUPABASE_KEY = 'YOUR_ANON_KEY';
  const FOLDER_ID    = 'YOUR_GOOGLE_DRIVE_FOLDER_ID';

  ['visits', 'leads', 'purchases'].forEach(table => {
    const res = UrlFetchApp.fetch(
      `${SUPABASE_URL}/rest/v1/${table}?select=*`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    );
    const data = JSON.parse(res.getContentText());
    if (!data.length) return;

    const headers = Object.keys(data[0]);
    const rows = data.map(r => headers.map(h => r[h] ?? ''));
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');

    const folder = DriveApp.getFolderById(FOLDER_ID);
    const date = new Date().toISOString().slice(0,10);
    folder.createFile(`pz_${table}_${date}.csv`, csv, MimeType.CSV);
  });
}
```

---

## STEP 8: DASHBOARD ACCESS

1. Open `dashboard.html` in your browser (keep this file private — don't publish it)
2. Enter your Supabase URL, anon key, and dashboard password
3. Default password: `zero2025` (change this in `dashboard.html` → `DASHBOARD_PASSWORD`)

---

## AUTOMATION: DAILY NOTION SUMMARY

Set up a free cron job to sync daily stats to Notion automatically:

### Option A: Netlify Scheduled Functions
Add to `netlify.toml`:
```toml
[functions."notion-daily"]
  schedule = "0 8 * * *"
```

### Option B: GitHub Actions (Free)
```yaml
# .github/workflows/daily-sync.yml
name: Daily Notion Sync
on:
  schedule:
    - cron: '0 8 * * *'
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger sync
        run: |
          curl -X POST ${{ secrets.NOTION_PROXY_URL }} \
            -H "Content-Type: application/json" \
            -d '{"action":"daily_summary","date":"'$(date +%Y-%m-%d)'"}'
```

---

## QUICK CHECKLIST

- [ ] Supabase project created + 3 tables created
- [ ] PayPal app created (sandbox first)
- [ ] Notion integration created + 3 databases set up
- [ ] `notion-proxy.js` deployed to Netlify Functions
- [ ] `CONFIG` block in `index.html` updated with real values
- [ ] `index.html` deployed to Netlify/GitHub Pages
- [ ] Test visit tracking (open page → check Supabase visits table)
- [ ] Test email capture (submit email → check Supabase leads + Notion)
- [ ] Test PayPal sandbox payment → check Supabase purchases + Notion
- [ ] Switch PayPal to Live mode
- [ ] Update `PRIVATE_APP_URL` to your real product URL
- [ ] Set dashboard password in `dashboard.html`

---

## SUPPORT & UPDATES

All data flows:

```
Visitor → index.html → Supabase (visits table)
Email signup → Supabase (leads) + Notion (Leads DB)
PayPal payment → Supabase (purchases) + Notion (Purchases DB)
Dashboard → reads Supabase → charts + tables
Export button → CSV download (can be saved to Drive)
Sync button → POST to Notion proxy → Notion (Summary DB)
```

Total monthly cost: **$0**
(All services used: Supabase Free, PayPal standard fees only on sales, Netlify Free, Notion Free)
