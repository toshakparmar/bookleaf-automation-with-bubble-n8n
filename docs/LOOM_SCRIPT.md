# BookLeaf Assignment 2: Loom Walkthrough Script (4–5 Minutes)

> **Goal**: Record a smooth, structured 4–5 minute screen recording walking the BookLeaf founders/reviewers through your application.  
> **Tools**: Use [Loom](https://www.loom.com) with camera bubble + full screen sharing.  
> **Key Rule**: Maintain crisp, professional pacing. Show live interaction rather than slides.

---

## Video Timeline Overview

| Time | Section | Key Visuals | Key Narrative Points |
|---|---|---|---|
| **0:00 – 0:30** | Introduction & Architecture Overview | Home screen / architecture diagram | Welcome, tech stack (Bubble.io + n8n + AI LLM), dual role setup. |
| **0:30 – 1:15** | Author Portal & Privacy Isolation | Login as Priya (`AUTH001`), then Rohit (`AUTH002`) | Show Priya's 2 books, switch to Rohit's 2 books, show zero data leakage; attempt URL tampering & admin page access. |
| **1:15 – 2:00** | My Books & Royalty Status Matrix | Author dashboard & `admin_settings` | Explain green/yellow/red badges; show why `as_of_date` is set to `2025-12-15`; show in-production book handling ("Not yet set"). |
| **2:00 – 2:45** | Admin Portal Overview & Filtering | `/admin_authors` page | Name search, city dropdown, payout status filters (`Fully paid`, `Pending`, `Overdue`); view author detail. |
| **2:45 – 3:30** | Single Trigger & Live n8n Execution | `/admin_author_detail` + n8n execution tab | Click "Generate & Send Royalty Summary"; show Bubble button transition; show n8n execution graph turning green; show log updated to `Success` with AI email popup. |
| **3:30 – 4:15** | Resilience, Idempotency & Bulk Trigger | Bubble UI + Network tab | Double-click demo (409 prevented); bad webhook key / outage demo (instant Failed badge, no infinite spinner); Bulk trigger for 9 pending authors. |
| **4:15 – 4:45** | Conclusion & Next Steps | Notification log / code repo | Mention collaborator access shared with `musavir@bookleafpub.in`; thank the team. |

---

## Detailed Step-by-Step Script & Narration

### [0:00 – 0:30] Introduction
- **Action**: Start on the BookLeaf login page (`/index`).
- **Narration**:
  > *"Hi everyone, welcome to my walkthrough for BookLeaf Technical Assignment 2. Today I'm presenting the Author Royalty Dashboard and Automated Notification System. The frontend and database are built on Bubble.io, connected via authenticated webhooks to an n8n automation engine that orchestrates operational data validation, AI email generation with OpenAI GPT-4o-mini, and bidirectional callbacks."*

---

### [0:30 – 1:15] Author Portal & Data Isolation (Requirement A2 & A4)
- **Action**:
  1. Log in as **Priya Sharma** (`priya.sharma@email.com`).
  2. Point out the summary cards (Total Books: 2, Total Earned: ₹19,908, Total Paid: ₹16,338, Pending: ₹3,570).
  3. Show the repeating group: only Priya's 2 titles (*Whispers of the Ganges*, *The Saffron Diaries*) are visible.
  4. Log out and immediately log in as **Rohit Kapoor** (`rohit.kapoor@email.com`).
  5. Show Rohit's dashboard: only Rohit's 2 titles (*Code & Karma*, *Startup Sutra*) appear.
  6. In the address bar, type `/admin_authors` and press Enter.
- **Narration**:
  > *"Let's begin with author authentication and privacy rules. Logging in as Priya, we see strictly her two published titles and her ₹3,570 pending balance. When I log out and log in as Rohit, the dashboard displays only Rohit's books and his ₹13,024 pending balance. Bubble's database-level privacy rules ensure complete data isolation at the server layer. Even if an author tries to navigate directly to internal admin pages like `/admin_authors`, the system immediately redirects them away."*

---

### [1:15 – 2:00] Royalty Status Logic & The "As-Of Date" Simulation
- **Action**:
  1. Navigate to `/admin_settings`.
  2. Point out `AppSettings.as_of_date` set to `2025-12-15`.
  3. Explain the status badge colors.
  4. Point to Sneha Kulkarni's in-production title (*Midnight in Mysore*) and Kavita Deshmukh's title (*Raising Roots*).
- **Narration**:
  > *"Now let's examine the royalty status badges. The assignment rules define Green for fully paid, Yellow for normal cycle, and Red for overdue past 90 days. Because the provided dataset was recorded in late 2025, evaluating against today's date in late 2026 would make every pending author overdue and red. To showcase the true operational behavior, I implemented an admin-configurable As-Of Date, set here to 15 December 2025. This yields the authentic distribution: 1 fully paid, 4 pending within cycle, and 5 overdue. Notice that in-production books show clean grey chips with 'Not yet set' labels instead of confusing zeroes or blanks."*

---

### [2:00 – 2:45] Admin Portal Overview & Filters (Requirement A3)
- **Action**:
  1. Navigate to `/admin_authors`.
  2. Type "Meera" into the search box → table instantly filters. Clear search.
  3. Select City: "Mumbai" → shows Priya. Select "All Cities".
  4. Select Status: "Fully paid" → shows Farhan Sheikh. Select "Overdue" → shows the 5 overdue authors.
  5. Click "View Details" on Priya Sharma.
- **Narration**:
  > *"Moving to the Admin Portal, operations managers can search across authors by name, filter dynamically by city, or view by payout status. Let's inspect Priya Sharma. Her detail view displays her full book list, cumulative payout history records, and recent notification logs."*

---

### [2:45 – 3:30] Triggering the Royalty Summary & Live n8n Execution
- **Action**:
  1. Split screen or switch tabs between Bubble and n8n.
  2. In Bubble, click **"Generate & Send Royalty Summary"**.
  3. Show the button changing to `"Generating... (n8n running)"`.
  4. In n8n, show the execution graph:
     - Webhook receives payload → responds 202 Accepted.
     - Log patched to Processing.
     - Data fetched via Data API.
     - Code node builds deterministic facts.
     - AI node generates JSON.
     - Fact-check guard verifies zero hallucinations.
     - PATCH log to Success.
  5. Switch back to Bubble: log shows **Success** (Green).
  6. Click "View Email" popup to display the generated subject and body.
- **Narration**:
  > *"When I click 'Generate & Send Royalty Summary', Bubble creates a pending log and calls our n8n webhook. The webhook returns an instant 202 Accepted, and n8n fetches fresh author and book data directly from Bubble's Data API. Notice how our Code node pre-formats all Indian currency amounts like ₹19,908 and dates like 14 Feb 2026. The AI model copies these exact strings, and our Fact-Check Guard validates that zero hallucinated figures exist. The log in Bubble updates to Success, and clicking 'View Email' lets admins inspect the complete, beautifully worded BookLeaf author email."*

---

### [3:30 – 4:15] Error Handling, Idempotency & Bulk Triggers
- **Action**:
  1. Click the trigger button twice rapidly → show button disabled, point out the in-flight deduplication guard.
  2. Explain that if n8n is offline or an invalid key is used, Bubble catches the error and marks the log **Failed** with a Retry button (no infinite spinners).
  3. Navigate back to `/admin_authors`.
  4. Point out the Bulk Trigger button: `"Trigger Summaries for All Pending (9)"`.
  5. Click the button → show progress indication.
  6. Open `/admin_notifications` → show the sequential logs appearing with `trigger_type = Bulk`.
- **Narration**:
  > *"Reliability was a top priority. If an admin accidentally double-clicks, our in-flight guard rejects the duplicate with a 409 Conflict. If the automation service is temporarily down, the Bubble UI immediately marks the log Failed and provides a Retry option, preventing infinite spinners. Finally, for bulk triggering, our frontend recursive custom event schedules requests every 2 seconds, safely triggering summaries for all 9 eligible authors without hitting Free plan workload limits."*

---

### [4:15 – 4:45] Conclusion & Wrap-Up
- **Action**: Return to the main dashboard or notification log.
- **Narration**:
  > *"To conclude: editor access has been shared with `musavir@bookleafpub.in`, test credentials for both author and admin roles are provided in the README, and the complete n8n workflow and unit test suite are included in the repository. Thank you so much for watching, and I look forward to speaking with the founders!"*
