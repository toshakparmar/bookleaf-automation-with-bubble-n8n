# Bubble.io Step-by-Step Build Guide — BookLeaf Author Royalty System

> **Audience**: Candidate or reviewer building the application in Bubble.io from scratch.  
> **Estimated build time**: ~2.5 to 3.5 hours following this structured guide.  
> **Guiding Principle**: *"Database design and workflows first, UI polish second."*

---

## Table of Contents
1. [Stage 0: App Creation & Pre-Flight Settings](#stage-0-app-creation--pre-flight-settings)
2. [Stage 1: Option Sets Setup](#stage-1-option-sets-setup)
3. [Stage 2: Database Schema & Fields](#stage-2-database-schema--fields)
4. [Stage 3: Privacy Rules Setup](#stage-3-privacy-rules-setup)
5. [Stage 4: API Connector Plugin Configuration](#stage-4-api-connector-plugin-configuration)
6. [Stage 5: Dataset Seeding](#stage-5-dataset-seeding)
7. [Stage 6: Page-by-Page UI Construction](#stage-6-page-by-page-ui-construction)
8. [Stage 7: Workflows, Conditionals & Idempotency](#stage-7-workflows-conditionals--idempotency)
9. [Stage 8: Test Accounts & Submission Readiness](#stage-8-test-accounts--submission-readiness)

---

## Stage 0: App Creation & Pre-Flight Settings

1. Log in to [Bubble.io](https://bubble.io) and click **Create an app**.
   - App name: `bookleaf-author-portal` (or similar).
   - Template: Start from scratch (do not use any template).
2. Go to **Settings → General**:
   - Primary language: `English`.
3. Go to **Settings → API**:
   - Check **Enable Data API**.
   - In the checklist of exposed data types, you will enable `author`, `book`, `payout`, `notificationlog`, and `appsettings` once they are created in Stage 2.
   - Click **Generate a new API token**.
   - Label: `BookLeaf Automation Key`.
   - **Copy and save this token** into your local `.env` (`BUBBLE_API_TOKEN`).
4. Note your test URL format:
   `https://<your-app-name>.bubbleapps.io/version-test/`

> **Checkpoint**: You have a fresh Bubble app with Data API enabled and an admin API token saved.

---

## Stage 1: Option Sets Setup

Navigate to **Data → Option sets**. Create the following 8 Option Sets:

### 1. `role`
- Options: `Author`, `Admin`

### 2. `book_state`
- Options: `Published`, `In production`

### 3. `print_partner`
- Options: `In-House`, `Repro India`, `Epitome Books`

### 4. `platform`
- Options: `Amazon India`, `Flipkart`, `Amazon US`, `Amazon UK`, `BookLeaf Store`

### 5. `notif_status`
- Create an attribute: `badge_color` (Type: `text`).
- Options & Attributes:
  - `Pending` → `badge_color`: `#F59E0B`
  - `Processing` → `badge_color`: `#3B82F6`
  - `Success` → `badge_color`: `#10B981`
  - `Failed` → `badge_color`: `#EF4444`
  - `Duplicate` → `badge_color`: `#6B7280`

### 6. `trigger_type`
- Options: `Single`, `Bulk`

### 7. `royalty_status`
- Create two attributes:
  - `color` (Type: `text`)
  - `badge_text` (Type: `text`)
- Options & Attributes:
  - `Paid up` → `color`: `#10B981`, `badge_text`: `Paid up`
  - `Within cycle` → `color`: `#F59E0B`, `badge_text`: `Pending — within normal cycle`
  - `Rolls over` → `color`: `#F59E0B`, `badge_text`: `Below ₹1,000 minimum — rolls over`
  - `Overdue` → `color`: `#EF4444`, `badge_text`: `Overdue`
  - `In production` → `color`: `#6B7280`, `badge_text`: `In production`

### 8. `payout_filter`
- Options: `All`, `Fully paid`, `Pending`, `Overdue`

> **Checkpoint**: In **Data → Option sets**, you should now see 8 Option Sets with the specified attributes.

---

## Stage 2: Database Schema & Fields

Navigate to **Data → Data types**. Use exact **`lowercase_snake_case` with NO spaces** for all names.

### 1. Type: `User` (built-in)
- Add field: `role` → Type: `role` (Option set), List: `no`
- Add field: `author` → Type: `author` (create this after creating the `author` type), List: `no`

### 2. Create Type: `author`
- `author_code` → Type: `text`
- `name` → Type: `text`
- `email` → Type: `text`
- `phone` → Type: `text`
- `city` → Type: `text`
- `joined_date` → Type: `date`
- `user` → Type: `User`
- `total_books` → Type: `number`
- `total_earned` → Type: `number`
- `total_paid` → Type: `number`
- `total_pending` → Type: `number`
- `payout_status` → Type: `payout_filter` (Option set)

### 3. Create Type: `book`
- `book_code` → Type: `text`
- `author` → Type: `author`
- `title` → Type: `text`
- `isbn` → Type: `text`
- `genre` → Type: `text`
- `publication_date` → Type: `date`
- `status_text` → Type: `text`
- `book_state` → Type: `book_state` (Option set)
- `mrp` → Type: `number`
- `royalty_per_copy` → Type: `number`
- `copies_sold` → Type: `number`
- `royalty_earned` → Type: `number`
- `royalty_paid` → Type: `number`
- `royalty_pending` → Type: `number`
- `last_payout_date` → Type: `date`
- `print_partner` → Type: `print_partner` (Option set)
- `platforms` → Type: `platform` (Option set), **Check "This field is a list"**

### 4. Create Type: `payout`
- `author` → Type: `author`
- `book` → Type: `book`
- `amount` → Type: `number`
- `payout_date` → Type: `date`
- `is_cumulative` → Type: `yes / no`
- `notes` → Type: `text`

### 5. Create Type: `notificationlog`
- `author` → Type: `author`
- `triggered_by` → Type: `User`
- `trigger_type` → Type: `trigger_type` (Option set)
- `status` → Type: `notif_status` (Option set)
- `requested_at` → Type: `date`
- `completed_at` → Type: `date`
- `email_subject` → Type: `text`
- `email_body` → Type: `text`
- `error_message` → Type: `text`
- `error_step` → Type: `text`
- `n8n_execution_id` → Type: `text`
- `ai_model` → Type: `text`
- `email_sent_to_test` → Type: `yes / no`
- `retry_of` → Type: `notificationlog`
- `duplicate_of` → Type: `text`

### 6. Create Type: `appsettings`
- `as_of_date` → Type: `date`
- `overdue_days` → Type: `number`
- `min_payout` → Type: `number`
- `apply_min_threshold` → Type: `yes / no`
- `n8n_timeout_seconds` → Type: `number`

> **Checkpoint**: Go back to **Settings → API → Data types exposed as Data API** and ensure `author`, `book`, `payout`, `notificationlog`, and `appsettings` are all checked.

---

## Stage 3: Privacy Rules Setup

Navigate to **Data → Privacy**. Configure each data type to prevent data leakage:

### 1. `author`
- Under **Everyone else**: Uncheck everything (no permissions).
- Click **Define a new rule**:
  - Name: `Admin Full Access`
  - Condition: `Current User's role is Admin`
  - Permissions: Check all (View all fields, Find in searches).
- Click **Define a new rule**:
  - Name: `Author Own Data`
  - Condition: `This author's user is Current User`
  - Permissions: Check all (View all fields, Find in searches).

### 2. `book`
- Under **Everyone else**: Uncheck everything.
- Rule 1: `Admin Full Access` → `Current User's role is Admin` → Check all.
- Rule 2: `Author Own Books` → `This book's author's user is Current User` → Check all.

### 3. `payout`
- Under **Everyone else**: Uncheck everything.
- Rule 1: `Admin Full Access` → `Current User's role is Admin` → Check all.
- Rule 2: `Author Own Payouts` → `This payout's author's user is Current User` → Check all.

### 4. `notificationlog`
- Under **Everyone else**: Uncheck everything.
- Rule 1: `Admin Full Access` → `Current User's role is Admin` → Check all.

### 5. `appsettings`
- Under **Everyone else**: Uncheck everything.
- Rule 1: `Logged In Read Access` → `Current User is logged in` → Check: View `as_of_date`, `overdue_days`, `min_payout`, `apply_min_threshold`, and Find in searches.

### 6. `User`
- Under **Everyone else**: Uncheck everything.
- Rule 1: `Admin Full Access` → `Current User's role is Admin` → Check all.
- Rule 2: `Self Access` → `This User is Current User` → Check all.

> **Checkpoint**: Authors cannot query or see any other author's books, payouts, or notification logs in repeating groups or via network requests.

---

## Stage 4: API Connector Plugin Configuration

1. In Bubble, go to **Plugins → Add Plugins**. Search for **API Connector** (by Bubble) and click **Install**.
2. Click **Add another API**:
   - API Name: `BookLeaf Automation`
   - Authentication: `None or self-handled`
3. Click **Add a shared header**:
   - Key: `Content-Type`
   - Value: `application/json`
4. Add another shared header:
   - Key: `X-BookLeaf-Key`
   - Value: `bookleaf-n8n-secret-key-2026` (or your chosen secret)
   - **IMPORTANT**: Check the **Private** checkbox! (This prevents the secret key from being exposed to the client browser).
5. Configure the API Call:
   - Call name: `trigger_royalty_summary`
   - Use as: `Action`
   - Data type: `JSON`
   - Method: `POST`
   - URL: `https://<YOUR_N8N_URL>/webhook/royalty-summary` (or your local ngrok/tunnel URL)
   - Body type: `JSON`
   - Body:
     ```json
     {
       "logId": "<logId>",
       "authorId": "<authorId>",
       "authorCode": "<authorCode>",
       "triggerType": "<triggerType>",
       "triggeredByEmail": "<triggeredByEmail>",
       "requestedAt": "<requestedAt>"
     }
     ```
   - Parameter values table:
     - `logId`: `sample_log_123` (Private: uncheck)
     - `authorId`: `sample_author_123` (Private: uncheck)
     - `authorCode`: `AUTH001` (Private: uncheck)
     - `triggerType`: `Single` (Private: uncheck)
     - `triggeredByEmail`: `admin@bookleafpub.in` (Private: uncheck)
     - `requestedAt`: `2026-11-04T10:00:00Z` (Private: uncheck)
   - **CRITICAL**: Check **Include errors in response and allow workflow to continue**. (This is essential so Bubble doesn't crash if n8n is offline, and allows Bubble workflows to handle 4xx/5xx responses).
6. Click **Initialize call** (ensure your n8n workflow or mock harness is listening; or click Save if using mock values).

> **Checkpoint**: API Connector has `trigger_royalty_summary` registered as a workflow Action.

---

## Stage 5: Dataset Seeding

Run the automated seeder script from your terminal:
```bash
node scripts/seed-bubble.mjs
```
*Alternatively, follow [bubble/IMPORT.md](file:///d:/Assignments/BookLeaf/bubble/IMPORT.md) to upload the CSV files manually.*

Verify in **Data → App data**:
- `All authors`: 10 rows
- `All books`: 18 rows
- `All payouts`: 12 rows
- `All appsettings`: 1 row (as_of_date = `2025-12-15`)

---

## Stage 6: Page-by-Page UI Construction

Create the following 6 pages in the Bubble editor. Use clean containers (Column / Row layout):

### Page 1: `index` (Login)
- Simple, centered card container.
- Elements:
  - Logo / Header: "BookLeaf Author & Operations Portal"
  - Input: `Input Email` (Content format: Email)
  - Input: `Input Password` (Content format: Password)
  - Button: `Log in`
    - Workflow: `Account → Log the user in` (Email: `Input Email's value`, Password: `Input Password's value`).
    - Next Step: `Navigation → Go to page`
      - Destination: `admin_authors` *Only when Current User's role is Admin*
      - Destination: `author_dashboard` *Only when Current User's role is Author*
  - Text link: "Don't have an account? Sign up" → navigates to `signup`.

### Page 2: `signup` (Author Registration)
- Card container:
  - Header: "Author Portal Registration"
  - Inputs: `Input Name`, `Input Email`, `Input Password`.
  - Button: `Register as Author`
  - Workflow:
    - Step 1: `Account → Sign the user up` (sets email & password).
    - Step 2: `Data → Make changes to current user`:
      - `role` = `Author`
      - `author` = `Search for authors:first item` (Constraint: `email = Input Email's value`).
    - Step 3: `Data → Make changes to a thing`:
      - Thing to change: `Current User's author`
      - `user` = `Current User`
    - Step 4: `Navigation → Go to page author_dashboard`.

### Page 3: `author_dashboard` (Author Portal)
- Page Workflow on Page Load: *Only when Current User is logged out* → `Go to page index`. *Only when Current User's role is Admin* → `Go to page admin_authors`.
- Header bar:
  - "BookLeaf Author Portal"
  - Welcome text: `"Welcome back, " + Current User's author's name`
  - Button: `Log out` (`Account → Log the user out` → `Go to page index`).
- Summary Stats Banner (Row of 4 Cards):
  - Card 1: **Total Books**: `Current User's author's total_books`
  - Card 2: **Total Earned**: `₹ + Current User's author's total_earned:formatted as 1,23,456`
  - Card 3: **Total Paid**: `₹ + Current User's author's total_paid:formatted as 1,23,456`
  - Card 4: **Pending Balance**: `₹ + Current User's author's total_pending:formatted as 1,23,456`
- Section: **My Books**:
  - Repeating Group: `RepeatingGroup Books`
    - Type of content: `book`
    - Data source: `Search for books` (Constraint: `author = Current User's author`).
  - Inside each row/card of the Repeating Group:
    - Title: `Current cell's book's title`
    - ISBN: `Current cell's book's isbn` (if empty: `"Not yet assigned"`)
    - Genre: `Current cell's book's genre`
    - Status Badge: Conditional styling based on §2:
      - When `Current cell's book's book_state is In production`:
        - Background: `#6B7280` (Grey), Text: `Current cell's book's status_text`
      - When `Current cell's book's royalty_pending is 0` and `Current cell's book's book_state is Published`:
        - Background: `#10B981` (Green), Text: `Paid up`
      - When `Current cell's book's royalty_pending > 0` and `Current cell's book's royalty_pending < Search for appsettings's first item's min_payout`:
        - Background: `#F59E0B` (Yellow), Text: `Below ₹1,000 minimum — rolls over`
      - When `Current cell's book's royalty_pending > 0` and `Current cell's book's last_payout_date < (Search for appsettings's first item's as_of_date +(days): -90)`:
        - Background: `#EF4444` (Red), Text: `Overdue`
      - Default / Else:
        - Background: `#F59E0B` (Yellow), Text: `Pending — within normal cycle`
    - Details Grid:
      - Publication Date: `Current cell's book's publication_date:formatted as 14 Nov 2025` (or `"Not yet set"`)
      - MRP: `₹ + Current cell's book's mrp` (or `"Not yet set"`)
      - Copies Sold: `Current cell's book's copies_sold`
      - Royalty Earned: `₹ + Current cell's book's royalty_earned`
      - Royalty Paid: `₹ + Current cell's book's royalty_paid`
      - Royalty Pending: `₹ + Current cell's book's royalty_pending`
      - Last Payout: `Current cell's book's last_payout_date:formatted as 14 Nov 2025` (or `"No payout yet"`)
      - Platforms: List of tags displaying `Current cell's book's platforms:each item`

### Page 4: `admin_authors` (Admin Overview)
- Page Load: Redirect non-admins to `index`.
- Header: "BookLeaf Operations — Author Management"
- Top Action Bar:
  - Search input: `Input Search Name` (Placeholder: "Search by author name...")
  - Dropdown: `Dropdown City` (Dynamic choices: `Search for authors:each item's city:unique elements`, Default: "All Cities")
  - Dropdown: `Dropdown Status` (Static choices: `All`, `Fully paid`, `Pending`, `Overdue`, Default: "All")
  - Button: `Bulk Trigger Royalty Summaries`
    - Label: `"Trigger Summaries for All Pending (" + Search for authors (Constraint: total_pending > 0):count + ")"`
    - Workflow: Triggers custom event `bulk_trigger_recursive` (detailed in Stage 7).
  - Navigation Buttons: `Notification Log` (links to `admin_notifications`), `Settings` (links to `admin_settings`).
- Author Overview Repeating Group:
  - Type: `author`
  - Data source: `Search for authors`
    - Constraint 1: `name contains Input Search Name's value` (Ignore empty constraints: checked)
    - Constraint 2: `city = Dropdown City's value` (Only when Dropdown City is not empty)
    - Constraint 3: `payout_status = Dropdown Status's value` (Only when Dropdown Status is not "All")
  - Columns:
    - Author Name: `Current cell's author's name`
    - City: `Current cell's author's city`
    - Total Books: `Current cell's author's total_books`
    - Total Earned: `₹ + Current cell's author's total_earned`
    - Total Pending: `₹ + Current cell's author's total_pending`
    - Payout Status Badge:
      - If `Overdue`: Red (`#EF4444`)
      - If `Pending`: Yellow (`#F59E0B`)
      - If `Fully paid`: Green (`#10B981`)
    - Action: Button `View Details` → `Go to page admin_author_detail` (Send parameter: `author = Current cell's author's unique_id`).

### Page 5: `admin_author_detail` (Author Detail & Trigger)
- URL Parameter: `author` (Type: `text`).
- Data Source of Page / Group: `Search for authors:first item` (Constraint: `unique_id = Get author from page URL`).
- Author Profile Header Card:
  - Name, Code (`AUTH001`), Email, Phone, City, Joined Date.
  - Total Earned, Total Paid, Total Pending.
- **Action Section — Trigger Royalty Summary**:
  - Button: `Button Trigger Summary`
    - Text:
      - Default: `"Generate & Send Royalty Summary"`
      - When in-flight log exists: `"Generating... (n8n running)"` (Button is disabled)
      - When last log failed: `"Generation Failed — Click to Retry"`
      - When timed out: `"Timed out — Click to Retry"`
    - Condition to Disable Button:
      - `Search for notificationlogs (Constraints: author = Current Page's author, status in [Pending, Processing], requested_at > Current date/time +(seconds): -180):count > 0`
    - Workflow: See Stage 7 (Single Trigger Workflow).
  - Inline Alert / Status Banner:
    - Shows latest `notificationlog` status for this author.
    - If `Processing`: Spinner + "n8n automation is processing royalty figures and AI summary..."
    - If `Success`: Green banner + "Summary generated successfully at [completed_at]!"
    - If `Failed`: Red banner + "Error: [error_message] ([error_step])"
- Tab 1: **Books**:
  - Repeating group of `book` (same rich details as author dashboard).
- Tab 2: **Payout History**:
  - Repeating group of `payout` (Constraint: `author = Current Page's author`).
  - Columns: Book Title, Amount (`₹ + amount`), Payout Date (`15 Oct 2025`), Notes (`"Total paid to date (last payout on 15 Oct 2025)"`).

### Page 6: `admin_notifications` (Audit Log)
- Header: "Royalty Summary Notification Log"
- Filter dropdown: Status (`All`, `Pending`, `Processing`, `Success`, `Failed`, `Duplicate`).
- Repeating Group: `notificationlog`
  - Data source: `Search for notificationlogs` sorted by `requested_at` descending.
  - Columns:
    - Author: `Current cell's notificationlog's author's name`
    - Trigger Type: `Current cell's notificationlog's trigger_type`
    - Requested At: `Current cell's notificationlog's requested_at:formatted as 14 Nov 2025 15:30:00`
    - Status Badge: Color from `status's badge_color`.
    - AI Model: `Current cell's notificationlog's ai_model`
    - Error / Result Summary: `Current cell's notificationlog's error_message` (or "Success")
    - Action: Button `View Email`
      - Shows `Popup Email Details` containing:
        - Subject: `email_subject`
        - Full AI-Generated Body: `email_body`
        - Audit ID: `n8n_execution_id`

### Page 7: `admin_settings` (Simulation & Recalculation)
- Inputs:
  - `Input As Of Date` (Date Picker: defaults to `Search for appsettings's first item's as_of_date` or `2025-12-15`).
  - `Input Overdue Days` (Number: 90).
  - `Input Min Payout` (Number: 1000).
  - `Checkbox Threshold` (Toggle: yes).
  - `Input Timeout Seconds` (Number: 180).
- Button `Save Settings`:
  - Workflow: `Make changes to Search for appsettings's first item`.
- Button `Recalculate All Author Stats`:
  - Workflow: Runs recursive custom event recalculating `total_earned`, `total_paid`, `total_pending`, and `payout_status` for all authors based on the updated `as_of_date`.

---

## Stage 7: Workflows, Conditionals & Idempotency

### 7.1 Single Trigger Summary Workflow (`Button Trigger Summary`)
- **Step 1: Client-Side Idempotency Guard**:
  - Button conditional: Disabled when `Search for notificationlogs (author = Current Page's author, status in [Pending, Processing], requested_at > Current date/time +(seconds): -180):count > 0`.
- **Step 2: Create `notificationlog`**:
  - `Data → Create a new thing`:
    - Type: `notificationlog`
    - `author` = `Current Page's author`
    - `triggered_by` = `Current User`
    - `trigger_type` = `Single`
    - `status` = `Pending`
    - `requested_at` = `Current date/time`
- **Step 3: Call API Connector**:
  - `Plugins → BookLeaf Automation - trigger_royalty_summary`:
    - `logId` = `Result of step 2's unique_id`
    - `authorId` = `Current Page's author's unique_id`
    - `authorCode` = `Current Page's author's author_code`
    - `triggerType` = `"Single"`
    - `triggeredByEmail` = `Current User's email`
    - `requestedAt` = `Current date/time:formatted as ISO`
- **Step 4: Error Handling**:
  - *Only when Step 3's returned_an_error is yes*:
    - `Data → Make changes to thing`:
      - Thing: `Result of step 2` (the notificationlog)
      - `status` = `Failed`
      - `error_message` = `"Could not reach automation service (n8n offline or unreachable)"`
      - `error_step` = `"Bubble Webhook Dispatch"`
      - `completed_at` = `Current date/time`
    - Show Toast Alert: `"Failed to reach automation service. Please verify n8n is running."`

### 7.2 Bulk Trigger Frontend Recursive Custom Event
*Since backend workflows are not available on Bubble's Free plan, bulk triggering is executed via a clean frontend recursive event with throttling.*

1. Create a Custom Event on `admin_authors`: `process_author_queue`
   - Parameter: `remaining_authors` (Type: `author`, List: `yes`).
2. Event Actions:
   - **Step 1**: Only when `remaining_authors:count > 0`:
     - Create `notificationlog` (author: `remaining_authors:first item`, trigger_type: `Bulk`, status: `Pending`, requested_at: `Current date/time`).
   - **Step 2**: Only when `remaining_authors:count > 0`:
     - Call `trigger_royalty_summary` API Connector for `remaining_authors:first item`.
   - **Step 3**: Only when `remaining_authors:count > 1`:
     - `Custom → Trigger a custom event`:
       - Event: `process_author_queue`
       - `remaining_authors` = `remaining_authors:minus list (remaining_authors:first item)`
       - *Schedule*: 2 seconds later (prevents rate limiting and allows visual progress).
3. On click `Bulk Trigger Royalty Summaries` button:
   - Find all authors where `total_pending > 0`.
   - Trigger `process_author_queue` passing that list of authors.
   - Show progress bar / count toast: `"Triggered batch for 9 authors. Keep this window open."`

### 7.3 Timeout & Stale Log Handling (No Infinite Spinner)
- In `admin_author_detail` and `admin_notifications`, if a log remains in `Pending` or `Processing` and `Current date/time - requested_at > 180 seconds`:
  - The status badge displays **"Timed out"**.
  - A **"Retry"** button appears. Clicking it creates a new log with `retry_of = this log` and triggers the workflow again.
- In `admin_settings`, add a maintenance button **"Mark Stale Logs as Failed"**:
  - `Data → Make changes to a list of things`:
    - List: `Search for notificationlogs (status in [Pending, Processing], requested_at < Current date/time +(seconds): -180)`
    - `status` = `Failed`
    - `error_message` = `"Execution timed out without callback from automation service"`
    - `completed_at` = `Current date/time`

---

## Stage 8: Test Accounts & Submission Readiness

1. Create test user accounts in **Data → App data → All Users**:
   - **Admin Account**:
     - Email: `admin@bookleafpub.in`
     - Role: `Admin`
   - **Author 1 (Pending)**:
     - Email: `priya.sharma@email.com`
     - Role: `Author`
     - Linked `author`: Priya Sharma (`AUTH001`)
   - **Author 2 (Overdue)**:
     - Email: `rohit.kapoor@email.com`
     - Role: `Author`
     - Linked `author`: Rohit Kapoor (`AUTH002`)
   - **Author 3 (Fully Paid)**:
     - Email: `farhan.sheikh@email.com`
     - Role: `Author`
     - Linked `author`: Farhan Sheikh (`AUTH008`)
2. Go to **Settings → Collaboration**:
   - Invite collaborator: `musavir@bookleafpub.in` as Editor / Admin.
3. Test isolation:
   - Log in as Priya (`priya.sharma@email.com`) → confirm you see only Priya's 2 books.
   - Navigate to `/admin_authors` → confirm automatic redirect away from admin pages.
   - Log in as Admin (`admin@bookleafpub.in`) → confirm full visibility, search filters, and trigger buttons.
