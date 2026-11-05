# Submission Email Draft — BookLeaf Technical Assignment 2

> **Instructions**: Send this as a direct reply in the existing email thread for Assignment 2 before the deadline (11 Nov 2026). Attach `n8n/royalty-summary-workflow.json` to the email.

---

**Subject**: Re: Technical Assignment 2 — Author Royalty Dashboard & Automated Notification System (Full-Stack Developer)

Hi Musavir and the BookLeaf Team,

Thank you for the opportunity to work on Assignment 2. I have completed the Author Royalty Dashboard & Automated Notification System using Bubble.io, n8n, and OpenAI AI API.

Here are the project links, deliverables, and test credentials:

### 1. Deliverables & Access Links
- **Live Bubble Application (Development Version)**:  
  `https://<YOUR-BUBBLE-APP-NAME>.bubbleapps.io/version-test/`
- **Bubble Editor Access**:  
  I have invited `musavir@bookleafpub.in` as an Editor collaborator on the Bubble application.
- **Loom Screen Recording (Walkthrough & Architecture)**:  
  `[INSERT_YOUR_LOOM_VIDEO_LINK_HERE]` *(Duration: ~4.5 mins)*
- **n8n Workflow Export**:  
  Attached to this email as `royalty-summary-workflow.json` (also stored in the repository at `n8n/royalty-summary-workflow.json`).  
  *(If using n8n Cloud: n8n Workspace view link: `[INSERT_N8N_CLOUD_LINK_HERE]`)*
- **Private Code & Documentation Repository**:  
  `[INSERT_YOUR_PRIVATE_GITHUB_REPO_LINK_HERE]`

---

### 2. Test Login Credentials

| Role | Account / Persona | Email | Password | What to Verify |
|---|---|---|---|---|
| **Author** | Priya Sharma (`AUTH001`) | `priya.sharma@email.com` | `Priya@BookLeaf2026` | 2 books, ₹3,570 pending balance within cycle |
| **Author** | Rohit Kapoor (`AUTH002`) | `rohit.kapoor@email.com` | `Rohit@BookLeaf2026` | 2 books, ₹13,024 pending, overdue status |
| **Author** | Farhan Sheikh (`AUTH008`) | `farhan.sheikh@email.com` | `Farhan@BookLeaf2026` | 1 book, ₹0 pending (fully paid up) |
| **Admin** | Operations Admin | `admin@bookleafpub.in` | `Admin@BookLeaf2026` | Full author list, filters, single & bulk triggers, audit logs |

---

### 3. Key Design Decisions & Architectural Notes

1. **Simulation Reference Date (`as_of_date: 2025-12-15`)**:  
   The provided dataset contains payout dates from late 2025. Measured against today's real date in late 2026, every pending title would be >300 days old (showing as an unrealistic wall of red overdue badges). I implemented an admin-configurable As-Of Date in `admin_settings`, preset to `2025-12-15`. This demonstrates the authentic intended distribution: 1 Fully paid, 4 Pending within cycle, and 5 Overdue. If cleared, the system dynamically calculates against real current time.
2. **Rollover for Balances Below ₹1,000 (Kavita Deshmukh Edge Case)**:  
   Per BookLeaf Knowledge Base policy, royalties under ₹1,000 automatically roll over to the next quarter. Kavita Deshmukh (AUTH009) has ₹850 pending. With the threshold toggle ON, this correctly displays a yellow badge `"Below ₹1,000 minimum — rolls over"` and an author status of `Pending`.
3. **Payout History Data Representation**:  
   The dataset provides cumulative paid figures rather than itemized transaction batches. To preserve relational integrity without fabricating synthetic dates, I created a `payout` record per book with `paid > 0`, explicitly tagged as `"Total paid to date (last payout on <date>)"`.
4. **Resilience & Asynchronous Callbacks (Pattern A)**:  
   Bubble's API Connector calls the n8n webhook with IDs only (`logId`, `authorId`). n8n acknowledges `202 Accepted` immediately, queries the Bubble Data API for fresh data, formats all Indian currency figures deterministically, and validates the AI response against a Fact-Check Guard before updating Bubble via Data API PATCH.
5. **No Infinite Spinners & Double-Click Idempotency**:  
   If n8n is unreachable, Bubble catches the error and marks the log `Failed` with a Retry option. If an admin double-clicks, an in-flight execution lock returns `409 Conflict`.
6. **Bulk Trigger on Free Plan**:  
   Since backend workflows are a paid Bubble feature, bulk triggering is handled via a throttled frontend recursive custom event that paces requests across the 9 eligible authors at 2-second intervals.

---

### 4. Trial Expiry & Review Caveat
Because Bubble free dev apps and cloud trials can occasionally experience latency or trial resets, the provided Loom screen recording captures the full end-to-end execution, database views, and privacy tests in real time.

I look forward to discussing the architecture and our technical choices during the founder interview!

Warm regards,  
**[Your Name]**  
[Your Phone Number]  
[Your LinkedIn Profile]
