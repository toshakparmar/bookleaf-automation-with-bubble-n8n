# BookLeaf Live Testing Plan & Verification Guide

This checklist guides the candidate and reviewers through live verification of the complete integrated system (Bubble.io + n8n + AI LLM API).

---

## Pre-Requisites Checklist

- [ ] Bubble app is loaded with the 10-author, 18-book dataset (via `seed-bubble.mjs` or CSV upload).
- [ ] Admin and author test users exist in Bubble (`admin@bookleafpub.in`, `priya.sharma@email.com`, `rohit.kapoor@email.com`, `farhan.sheikh@email.com`).
- [ ] `AppSettings.as_of_date` is set to `2025-12-15` in `admin_settings`.
- [ ] n8n workflow is imported and toggled to **Active** (green toggle in top right).
- [ ] Bubble API Connector points to the active n8n production webhook URL with `X-BookLeaf-Key` marked **Private**.

---

## 1. Single Author Trigger Test Cases

Navigate to `/admin_authors`, select an author, and click **"Generate & Send Royalty Summary"**:

| Author | Edge Case Scenario | Expected Behavior & AI Email Content | Verified? |
|---|---|---|---|
| **Priya Sharma** (`AUTH001`) | **Normal Pending Cycle** (₹3,570 pending across 2 published books) | - Log created as `Pending` → transitions to `Processing` → lands on `Success`.<br>- Email acknowledges 342 copies of *Whispers of the Ganges* (₹11,970 earned, ₹8,400 paid, ₹3,570 pending) and *The Saffron Diaries* (fully paid up).<br>- Next payout explained: quarter ending 31 Dec 2025, due by 14 Feb 2026. | [ ] |
| **Farhan Sheikh** (`AUTH008`) | **All Royalties Settled** (₹0 pending, ₹3,120 earned & paid) | - Email warmly confirms all royalties are 100% paid up to date.<br>- No overdue warning or delayed payout excuses; expresses appreciation for partnership. | [ ] |
| **Ananya Reddy** (`AUTH003`) | **First Time / Never Paid** (₹2,546 pending, ₹0 paid, published 2024-06-18) | - Acknowledges this is their first payout disbursement.<br>- Red status badge ("Overdue — no payout yet").<br>- Email empathetically owns the delay and promises 48-hour team escalation response. | [ ] |
| **Kavita Deshmukh** (`AUTH009`) | **Below Threshold Rollover + In Production** (BK016: ₹850 < ₹1,000; BK015: In Production) | - BK016 shows Yellow badge `"Below ₹1,000 minimum — rolls over"`.<br>- BK015 shows Grey chip `"In Production - Typesetting"`.<br>- Email clarifies that the ₹850 balance rolls over to next quarter as per policy (not delayed).<br>- Email provides reassuring status update on *Raising Roots* typesetting. | [ ] |
| **Sneha Kulkarni** (`AUTH007`) | **Multiple Titles + In Production** (2 published titles + BK013 *Midnight in Mysore* in Cover Design) | - Breaks down *Monsoon Memories* and *The Silent Echo* accurately.<br>- Provides brief update on *Midnight in Mysore* awaiting author cover design review.<br>- In-production book values display "Not yet set" instead of zeroes/nulls. | [ ] |

---

## 2. Bulk Triggering Verification

1. Navigate to `/admin_authors`.
2. Observe the count on the **Bulk Trigger** button: `"Trigger Summaries for All Pending (9)"`. (Farhan Sheikh is excluded because `total_pending = 0`).
3. Click **"Bulk Trigger Royalty Summaries"**.
4. **Verify Behavior**:
   - The frontend recursive event initiates sequential webhook dispatches.
   - A progress toast updates: *"Processing author 1 of 9...", "2 of 9..."* with a 2-second pacing interval between requests.
   - Navigate to `/admin_notifications`:
     - 9 new entries appear with `trigger_type = Bulk`.
     - Each entry transitions from `Pending` → `Processing` → `Success`.
     - No Bubble workload timeout errors or rate-limit crashes occur.

---

## 3. Resilience & Failure Handling Tests

| Failure Scenario | How to Simulate | Expected System Behavior | Verified? |
|---|---|---|---|
| **Wrong Webhook Key** | In Bubble API Connector, temporarily change `X-BookLeaf-Key` to `wrong-secret`. Click trigger on an author. | - n8n Header Auth rejects request immediately (401 Unauthorized).<br>- Bubble catches the error response.<br>- `notificationlog` is marked **Failed** with message `"Could not reach automation service (n8n offline or unreachable)"`.<br>- Bubble displays alert: no infinite spinner! | [ ] |
| **n8n Automation Offline** | In n8n, toggle the workflow from Active to Inactive (or stop local n8n). Click trigger in Bubble. | - API Connector receives connection failure.<br>- Bubble workflow executes the error step.<br>- `notificationlog` marked **Failed**.<br>- UI shows red failure badge and enables "Retry" button. | [ ] |
| **Double-Click Race Condition** | Rapidly click the "Generate & Send" button twice within 500ms (or test via Postman/curl with identical `authorId`). | - Button disables immediately on first click.<br>- Second call receives `409 Conflict` with `accepted: false, reason: "DUPLICATE_IN_FLIGHT"`.<br>- Prevents duplicate AI calls and double notifications. | [ ] |
| **AI LLM API Outage** | In n8n, temporarily enter an invalid API key in the AI node or disconnect internet. Click trigger. | - n8n retries 3× with exponential backoff.<br>- Upon exhaustion, n8n transitions to the shared error branch.<br>- Calls Bubble Data API PATCH: `notificationlog` updated to **Failed**, `error_step = "AI Royalty Summary Generation"`.<br>- Bubble Notification Log displays the exact failed step. | [ ] |
| **Execution Timeout (Stale Log)** | If n8n crashes mid-flight without sending a callback: | - In Bubble UI, after `n8n_timeout_seconds` (180s), the log badge shows **"Timed out"**.<br>- A **"Retry"** button becomes active.<br>- Admin can click "Mark Stale Logs as Failed" in `admin_settings`. | [ ] |

---

## 4. Final Reviewer Sign-Off Checklist

- [ ] All 10 authors queryable with exact figures matching the assignment dataset.
- [ ] Authors can only view their own records (privacy rules verified).
- [ ] Royalty status badges accurately reflect the green/yellow/red matrix relative to `as_of_date`.
- [ ] Notification Log records all triggers with full AI email text inspection popup.
- [ ] Collaborator `musavir@bookleafpub.in` added to Bubble app.
- [ ] Loom video recorded and link tested.
