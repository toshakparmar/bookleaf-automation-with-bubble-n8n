# Candidate Learning Log — BookLeaf Technical Assignment 2

> ⚠️ **MANDATORY CANDIDATE INSTRUCTION**:  
> **DO NOT SUBMIT THIS TEMPLATE AS-IS.**  
> The BookLeaf technical assignment brief specifically evaluates how you approach unfamiliar technologies:  
> *"If you've never used Bubble before, don't worry — that's partly the point... We're evaluating how quickly you can pick up a new platform, how well you understand its logic, and how effectively you build with it... document what you tried, what didn't work, and how you worked around it. We value the learning process, not just the output."*  
>  
> In the founder interview, the founders **will ask in detail about your specific learning curve, what broke in Bubble, and how you navigated n8n and Bubble constraints**.  
>  
> Replace the placeholder prompts below with your **genuine, authentic daily notes** as you build the application.

---

## Day 1 — Foundation & Discovery (Bubble Pre-Flight & n8n Setup)
*Date*: `[Enter Date e.g., 4 Nov 2026]`

- **What I set out to do today**:
  - `[e.g., Created Bubble account, explored manual.bubble.io, reviewed Assignment 2 PDF and schema requirements]`
- **What I tried**:
  - `[e.g., Set up a new Bubble application, navigated to Settings → API, checked Data API settings and API Connector plugin]`
- **What broke / What surprised me**:
  - `[e.g., Discovered that Backend Workflows (Workflow API) are restricted on the Free plan, which changed my strategy for bulk triggering]`
- **How I fixed or worked around it**:
  - `[e.g., Planned a frontend recursive custom event for bulk triggering with scheduled delays instead of relying on backend database triggers]`
- **Key concept learned today**:
  - `[e.g., How Bubble treats client-side data queries vs. server-side workflows, and how the Data API exposes database types]`
- **Resources / Documentation consulted**:
  - `[e.g., Bubble Manual on Data API, n8n webhook documentation, YouTube tutorial on Bubble API Connector]`

---

## Day 2 — Database Architecture, Option Sets & Seeding
*Date*: `[Enter Date]`

- **What I set out to do today**:
  - `[e.g., Create Option Sets, define data types, and load the 10-author, 18-book dataset]`
- **What I tried**:
  - `[e.g., Built option sets (role, royalty_status, etc.) with attributes; created lowercase_snake_case data fields]`
- **What broke / What surprised me**:
  - `[e.g., Linking books to authors required the author's internal Bubble Unique ID rather than author_code; CSV upload needed careful column mapping]`
- **How I fixed or worked around it**:
  - `[e.g., Used the seed-bubble.mjs automated script with the Data API bulk endpoint to link records programmatically]`
- **Key concept learned today**:
  - `[e.g., Relational field references in Bubble and the role of Option Sets as zero-cost in-memory enums]`
- **Resources / Documentation consulted**:
  - `[e.g., bubble/SCHEMA.md, Bubble documentation on Option Sets]`

---

## Day 3 — Author Portal & Privacy Rules
*Date*: `[Enter Date]`

- **What I set out to do today**:
  - `[e.g., Build the author login and dashboard with status badges, and configure database privacy rules]`
- **What I tried**:
  - `[e.g., Designed responsive repeating groups for author books; set conditional formatting for green/yellow/red badges]`
- **What broke / What surprised me**:
  - `[e.g., Initial privacy rule was too broad and allowed author search across all rows; or conditional formatting logic for overdue dates needed an as-of reference date]`
- **How I fixed or worked around it**:
  - `[e.g., Configured privacy rule: 'This book's author's user is Current User'; wired AppSettings.as_of_date into badge conditions]`
- **Key concept learned today**:
  - `[e.g., Bubble Privacy Rules evaluate at the server before data leaves the backend, preventing client-side data inspection]`
- **Resources / Documentation consulted**:
  - `[e.g., docs/PRIVACY_TEST.md, Bubble manual on Privacy Rules]`

---

## Day 4 — Admin Portal, Filters & Recalculation
*Date*: `[Enter Date]`

- **What I set out to do today**:
  - `[e.g., Build admin overview, author detail view, payout history, search/filter dropdowns, and settings page]`
- **What I tried**:
  - `[e.g., Added dynamic city dropdown and status filters; linked author detail page via URL parameter]`
- **What broke / What surprised me**:
  - `[e.g., Sorting and filtering by calculated book sums in repeating groups was slow; needed denormalised author fields]`
- **How I fixed or worked around it**:
  - `[e.g., Stored denormalised total_earned, total_paid, total_pending on the author type, maintained by the recalculate workflow]`
- **Key concept learned today**:
  - `[e.g., When and why to denormalise in Bubble for performance, while keeping the child table as the single source of truth]`
- **Resources / Documentation consulted**:
  - `[e.g., Bubble documentation on Repeating Groups and URL Parameters]`

---

## Day 5 — n8n Workflow Construction & AI Prompt Tuning
*Date*: `[Enter Date]`

- **What I set out to do today**:
  - `[e.g., Set up n8n webhook, configure Header Auth, build Code nodes, connect LLM API, and test output]`
- **What I tried**:
  - `[e.g., Imported royalty-summary-workflow.json; configured Data API GET nodes with constraints]`
- **What broke / What surprised me**:
  - `[e.g., The LLM occasionally converted Indian currency numbers or attempted to calculate dates; or n8n test webhook wasn't receiving events]`
- **How I fixed or worked around it**:
  - `[e.g., Switched n8n workflow to Active to use the production webhook URL; pre-formatted all currency and date strings in the Code node so the LLM simply copies verified facts]`
- **Key concept learned today**:
  - `[e.g., Constraining LLM hallucination risk through deterministic pre-computed facts and strict schema validation]`
- **Resources / Documentation consulted**:
  - `[e.g., n8n documentation on Code Nodes and Webhook response modes]`

---

## Day 6 — End-to-End Integration, Resilience & Bulk Triggers
*Date*: `[Enter Date]`

- **What I set out to do today**:
  - `[e.g., Connect Bubble API Connector to n8n webhook, test callbacks, handle timeouts, and implement bulk triggering]`
- **What I tried**:
  - `[e.g., Wired 'Generate & Send Royalty Summary' button; implemented recursive custom event for bulk triggers]`
- **What broke / What surprised me**:
  - `[e.g., Tested turning off n8n mid-run: Bubble UI froze on a loading spinner because error handling wasn't enabled on the API Connector]`
- **How I fixed or worked around it**:
  - `[e.g., Checked 'Include errors in response and allow workflow to continue' in API Connector; added timeout detection in Bubble to show a Retry button]`
- **Key concept learned today**:
  - `[e.g., Asynchronous webhook patterns, idempotency with 409 Conflict, and graceful error degradation across distributed no-code services]`
- **Resources / Documentation consulted**:
  - `[e.g., bubble/BUILD_GUIDE.md Stage 7]`

---

## Day 7 — Final Testing, Loom Recording & Polish
*Date*: `[Enter Date]`

- **What I set out to do today**:
  - `[e.g., Run full test checklist across all 10 authors, record 4-minute Loom video, invite collaborator, prepare email]`
- **What I tried**:
  - `[e.g., Verified privacy isolation as Priya and Rohit; recorded screen walkthrough following docs/LOOM_SCRIPT.md]`
- **What broke / What surprised me**:
  - `[e.g., Noticed that setting the as-of date to today turned all authors Red, which made it crucial to explain the as-of simulation in the video]`
- **How I fixed or worked around it**:
  - `[e.g., Demonstrated the as-of date picker set to 15 Dec 2025 during the video to highlight the intended green/yellow/red distribution]`
- **Final Reflection**:
  - `[e.g., What was most challenging about switching to Bubble/n8n, what you appreciated about visual vs code-based development, and how you would evolve this architecture into BookLeaf's future code-based stack]`
