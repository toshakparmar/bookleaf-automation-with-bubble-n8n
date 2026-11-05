# BookLeaf Assignment 2: Technical Assumptions & Architecture Decisions

This document logs all architectural decisions, dataset interpretations, and pre-flight plan findings made during development.

---

## 1. Bubble.io Free Plan Constraints & Pre-Flight Verifications

| Checkpoint | Status / Finding | Impact & Architectural Decision |
|---|---|---|
| **Data API availability on Free plan** | Available in Settings → API. Allows API token generation and supports CRUD via `Authorization: Bearer <TOKEN>`. | **Enables Pattern A**: n8n can query `/obj/author`, `/obj/book`, and PATCH `/obj/notificationlog` directly via the Data API. |
| **Backend Workflows / Workflow API on Free plan** | Backend Workflows (database triggers, scheduled workflows, API workflows) require a paid Bubble plan. | **Decision**: We avoid backend workflows. All triggering is initiated via the frontend API Connector, and bulk triggering uses a frontend recursive custom event (`process_author_queue`) with 2-second scheduled delays. |
| **Public URL access on Free plan** | The development app (`version-test`) is accessible via public URL, but requires Bubble account or app collaboration for full editor inspectability. | **Decision**: Explicitly invite `musavir@bookleafpub.in` as an editor collaborator, provide the live `version-test` link, and record a comprehensive Loom walkthrough video. |
| **API Connector external calls on Free plan** | Fully functional. Allows workflows to make outbound HTTPS POST requests with private headers. | **Decision**: Used for `trigger_royalty_summary` webhook calls with secret `X-BookLeaf-Key` marked **Private**. |

---

## 2. Dataset Interpretations & Ground Truth

### 2.1 The "90-Day Overdue" Rule vs. Simulation As-Of Date
- **Observation**: The sample dataset records all `last_royalty_payout_date` entries between August 2025 and December 2025. In late 2026, every book with pending royalties would be >300 days old.
- **Decision**: We implement an admin-configurable reference date (`AppSettings.as_of_date`).
  - Default simulated date: `2025-12-15`.
  - When set to `2025-12-15`, the reviewer sees the exact expected status distribution:
    - **1 Fully Paid**: Farhan Sheikh (AUTH008).
    - **4 Pending**: Priya Sharma (AUTH001), Meera Nair (AUTH005), Sneha Kulkarni (AUTH007), Kavita Deshmukh (AUTH009).
    - **5 Overdue**: Rohit Kapoor (AUTH002), Ananya Reddy (AUTH003), Vikram Joshi (AUTH004), Arjun Malhotra (AUTH006), Diya Chatterjee (AUTH010).
  - When `as_of_date` is empty or cleared, the system dynamically falls back to the real current date/time.

### 2.2 Payout History Entity Representation
- **Observation**: The dataset includes cumulative `royalty_paid` and `last_royalty_payout_date` on each book, but lacks individual historical transaction records.
- **Decision**: To maintain strict database integrity without fabricating artificial transactions, we create one `payout` record per book where `royalty_paid > 0`. Each record represents the cumulative disbursement as of `last_royalty_payout_date` and is marked `is_cumulative = yes` with notes: `"Total paid to date (last payout on <date>)"`.

### 2.3 Rollover Policy for Balances Below ₹1,000 (Kavita Deshmukh Edge Case)
- **Knowledge Base Rule**: Royalties below the ₹1,000 threshold roll over to the next quarter rather than triggering a payout.
- **Edge Case**: Kavita Deshmukh (AUTH009) has ₹850 pending on BK016 (published 2024-11-12 with no payout yet). Under a literal 90-day cutoff, this would show as "Overdue". However, because ₹850 is below the ₹1,000 threshold, it is actively rolling over as per BookLeaf policy and is not delayed.
- **Decision**: We introduce an admin toggle `apply_min_threshold` (default: **ON**).
  - When **ON**: BK016 shows Yellow `"Below ₹1,000 minimum — rolls over"`, and Kavita's status is `Pending`.
  - When **OFF**: The system follows the literal 90-day cutoff regardless of amount, marking BK016 Red `"Overdue"`.

### 2.4 Quarterly Calculation Deadlines
- **Knowledge Base Rule**: Royalties are calculated quarterly and paid within 45 days of quarter end.
- **Assumption**: Standard calendar quarters apply:
  - Q1: Jan 1 – Mar 31 (payout deadline: May 15 / 45 days)
  - Q2: Apr 1 – Jun 30 (payout deadline: Aug 14)
  - Q3: Jul 1 – Sep 30 (payout deadline: Nov 14)
  - Q4: Oct 1 – Dec 31 (payout deadline: Feb 14)
- **Computation**: All payout dates are calculated strictly in code (n8n Code node and reference engine), never left to LLM guesswork.

---

## 3. Integration & Security Architecture

### 3.1 Fetch Strategy: Data API inside n8n vs. Webhook Payload
- **Decision**: We chose **Data API fetch inside n8n** (Pattern A).
- **Justification**:
  1. *Security & Minimal Surface*: The webhook payload passes only IDs (`logId`, `authorId`, `triggerType`), preventing exposure of financial figures in browser payloads.
  2. *Data Freshness*: Ensures the AI generates summaries using the latest database state at execution time.
  3. *Bubble Simplicity*: Avoids complex nested-list JSON construction inside Bubble client workflows.

### 3.2 Dual Integration Modes (Pattern A vs Pattern B)
The n8n workflow includes a single `CALLBACK_MODE` switch in its `Configuration` node:
- **Pattern A (Default / Preferred)**:
  - Bubble calls n8n webhook → n8n answers `202 Accepted` immediately.
  - n8n fetches data, calls AI, and PATCHes `notificationlog` via Data API.
  - Bubble UI auto-refreshes when the record updates.
- **Pattern B (Synchronous Fallback)**:
  - Used if Bubble Data API external access is restricted on certain Free accounts.
  - n8n executes synchronously and responds via *Respond to Webhook* with `{ status, subject, body }`.
  - Bubble workflow writes the response directly to the log.

### 3.3 Safe Test SMTP Handling
- To strictly adhere to safety rules, `SEND_REAL_EMAIL` is set to `false` by default.
- When enabled for bonus testing, n8n sends exclusively to `TEST_RECIPIENT` (e.g. `test-reviewer@bookleafpub.in`) with a `[TEST]` subject prefix. It **never** sends emails to fictional or real author addresses from the dataset.
