# Bubble.io Data Import Guide — BookLeaf Dataset

This guide provides two reliable ways to load the 10-author, 18-book BookLeaf dataset into your Bubble application:
1. **Method 1 (Recommended): Automated Seeding via Data API** using `scripts/seed-bubble.mjs`.
2. **Method 2: Manual CSV Upload** using Bubble's built-in Data tab import tool.

---

## Method 1: Automated Seeding via Data API (Recommended)

This method takes ~30 seconds, creates all relational linkages automatically, and runs an automated verification check against the assignment's invariant rules.

### Prerequisites:
1. Complete Sections 1, 2, and 3 of [bubble/BUILD_GUIDE.md](file:///d:/Assignments/BookLeaf/bubble/BUILD_GUIDE.md):
   - Option sets created.
   - Data types (`author`, `book`, `payout`, `notificationlog`, `appsettings`) and fields created in `lowercase_snake_case`.
2. Enable the Data API in Bubble:
   - Go to **Settings → API**.
   - Check **Enable Data API**.
   - Under *Data types exposed as Data API*, check:
     - [x] `author`
     - [x] `book`
     - [x] `payout`
     - [x] `notificationlog`
     - [x] `appsettings`
   - Click **Generate a new API token** and name it `Seeding and n8n`. Copy the generated token string.
3. Configure your local `.env`:
   ```bash
   cp .env.example .env
   ```
   Add your Bubble App name and token:
   ```env
   BUBBLE_APP_NAME=your-bubble-app-name
   BUBBLE_API_TOKEN=your_generated_token_here
   ```

### Run Dry Run First:
```bash
node scripts/seed-bubble.mjs --dry-run
```
This parses `data/bookleaf_sample_data.json`, computes all denormalised author totals, and validates all invariants without modifying Bubble.

### Run Live Seeding:
```bash
node scripts/seed-bubble.mjs
```
The script will:
1. Check existing records (idempotent: skips or updates existing `author_code`/`book_code`).
2. Create/update the single `appsettings` record (`as_of_date: 2025-12-15`, `min_payout: 1000`, etc.).
3. Insert all 10 `author` records and record their Bubble `_id` values.
4. Insert all 18 `book` records, automatically linking each to its parent `author._id` and mapping platforms.
5. Insert `payout` records for each book where `royalty_paid > 0`, referencing both `author._id` and `book._id`.
6. Print a comprehensive verification table matching Section 2 of the assignment brief.

---

## Method 2: Manual CSV Upload via Bubble Editor

If you prefer not to use the API or are working offline, use the prepared CSV files in `bubble/import/`:
- [bubble/import/authors.csv](file:///d:/Assignments/BookLeaf/bubble/import/authors.csv)
- [bubble/import/books.csv](file:///d:/Assignments/BookLeaf/bubble/import/books.csv)
- [bubble/import/payouts.csv](file:///d:/Assignments/BookLeaf/bubble/import/payouts.csv)
- [bubble/import/appsettings.csv](file:///d:/Assignments/BookLeaf/bubble/import/appsettings.csv)

### Important Import Order (Relational Dependency):
Bubble requires referenced records to exist before you can link them. Follow this exact sequence:

```
Step 1: Option Sets (manual in editor)
   ↓
Step 2: Upload authors.csv (creates authors)
   ↓
Step 3: Export author table to get Bubble's internal Unique IDs
   ↓
Step 4: Upload books.csv (links to author Unique ID)
   ↓
Step 5: Upload payouts.csv (links to author & book Unique IDs)
   ↓
Step 6: Upload appsettings.csv
```

### Detailed Steps for Manual CSV Import:

#### 1. Import `authors.csv`
1. In Bubble, open **Data → App data**.
2. Select the `All authors` view.
3. Click **Upload** (top right of table).
4. Select `bubble/import/authors.csv`.
5. Map columns:
   - `author_code` → `author_code` (text)
   - `name` → `name` (text)
   - `email` → `email` (text)
   - `phone` → `phone` (text)
   - `city` → `city` (text)
   - `joined_date` → `joined_date` (date)
   - `total_books` → `total_books` (number)
   - `total_earned` → `total_earned` (number)
   - `total_paid` → `total_paid` (number)
   - `total_pending` → `total_pending` (number)
   - `payout_status` → `payout_status` (option set `payout_filter`)
6. Click **Validate data** → **Upload data**. Confirm 10 records are created.

#### 2. Link Books to Authors
1. In **Data → App data → All authors**, click **Export** to download a CSV containing Bubble's generated `unique_id` column alongside `author_code`.
2. In `bubble/import/books.csv`, replace the `author_code` column with the corresponding `unique_id` (or use Bubble's import mapper to match by field if your plan supports it).
3. Under **All books**, click **Upload** and select `bubble/import/books.csv`.
4. Map columns:
   - `book_code` → `book_code` (text)
   - `author_code` (or `author`) → `author` (type `author`)
   - `title` → `title` (text)
   - `isbn` → `isbn` (text)
   - `genre` → `genre` (text)
   - `publication_date` → `publication_date` (date)
   - `status_text` → `status_text` (text)
   - `book_state` → `book_state` (option set)
   - `mrp` → `mrp` (number)
   - `royalty_per_copy` → `royalty_per_copy` (number)
   - `copies_sold` → `copies_sold` (number)
   - `royalty_earned` → `royalty_earned` (number)
   - `royalty_paid` → `royalty_paid` (number)
   - `royalty_pending` → `royalty_pending` (number)
   - `last_payout_date` → `last_payout_date` (date)
   - `print_partner` → `print_partner` (option set)
   - `platforms` → `platforms` (list of `platform` option sets; Bubble accepts JSON array strings e.g. `["Amazon India", "Flipkart"]`)
5. Validate and Upload. Confirm 18 records are created.

#### 3. Import `payouts.csv`
1. Under **All payouts**, click **Upload** and choose `bubble/import/payouts.csv`.
2. Map `author`, `book`, `amount`, `payout_date`, `is_cumulative`, `notes`.
3. Validate and Upload. Confirm 12 records are created (one for each published book with `royalty_paid > 0`).

#### 4. Import `appsettings.csv`
1. Under **All appsettings**, click **Upload** and choose `bubble/import/appsettings.csv`.
2. Map `as_of_date`, `overdue_days`, `min_payout`, `apply_min_threshold`, `n8n_timeout_seconds`.
3. Validate and Upload. Confirm 1 record exists.

---

## Common CSV Import Pitfalls & Solutions

1. **"Could not parse date"**: Bubble requires dates in ISO format (`YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ss.sssZ`). All dates in `bubble/import/` are pre-formatted to ISO standards.
2. **"Empty values for in-production books"**: In-production books (BK013, BK015) have empty values for publication date, MRP, and royalty per copy. Ensure Bubble's import mapper leaves these as empty rather than converting to `0`.
3. **"Option set matching"**: Option set values are case-sensitive. They must match the exact display text (e.g. `"Published"`, `"In-House"`, `"Repro India"`).
4. **"List of platforms"**: Bubble parses lists of option sets when enclosed in brackets with quoted strings: `["Amazon India", "Flipkart", "BookLeaf Store"]`.
