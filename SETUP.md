# Setup & Running Guide (Nhost)

## Prerequisites

```bash
node --version   # 18+
adb devices      # phone connected via USB
```

---

## Step 1: Create Nhost project

1. Go to [app.nhost.io](https://app.nhost.io) → **New Project**
2. Choose a region (e.g. `ap-south-1` for India)
3. Wait for provisioning (~1 min)
4. Note your **Subdomain** and **Region** from the project dashboard

---

## Step 2: Run the database schema

1. In the Nhost dashboard → **Hasura** → open Hasura Console
2. Go to **Data** tab → **SQL** (bottom of left sidebar)
3. Paste and run `nhost_schema.sql` (in this repo)
4. This creates all tables, indexes, enums, and the balance update function

---

## Step 3: Track tables and set up Hasura permissions

After running SQL, Hasura needs to track the tables and configure permissions.

### 3a. Track all tables

In Hasura Console → **Data** → your database → **public** schema:
- Click **Track All** to track all untracked tables

### 3b. Set up object relationships (for joined queries)

In Hasura Console → **Data** → **transactions** table → **Relationships** tab:

Add these **Object Relationships** manually:

| Name | From column | To table | To column |
|------|-------------|----------|-----------|
| `category` | `category_id` | `categories` | `id` |
| `from_account` | `from_account_id` | `accounts` | `id` |
| `to_account` | `to_account_id` | `accounts` | `id` |

For **cc_statements** table → **Relationships** tab:

| Name | From column | To table | To column |
|------|-------------|----------|-----------|
| `account` | `account_id` | `accounts` | `id` |

> These relationship names are used directly in GraphQL queries. If you name them differently, update the queries in the hooks.

### 3c. Set row-level permissions

For **each table** (`profiles`, `accounts`, `categories`, `transactions`, `cc_statements`, `recurring_transactions`):

1. Go to the table → **Permissions** tab
2. Add role: `user`
3. For **select**, **insert**, **update**, **delete**:
   - Set row filter: `{"user_id": {"_eq": "X-Hasura-User-Id"}}`
   - Allow all columns (or specific columns as needed)

For `profiles` table specifically:
- The filter should be: `{"id": {"_eq": "X-Hasura-User-Id"}}`
  (because the PK is `id`, not `user_id`)

> Nhost automatically configures the JWT with `x-hasura-user-id` from the logged-in user.
> The `user` role is automatically assigned to authenticated Nhost users.

---

## Step 4: Environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```
EXPO_PUBLIC_NHOST_SUBDOMAIN=abcdefgh      # from Nhost dashboard
EXPO_PUBLIC_NHOST_REGION=ap-south-1      # your project region
```

---

## Step 5: Phone setup (one-time)

On your Android phone:

1. **Settings → About phone** → tap **Build number** 7 times
2. **Settings → Developer options** → enable **USB Debugging**
3. Plug in USB → accept the debugging prompt on your phone

Verify:
```bash
adb devices
# should show: XXXXXXX   device
```

If it shows `unauthorized`, unplug → replug → accept the popup on your phone.

---

## Step 6: Install and run

```bash
npm install
npx expo start --android
```

First run takes ~1–2 min to bundle. Press `a` if the app doesn't open automatically.

---

## Step 7: First use

1. Sign up with any email + password
2. The onboarding screen appears — enter your name (optional)
3. Tap **Set up my tracker** — this creates:
   - HDFC Master, SBI, Federal Bank, Cash, Credit Card accounts
   - All default spending categories
4. Dashboard loads — you're in

---

## Common issues

### App crashes on start — "Missing env vars"
- Check `.env` has both `EXPO_PUBLIC_NHOST_SUBDOMAIN` and `EXPO_PUBLIC_NHOST_REGION`
- Restart Metro: `npx expo start --android --clear`

### Login works but queries fail / empty data
- Make sure you tracked all tables in Hasura
- Make sure permissions are set for the `user` role
- Check Hasura Console → **API** tab — try running a query to test

### Relationship names don't work in queries (GraphQL error)
- The relationship names in Hasura must match exactly:
  `category`, `from_account`, `to_account`, `account`
- Check the **Relationships** tab for each table in Hasura Console

### `adb: command not found`
```bash
sudo apt install adb    # Ubuntu/Debian
```

### Metro bundler port conflict
```bash
npx expo start --android --port 8082
```

---

## EAS build (standalone APK, for later)

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile preview
```

For EAS, add env vars in `eas.json`:

```json
{
  "build": {
    "preview": {
      "env": {
        "EXPO_PUBLIC_NHOST_SUBDOMAIN": "abcdefgh",
        "EXPO_PUBLIC_NHOST_REGION": "ap-south-1"
      }
    }
  }
}
```

> Don't commit `eas.json` with these values. Use EAS Secrets for production.

---

## Daily dev workflow

```bash
adb devices                     # confirm phone connected
npx expo start --android        # start app
# shake phone → dev menu for reload / inspector
```
