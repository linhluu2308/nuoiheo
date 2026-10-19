# Design Doc — Personal Finance Web App

> All key decisions are made (see section 9). Items marked *(default)* are sensible starting values that can be adjusted during build without revisiting the design.

| Field | Value |
|---|---|
| Owner | Linh |
| Version | v1.0 |
| Last updated | 19/10/2026 |
| Status | Final — ready to build |

---

## 1. Overview

### 1.1 Purpose
One sentence on what the app does and the problem it solves.
"Track income and spending across all my accounts, set monthly budgets, see where my money goes, and forecast my future cash position."

### 1.2 Target users
**Decided: Just me** (single user). Household/shared use may be added later — the data model keeps `user_id` on every table so this stays possible.

### 1.3 Scope
| In scope (v1) | Out of scope (later / never) |
|---|---|
| Manual transaction entry | Direct bank connection (open banking) |
| Accounts, categories, budgets | Investment / stock portfolio tracking |
| Monthly reports & charts | Tax filing |
| CSV import / export | Bill payment from inside the app |
| Recurring transactions | Mobile native app (web is mobile-responsive instead) |
| Cash flow forecast | Shared / household access (later) |

### 1.4 Success criteria
- [ ] I can log a transaction in under 15 seconds
- [ ] I can see this month's spending vs budget at a glance
- [ ] I can see my projected balance for the coming months and get warned before it goes too low
- [ ] Data is never lost (backups + export work)
- [ ] [add your own]

---

## 2. Users & Rules

### 2.1 Roles
| Role | Can do |
|---|---|
| Owner (only role) | Everything: create/edit/delete all data, settings, export, delete account |

Sign-up is restricted to my Google account only (allow-list), so no one else can create an account on the app.

### 2.2 Authentication rules
- Login method: **Google sign-in (Gmail)**. The app never sees or stores my Google password
- Stay logged in: **yes, persistent session** — survives closing the browser and turning the device off. Implemented with a long-lived refresh token stored securely on each device; session renews automatically while in use
- Session ends only when I log out, revoke the device, or don't use the app for 90 days *(default)*
- "Sign out of all devices" button in Settings (for a lost or stolen device)
- 2-factor authentication: **later** for the app itself. In the meantime, protection comes from Google's own 2-Step Verification on my Gmail account (should be switched on) and the device's screen lock
- Lock-out rules: handled by Google

### 2.3 Data ownership & privacy rules
- Each user can only ever read/write their own data (enforced at database level, not just UI — e.g. row-level security)
- **Never store** bank login credentials, full card numbers, or bank account numbers. Store only a nickname + last 4 digits if needed
- Users can export all their data at any time (CSV/JSON)
- Users can permanently delete their account and all data
- No data shared with third parties; no analytics on transaction contents

### 2.4 Business rules — money & transactions
| Rule | Default | Notes |
|---|---|---|
| Base currency | **VND** | Display format: 1.250.000 ₫ |
| Multi-currency | Not in v1 | If needed later: store original amount + currency + exchange rate at time of transaction |
| Money storage | Integer, whole đồng (bigint) | VND has no smaller unit, so no decimals at all. bigint handles very large balances safely |
| Transaction types | Income, Expense, Transfer | Transfer moves money between two of my accounts and is **excluded** from income/expense reports |
| Amount | Always positive; type decides direction | Prevents sign confusion |
| Date | Required; defaults to today; future dates allowed (status = planned) | Timezone = Asia/Ho_Chi_Minh |
| Category | Required for Income/Expense; not used for Transfer | Fallback "Uncategorised" |
| Editing | Any transaction editable | Keep `updated_at` |
| Deleting | Soft delete (hidden, recoverable 30 days), then hard delete | Protects against accidental loss |
| Account balance | Calculated = opening balance + sum of transactions | Never typed in manually after setup; use "Adjustment" transaction to reconcile |

### 2.5 Business rules — budgets
- Budget period: monthly
- One budget amount per category per period
- Unspent budget: **rolls over** to the next month (overspend also carries forward as a negative)
  - Available this month = this month's budget + carried-over amount
  - Roll-over can be switched off per category (e.g. for categories where saving up makes no sense)
- Alert when spending reaches 80% and 100% of available budget *(default)*

### 2.6 Business rules — recurring transactions
- Frequency: daily / weekly / monthly / yearly
- **Pending:** on the due date, the app creates the transaction as "pending" and I confirm, edit or skip it. Pending items do not affect actual balances until confirmed
- Editing a recurring rule affects future occurrences only
- Overdue pending items (not confirmed after 7 days) are highlighted on the Dashboard

### 2.7 Business rules — cash flow forecast
- Forecast = projected balance per day, starting from today's actual balance
- Inputs counted in the forecast:
  1. **Recurring rules** — all future occurrences (salary, rent, subscriptions, loan repayments)
  2. **Planned transactions** — one-off future items I enter (e.g. expected bonus, annual insurance, a trip)
  3. **Variable spending** — estimated from **budgets**:
     - Current month: remaining budget per category, spread evenly over the remaining days
     - Future months: each category's monthly budget, spread evenly across the month
     - Categories with no budget set are not estimated *(default)* — the Forecast screen lists them so I can add a budget
- Horizon: **3 months**
- Accounts included: all active accounts *(default)*; toggle to exclude e.g. long-term savings
- Credit cards: purchases reduce the forecast balance on the card's **payment due date**, not the purchase date
  - Purchases up to the statement closing day fall into that statement; later purchases roll into the next one
  - On the due date, the full statement balance is assumed paid from the linked payment account *(default: full payment, not minimum)*
- Low-balance warning: alert if projected balance drops below a threshold I set *(default: 0 ₫)*
- Forecast is calculated on the fly, not stored — it always reflects the latest data
- "What-if": add a temporary planned item to see its effect without saving it *(v2)*

---

## 3. Screens

> For each screen: purpose → key elements → actions → rules/edge cases.

### 3.1 Log in
- **Elements:** single "Continue with Google" button
- **Rules:** only my Google account is accepted; any other account sees "Access not allowed". After first login, the app opens straight to the Dashboard on that device until I log out

### 3.2 Onboarding (first login only)
- **Elements:** confirm VND + timezone, add first account + opening balance, pick starter categories
- **Rules:** skippable; can be completed later in Settings

### 3.3 Dashboard (home)
- **Elements:**
  - Total balance across accounts
  - This month: income, expenses, net
  - Budget progress bars (top 5 categories)
  - Recent transactions (last 10)
  - Upcoming recurring items (next 7 days) + pending items to confirm
  - Mini forecast: projected balance at end of this month and lowest point in the next 30 days
- **Actions:** quick "+ Add transaction" button (always visible); confirm/skip pending items inline
- **Rules:** default period = current month; period switcher

### 3.4 Transactions list
- **Elements:** list grouped by date; amount, category, account, note
- **Actions:** search, filter (date range, account, category, type, amount range), edit, delete, bulk re-categorise
- **Rules:** paginate / infinite scroll; show running total of filtered results

### 3.5 Add / Edit transaction (modal or page)
- **Fields:** type, amount, date, account, category, note, tags *(optional)*, receipt photo *(v2)*
- **Rules:** amount > 0; Transfer requires "from" and "to" accounts that are different; remember last-used account

### 3.6 Accounts
- **Elements:** list of accounts with current balance; type (cash, bank, credit card, e-wallet, savings)
- **Actions:** add, edit, archive (not delete if it has transactions), reconcile
- **Rules:** credit card balance shown as negative (amount owed)

### 3.7 Categories
- **Elements:** Income and Expense categories, optional sub-categories, icon/colour
- **Actions:** add, rename, merge, archive
- **Rules:** cannot delete a category in use → must merge or archive

### 3.8 Budgets
- **Elements:** per-category budget vs actual for selected period; remaining amount
- **Actions:** set/edit budget, copy last month's budgets
- **Rules:** see 2.5

### 3.9 Reports
- **Elements:**
  - Spending by category (donut/bar)
  - Income vs expense over time (line, 6–12 months)
  - Monthly comparison table
- **Actions:** change period, filter by account, export report (CSV/PDF)
- **Rules:** Transfers excluded

### 3.10 Cash flow forecast
- **Elements:**
  - Line chart of projected balance (daily), with the low-balance threshold drawn as a line
  - Lowest projected balance + the date it happens
  - Month-by-month table: opening balance, expected income, expected expenses, closing balance
  - List of upcoming items driving the forecast (recurring, planned, estimated variable spending)
- **Actions:** change horizon, include/exclude accounts, add a planned transaction, jump to a recurring rule to edit it
- **Rules:** see 2.7. Estimated amounts shown visually different (e.g. dashed/lighter) from confirmed items

### 3.11 Recurring transactions
- **Elements:** list of rules with next due date
- **Actions:** add, edit, pause, delete; confirm pending items

### 3.12 Savings goals *(v2)*
- **Elements:** goal name, target amount, target date, progress
- **Actions:** add contribution, edit, complete

### 3.13 Import / Export
- **Import:** CSV upload → column mapping → preview → duplicate check → confirm
- **Export:** all data as CSV / JSON
- **Rules:** flag likely duplicates (same date + amount + account)

### 3.14 Settings
- Profile, timezone, date format (DD/MM/YYYY), first day of week, notifications, low-balance threshold, forecast defaults, "Sign out of all devices", delete account

### 3.15 Screen map
```
Login → (Onboarding) → Dashboard
Dashboard ─┬─ Transactions ── Add/Edit Transaction
           ├─ Accounts
           ├─ Budgets
           ├─ Reports
           ├─ Forecast
           ├─ Recurring
           ├─ Goals (v2)
           └─ Settings ─┬─ Categories
                        └─ Import / Export
```

---

## 4. Data to Save (Data Model)

> Conventions: every table has `id` (UUID), `created_at`, `updated_at`. Every user-owned table has `user_id`. Money = integer (`amount_minor`). Soft-deleted rows have `deleted_at`.

### 4.1 `users`
| Field | Type | Required | Notes |
|---|---|---|---|
| id | uuid | ✓ | |
| email | text | ✓ | my Gmail address; unique |
| display_name | text | | from Google profile |
| base_currency | text(3) | ✓ | VND |
| timezone | text | ✓ | Asia/Ho_Chi_Minh |
| date_format | text | | DD/MM/YYYY |
| low_balance_threshold | bigint | ✓ | default 0 |
| forecast_horizon_months | int | ✓ | default 3 |
| forecast_variable_method | enum | ✓ | budget / history / none (per 2.7) |
| created_at / updated_at | timestamp | ✓ | |

*(Login and sessions handled by Google + the auth provider; no passwords stored anywhere in the app.)*

### 4.2 `accounts`
| Field | Type | Required | Notes |
|---|---|---|---|
| id, user_id | uuid | ✓ | |
| name | text | ✓ | e.g. "Vietcombank", "Cash" |
| type | enum | ✓ | cash, bank, credit_card, e_wallet, savings |
| opening_balance_minor | bigint | ✓ | |
| last4 | text(4) | | optional, never full number |
| is_archived | bool | ✓ | default false |
| include_in_forecast | bool | ✓ | default true |
| statement_closing_day | int | | credit cards only (1–31) |
| statement_due_day | int | | credit cards only (1–31) |
| payment_account_id | uuid | | credit cards only — account the bill is paid from |

### 4.3 `categories`
| Field | Type | Required | Notes |
|---|---|---|---|
| id, user_id | uuid | ✓ | |
| name | text | ✓ | |
| kind | enum | ✓ | income, expense |
| parent_id | uuid | | for sub-categories |
| icon, colour | text | | |
| is_archived | bool | ✓ | |

### 4.4 `transactions`
| Field | Type | Required | Notes |
|---|---|---|---|
| id, user_id | uuid | ✓ | |
| type | enum | ✓ | income, expense, transfer |
| amount_minor | bigint | ✓ | > 0 |
| date | date | ✓ | |
| account_id | uuid | ✓ | "from" account for transfers |
| to_account_id | uuid | | transfers only |
| category_id | uuid | | required unless transfer |
| note | text | | |
| status | enum | ✓ | cleared (actual), pending (from recurring rule, awaiting confirmation), planned (one-off future item for the forecast) |
| recurring_rule_id | uuid | | if generated from a rule |
| import_batch_id | uuid | | if imported |
| deleted_at | timestamp | | soft delete |

### 4.5 `tags` + `transaction_tags` *(optional)*
| Table | Fields |
|---|---|
| tags | id, user_id, name |
| transaction_tags | transaction_id, tag_id |

### 4.6 `budgets`
| Field | Type | Required | Notes |
|---|---|---|---|
| id, user_id | uuid | ✓ | |
| category_id | uuid | ✓ | |
| period_start | date | ✓ | e.g. 2026-10-01 |
| period_type | enum | ✓ | monthly (default) |
| amount_minor | bigint | ✓ | |
| rollover | bool | ✓ | default true |
| carried_over_minor | bigint | ✓ | amount brought in from previous month (can be negative) |

Unique: (user_id, category_id, period_start)

### 4.7 `recurring_rules`
| Field | Type | Required | Notes |
|---|---|---|---|
| id, user_id | uuid | ✓ | |
| template fields | — | ✓ | type, amount_minor, account_id, to_account_id, category_id, note |
| frequency | enum | ✓ | daily, weekly, monthly, yearly |
| interval | int | ✓ | e.g. every 2 weeks = 2 |
| start_date / end_date | date | start ✓ | |
| next_due_date | date | ✓ | |
| auto_confirm | bool | ✓ | false (pending mode) |
| is_paused | bool | ✓ | |

### 4.8 `goals` *(v2)*
| Field | Type | Notes |
|---|---|---|
| id, user_id | uuid | |
| name | text | |
| target_amount_minor | bigint | |
| target_date | date | |
| linked_account_id | uuid | optional — progress = account balance |
| status | enum | active, completed, cancelled |

### 4.9 `import_batches`
| Field | Type | Notes |
|---|---|---|
| id, user_id | uuid | |
| file_name | text | |
| row_count | int | |
| status | enum | previewed, confirmed, rolled_back |

Allows undoing a bad import in one click.

### 4.10 `attachments` *(v2)*
| Field | Type | Notes |
|---|---|---|
| id, user_id, transaction_id | uuid | |
| storage_path | text | private storage bucket |
| mime_type, size_bytes | text / int | max 5 MB *(default)* |

### 4.11 Forecast data
No separate table. The forecast is calculated each time from:
- current account balances (accounts + cleared transactions)
- `recurring_rules` (future occurrences)
- `transactions` with status = planned
- `budgets` or past transactions (variable spending, per 2.7)

*(Optional later: a `forecast_snapshots` table saving the forecast monthly, to compare forecast vs actual and improve accuracy.)*

### 4.12 Relationships
```
users 1─* accounts
users 1─* categories ─* (parent) categories
users 1─* transactions *─1 accounts
                      *─1 categories
                      *─1 recurring_rules
                      *─1 import_batches
users 1─* budgets *─1 categories
users 1─* recurring_rules
users 1─* goals
```

### 4.13 Data that is NOT saved
- Google password (never seen by the app)
- Bank login details, full card/account numbers, CVV, PINs
- Raw uploaded CSV files after import is confirmed *(default: delete after 7 days)*

---

## 5. Data Rules — Validation, Retention, Backup

| Area | Rule |
|---|---|
| Validation | Enforced both in UI and in the database (constraints) |
| Soft delete | Recoverable for 30 days, then purged |
| Backups | Supabase free plan has no automatic backups → monthly full export (CSV/JSON) saved to Google Drive *(default)*. Upgrade to Supabase Pro (daily backups) if data volume or risk grows |
| Export | Full export available any time from Settings |
| Account deletion | All user data hard-deleted within 30 days; confirmation email sent |
| Audit | `created_at` / `updated_at` on all rows; full change log not in v1 |

---

## 6. Non-functional Requirements

- **Security:** HTTPS only; row-level security per user; secrets in environment variables, never in code/repo; dependency updates monthly
- **Performance:** dashboard loads in < 2 s with 10,000 transactions
- **Responsive:** usable on phone (390 px wide) — most entries will be on mobile
- **Accessibility:** readable contrast, labels on all form fields, keyboard navigable
- **Locale:** VND format 1.250.000 ₫; optional shorthand on charts (1,25 tr)

---

## 7. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Code repo | **GitHub** (private repo) | Never commit secrets; use `.env.local` + `.gitignore` |
| Hosting | **Vercel** | Auto-deploys from GitHub on every push; HTTPS included |
| Backend / DB / Auth | **Supabase** | Postgres database, Google sign-in, row-level security |
| Frontend | Next.js (React) *(default)* | Vercel's native framework |
| Charts | Recharts *(default)* | Forecast line chart, category breakdowns |

**Setup notes**
- Google sign-in: enable the Google provider in Supabase and restrict access to my Gmail address (stored as an environment variable, not in code)
- Supabase free plan pauses the project after a period of inactivity → regular use keeps it active; upgrade to Pro if pausing becomes a problem
- Supabase keys: only the public "anon" key goes to the browser; the service-role key is never exposed in frontend code

---

## 8. Release Plan

| Phase | Includes |
|---|---|
| v1 (MVP) | Google login, accounts, categories, transactions, dashboard, basic monthly report, CSV export |
| v1.1 | Budgets (with roll-over) + alerts, recurring transactions (pending), planned transactions, **cash flow forecast**, CSV import |
| v2 | Goals, attachments, tags, what-if forecasting, forecast vs actual, multi-currency, 2FA, shared household |

*Forecast sits in v1.1 because it depends on recurring rules and budgets being in place first.*

---

## 9. Decisions Log

| # | Decision | Options | Chosen | Date |
|---|---|---|---|---|
| 1 | Target users (1.2) | Just me / Household / Public | Just me | 19/10/2026 |
| 2 | Base currency (2.4) | VND / AUD / other | VND | 19/10/2026 |
| 3 | Login method (2.2) | Email+password / Magic link / Google | Google (Gmail), persistent session | 19/10/2026 |
| 4 | 2FA (2.2) | Required / Optional / Later | Later (rely on Google 2-Step Verification) | 19/10/2026 |
| 5 | Budget rollover (2.5) | Reset / Roll over | Roll over | 19/10/2026 |
| 6 | Recurring behaviour (2.6) | Auto-create / Pending | Pending | 19/10/2026 |
| 7 | Goals & attachments in v1? | Yes / Later | Later (v2) | 19/10/2026 |
| 8 | Tech stack (7) | — | GitHub + Vercel + Supabase | 19/10/2026 |
| 9 | Forecast: variable spending method (2.7) | Budget / 3-month history / None | Budget | 19/10/2026 |
| 10 | Forecast horizon (2.7) | 3 / 6 / 12 months | 3 months | 19/10/2026 |
| 11 | Credit cards used? (2.7) | Yes / No | Yes — timed to payment due date | 19/10/2026 |
