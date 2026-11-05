# Bubble.io Data API Key & Payload Reference Guide

This document defines how Bubble.io serializes fields in its Data API (v1.1) and provides the mapping between dataset keys, Bubble database fields, and API JSON payloads.

---

## 1. Bubble Data API Fundamentals

### 1.1 Base URLs
- **Development / Test Version**:
  `https://<your-app-name>.bubbleapps.io/version-test/api/1.1`
- **Live Version**:
  `https://<your-app-name>.bubbleapps.io/api/1.1`

### 1.2 Authentication
All requests from n8n and seed scripts must include an admin API token in the `Authorization` header:
```http
Authorization: Bearer <YOUR_BUBBLE_API_TOKEN>
```
Generated in Bubble at: **Settings → API → Generate a new API token**.

### 1.3 Key Naming Convention in Bubble API
When Bubble generates Data API responses:
- The unique record ID is always returned as `_id` (string).
- Built-in timestamps are returned as `Created Date` and `Modified Date` (ISO 8601 strings).
- Custom fields defined as `lowercase_snake_case` (e.g. `author_code`, `total_earned`) appear in JSON exactly as `author_code`, `total_earned`.
- **Relational fields**: A relation to another data type returns the target record's `_id` string on GET, and accepts the target record's `_id` string on POST/PATCH.
- **Option Sets**: An option set field returns/accepts the exact display text of the option (e.g. `"Published"`, `"In production"`).
- **List of Option Sets**: Returns/accepts an array of display text strings (e.g. `["Amazon India", "Flipkart"]`).

---

## 2. Field Mapping Table

### 2.1 Type: `author` (`/obj/author`)
| Dataset Key (`bookleaf_sample_data.json`) | Bubble Internal Field Name | Bubble Data API JSON Key | Data Type | Example Value |
|---|---|---|---|---|
| `author_id` | `author_code` | `author_code` | text | `"AUTH001"` |
| `name` | `name` | `name` | text | `"Priya Sharma"` |
| `email` | `email` | `email` | text | `"priya.sharma@email.com"` |
| `phone` | `phone` | `phone` | text | `"+91-98765-43210"` |
| `city` | `city` | `city` | text | `"Mumbai"` |
| `joined_date` | `joined_date` | `joined_date` | date (ISO) | `"2023-03-15T00:00:00.000Z"` |
| *(computed)* | `total_books` | `total_books` | number | `2` |
| *(computed)* | `total_earned` | `total_earned` | number | `19908` |
| *(computed)* | `total_paid` | `total_paid` | number | `16338` |
| *(computed)* | `total_pending` | `total_pending` | number | `3570` |
| *(computed)* | `payout_status` | `payout_status` | option set | `"Pending"` |
| *(linked user)* | `user` | `user` | relation (`_id`) | `"1730700000000x12345"` |

### 2.2 Type: `book` (`/obj/book`)
| Dataset Key | Bubble Internal Field Name | Bubble Data API JSON Key | Data Type | Example Value |
|---|---|---|---|---|
| `book_id` | `book_code` | `book_code` | text | `"BK001"` |
| *(parent)* | `author` | `author` | relation (`_id`) | `"1730700000000x67890"` |
| `title` | `title` | `title` | text | `"Whispers of the Ganges"` |
| `isbn` | `isbn` | `isbn` | text | `"978-93-5XXXX-01-1"` |
| `genre` | `genre` | `genre` | text | `"Literary Fiction"` |
| `publication_date`| `publication_date`| `publication_date`| date / null | `"2023-06-20T00:00:00.000Z"` |
| `status` | `status_text` | `status_text` | text | `"Published & Live"` |
| *(mapped)* | `book_state` | `book_state` | option set | `"Published"` |
| `mrp` | `mrp` | `mrp` | number / null | `399` |
| `author_royalty_per_copy`| `royalty_per_copy`| `royalty_per_copy`| number / null | `35` |
| `total_copies_sold`| `copies_sold` | `copies_sold` | number | `342` |
| `total_royalty_earned`| `royalty_earned`| `royalty_earned`| number | `11970` |
| `royalty_paid` | `royalty_paid` | `royalty_paid` | number | `8400` |
| `royalty_pending` | `royalty_pending`| `royalty_pending`| number | `3570` |
| `last_royalty_payout_date`| `last_payout_date`| `last_payout_date`| date / null | `"2025-10-15T00:00:00.000Z"` |
| `print_partner` | `print_partner` | `print_partner` | option set | `"In-House"` |
| `available_on` | `platforms` | `platforms` | list of option sets | `["Amazon India", "Flipkart", "BookLeaf Store"]` |

### 2.3 Type: `notificationlog` (`/obj/notificationlog`)
| Description | Bubble Field Name | Data API JSON Key | Type | Example Value |
|---|---|---|---|---|
| Author reference | `author` | `author` | relation (`_id`) | `"1730700000000x67890"` |
| Admin user | `triggered_by` | `triggered_by` | relation (`_id`) | `"1730700000000x12345"` |
| Trigger type | `trigger_type` | `trigger_type` | option set | `"Single"` |
| Current status | `status` | `status` | option set | `"Success"` |
| Requested at | `requested_at` | `requested_at` | date (ISO) | `"2026-11-04T10:00:00.000Z"` |
| Completed at | `completed_at` | `completed_at` | date (ISO) | `"2026-11-04T10:00:04.500Z"` |
| Subject | `email_subject` | `email_subject` | text | `"Your BookLeaf Royalty Summary"` |
| Body | `email_body` | `email_body` | text | `"Dear Priya, ..."` |
| Error message | `error_message` | `error_message` | text | `null` |
| Error step | `error_step` | `error_step` | text | `null` |
| n8n execution | `n8n_execution_id`| `n8n_execution_id`| text | `"execution-10492"` |
| AI Model | `ai_model` | `ai_model` | text | `"gpt-4o-mini"` |
| Sent to test | `email_sent_to_test`| `email_sent_to_test`| boolean | `false` |

---

## 3. Querying with Constraints (Used in n8n Fetch Node)

To fetch books belonging to a specific author ID via the Bubble Data API, pass a JSON-encoded array into the `constraints` query parameter:

```http
GET /version-test/api/1.1/obj/book?constraints=[{"key":"author","constraint_type":"equals","value":"1730700000000x67890"}]
```

### URL-Encoded Example:
```http
GET /version-test/api/1.1/obj/book?constraints=%5B%7B%22key%22%3A%22author%22%2C%22constraint_type%22%3A%22equals%22%2C%22value%22%3A%221730700000000x67890%22%7D%5D
```

### Pagination Handling
Bubble's Data API returns up to 100 records per page. The response format is:
```json
{
  "response": {
    "cursor": 0,
    "results": [ ... ],
    "remaining": 0,
    "count": 2
  }
}
```
If `remaining > 0`, fetch the next page using `?cursor=100`.

---

## 4. Bulk Seeding Endpoint (`/obj/<type>/bulk`)

Bubble provides a high-throughput bulk import endpoint:
- **Method**: `POST`
- **URL**: `https://<app>.bubbleapps.io/version-test/api/1.1/obj/<type>/bulk`
- **Headers**:
  ```http
  Authorization: Bearer <BUBBLE_API_TOKEN>
  Content-Type: text/plain
  ```
- **Body**: Newline-delimited JSON (NDJSON) — each line is a JSON object representing one record:
  ```json
  {"author_code":"AUTH001","name":"Priya Sharma","email":"priya.sharma@email.com","city":"Mumbai"}
  {"author_code":"AUTH002","name":"Rohit Kapoor","email":"rohit.kapoor@email.com","city":"Delhi"}
  ```
