# n8n Automation Workflows — BookLeaf Author Royalty System

This directory contains the production-grade, importable n8n workflows for automated AI royalty summary generation and notification status synchronisation with Bubble.io.

---

## 1. Workflows Included

1. **`royalty-summary-workflow.json`** (Main Workflow)
   - Trigger: Authenticated Webhook (`POST /webhook/royalty-summary`).
   - Security: Custom header authentication (`X-BookLeaf-Key`).
   - Deduplication: In-flight execution lock with 120-second sliding window (returns `409 Conflict` on race conditions).
   - Instant Acknowledgement: Returns `202 Accepted` immediately (Pattern A).
   - Data Fetching: Queries Bubble Data API (`/obj/author`, `/obj/book` with constraints, `/obj/appsettings`).
   - Deterministic Logic: Computes author totals, overdue status, quarterly cycle deadlines, and Indian currency/date formatting.
   - AI Generation: OpenAI (`gpt-4o-mini`) or Anthropic (`claude-3-5-haiku`) JSON completions with BookLeaf tone and strict knowledge base policy adherence.
   - Fact-Check Guard: Validates that all rupee amounts and dates match pre-computed operational facts with zero hallucinations.
   - Bubble Callback: Updates `notificationlog` to `Success` (with subject, body, execution ID, model).
   - Error Handling: Shared failure branch catches timeouts/API errors and updates `notificationlog` to `Failed` with error message and failed step.
   - Bonus SMTP: Optional test email dispatch targeting only `TEST_RECIPIENT` with a `[TEST]` subject prefix (never sends to dataset addresses).

2. **`error-handler-workflow.json`** (Global Error Handler)
   - Trigger: n8n Error Trigger.
   - Traps unhandled execution crashes across all workflows and alerts engineering.

---

## 2. Importing into n8n

### Step 1: Open n8n
- **n8n Cloud**: Log in to your workspace (e.g. `https://your-instance.app.n8n.cloud`).
- **Self-Hosted / Local**: Open `http://localhost:5678`.

### Step 2: Import Workflow Files
1. In the left navigation, click **Workflows**.
2. Click the `...` (top right) → **Import from File**.
3. Select `n8n/royalty-summary-workflow.json`.
4. Repeat for `n8n/error-handler-workflow.json`.

---

## 3. Configuring Credentials

Create the following credentials in n8n (**Settings → Credentials → Add Credential**):

| Credential Name | Credential Type in n8n | Fields / Values | Used By |
|---|---|---|---|
| **`BookLeaf Webhook Key`** | Header Auth | Name: `X-BookLeaf-Key`<br>Value: `bookleaf-n8n-secret-key-2026` | Webhook Trigger |
| **`Gemini API Key`** | Header Auth | Name: `x-goog-api-key`<br>Value: `AQ.Ab8RN6IOhSTyJ4i5CXLXIGzVz4s54W-Xj6vTdr9KBMN0Eyd4jw` | AI Generation node (`gemini-3.5-flash`) |
| **`BookLeaf Test SMTP`** | SMTP | Host, port, username, password | Optional bonus SMTP |

> **Security Note**: Never commit real secret keys to the repository. Configure these named credentials inside n8n directly.

---

## 4. Configuration Variables (Configuration Node)

Click the **Configuration** node at the beginning of the workflow to customize parameters:

- `BUBBLE_BASE_URL`:
  - Production Bubble: `https://<your-app>.bubbleapps.io/version-test/api/1.1`
  - Local Test Harness: `http://localhost:3001/version-test/api/1.1`
- `CALLBACK_MODE`:
  - `'A'` (Default): Async flow — Webhook responds `202 Accepted` immediately; n8n updates Bubble via Data API PATCH.
  - `'B'` (Fallback): Synchronous flow — Webhook responds at the end of the workflow with `{ status, subject, body }`.
- `AI_MODEL`: `gpt-4o-mini` (or `claude-3-5-haiku`).
- `SEND_REAL_EMAIL`: `"false"` (default). Set to `"true"` only if testing SMTP dispatch to your personal test inbox.
- `TEST_RECIPIENT`: `your-email@example.com` (Target inbox for test SMTP emails).

---

## 5. Webhook URLs: Test vs. Production

- **Test URL** (`/webhook-test/royalty-summary`):
  Active *only* while you have the workflow open in n8n and click **"Listen for test event"**. Useful for step-by-step debugging.
- **Production URL** (`/webhook/royalty-summary`):
  Active continuously in the background. **You must toggle the workflow to "Active" (switch in top right) for this URL to accept calls from Bubble.**

---

## 6. Local Test Harness

To test the entire n8n flow locally without third-party API dependencies or a paid Bubble plan:
1. Navigate to the project root.
2. Start the local mock services:
   ```bash
   node harness/mock-bubble-api.mjs
   ```
3. Run the automated test suite:
   ```bash
   node scripts/test-harness.mjs
   ```
