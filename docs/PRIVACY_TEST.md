# Privacy Rules & Author Data Isolation Verification Script

> **Assignment Requirement A4**: "Set up Bubble's privacy rules so that author-type users can only access their own data. Admin-type users can access all data. We will test this by logging in as different authors and verifying data isolation."

This document provides the exact verification script, test cases, URL tampering tests, and visual screenshot checklist for testing privacy rules.

---

## 1. Test Accounts Configuration

Ensure the following accounts exist in **Data → App data → All Users**:

| Account | Email | Password | Role | Linked Author Profile |
|---|---|---|---|---|
| **Author 1** | `priya.sharma@email.com` | `Priya@BookLeaf2026` | `Author` | Priya Sharma (`AUTH001`) |
| **Author 2** | `rohit.kapoor@email.com` | `Rohit@BookLeaf2026` | `Author` | Rohit Kapoor (`AUTH002`) |
| **Author 3** | `farhan.sheikh@email.com` | `Farhan@BookLeaf2026` | `Author` | Farhan Sheikh (`AUTH008`) |
| **Admin** | `admin@bookleafpub.in` | `Admin@BookLeaf2026` | `Admin` | None |

---

## 2. Isolation Verification Test Cases

### Test Case 1: Author Own Data Visibility (Priya Sharma)
1. Open Incognito window and navigate to the application login page (`/index`).
2. Log in as **Priya Sharma** (`priya.sharma@email.com`).
3. **Verify Dashboard Metrics**:
   - Header greeting: *"Welcome back, Priya Sharma"*
   - Total Books: `2`
   - Total Earned: `₹19,908`
   - Total Paid: `₹16,338`
   - Pending Balance: `₹3,570`
4. **Verify Books Repeating Group**:
   - Only 2 books are visible:
     - *Whispers of the Ganges* (BK001)
     - *The Saffron Diaries* (BK002)
   - Zero books from any other author appear.

### Test Case 2: Author Data Switching (Rohit Kapoor)
1. Log out from Priya's session.
2. Log in as **Rohit Kapoor** (`rohit.kapoor@email.com`).
3. **Verify Dashboard Metrics**:
   - Header greeting: *"Welcome back, Rohit Kapoor"*
   - Total Books: `2`
   - Total Earned: `₹84,024`
   - Total Paid: `₹71,000`
   - Pending Balance: `₹13,024`
4. **Verify Books Repeating Group**:
   - Only Rohit's 2 books are visible:
     - *Code & Karma* (BK003) — Status Badge: **Overdue** (Red)
     - *Startup Sutra* (BK004) — Status Badge: **Pending** (Yellow)
   - Priya's books (*Whispers of the Ganges*, etc.) are completely absent.

### Test Case 3: URL Parameter Tampering Defense
1. While logged in as Priya (`priya.sharma@email.com`), copy the unique ID of Rohit Kapoor's author record from your database (or use Rohit's known ID).
2. Attempt to tamper with the URL by appending Rohit's ID:
   ```
   https://<app>.bubbleapps.io/version-test/author_dashboard?author=<ROHIT_ID>
   ```
3. **Expected Behavior**:
   - The dashboard continues to display strictly Priya's metrics and Priya's 2 books because the data source is bound to `Current User's author`, and Bubble's server privacy rules reject fetching books where `author's user != Current User`.

### Test Case 4: Route Protection & Admin Page Redirection
1. While logged in as an Author (Priya or Rohit), attempt to open an internal admin page directly in the address bar:
   - Navigate to `/admin_authors`
   - Navigate to `/admin_notifications`
   - Navigate to `/admin_settings`
2. **Expected Behavior**:
   - The page load workflow checks `Current User's role is not Admin`.
   - The author is immediately redirected away to `/index` or `/author_dashboard`.
   - Admin controls, bulk triggers, and notification logs are never rendered on the author's screen.

### Test Case 5: Network Payload & Search Inspection
1. Open Chrome Developer Tools (**F12 → Network tab**).
2. Filter network traffic by `msearch` or `get` while browsing as Priya.
3. Inspect the JSON response returned by Bubble's servers.
4. **Expected Behavior**:
   - The payload contains strictly Priya's records (`AUTH001`, `BK001`, `BK002`).
   - Books belonging to Rohit, Ananya, Vikram, etc., are stripped on the server side prior to network transmission, verifying that privacy rules are enforced at the database layer rather than merely hidden in CSS/HTML.

### Test Case 6: Admin Full Visibility
1. Log out and log in as `admin@bookleafpub.in`.
2. Navigate to `/admin_authors`.
3. **Verify Overview**:
   - All 10 authors are visible in the table.
   - Payout status filter works for `All`, `Fully paid` (Farhan), `Pending` (Priya, Meera, Sneha, Kavita), and `Overdue` (Rohit, Ananya, Vikram, Arjun, Diya).
   - Click into any author detail page to inspect their books and payout history.

---

## 3. Loom Video Recording Checklist for Privacy

When recording your Loom screen recording, include this 60-second privacy sequence:
- [ ] Log in as Priya (`priya.sharma@email.com`) → show her 2 books and ₹3,570 pending.
- [ ] Log out, log in as Rohit (`rohit.kapoor@email.com`) → show his 2 books and ₹13,024 pending.
- [ ] Point out: *"As you can see, Bubble's database-level privacy rules isolate author data completely. Authors cannot query other authors' books or royalties."*
- [ ] Attempt navigating to `/admin_authors` as Rohit → demonstrate the automatic redirect.
- [ ] Log in as Admin (`admin@bookleafpub.in`) → show the full overview with all 10 authors.
