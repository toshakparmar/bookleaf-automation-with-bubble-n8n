# BookLeaf Portal — REST API Specification (`/api/v1`)

> Live Swagger / OpenAPI documentation is hosted at `http://localhost:3001/api/docs`.

---

## 1. Global Conventions & Standards

- **Base Prefix:** `/api/v1`
- **Authentication:** `bookleaf_token` `httpOnly`, `SameSite=Lax`, `Secure` cookie containing JWT claims.
- **Success Response:**
  - Single entities: `{ ...entity }`
  - Paginated collections: `{ data: [...], meta: { page, pageSize, total, totalPages } }`
- **Error Response Envelope:**
  ```json
  {
    "error": {
      "code": "RESOURCE_NOT_FOUND",
      "message": "The requested book record was not found.",
      "details": null,
      "requestId": "req_1793084053744"
    }
  }
  ```

---

## 2. Endpoint Reference Table

| Method | Route | Role | Description |
|---|---|---|---|
| `POST` | `/auth/login` | Public | Authenticates user with email & password, sets `bookleaf_token` cookie. |
| `POST` | `/auth/logout` | Any | Clears `bookleaf_token` cookie. |
| `GET` | `/auth/me` | Any | Returns current user profile, role, and linked author record. |
| `GET` | `/authors/me/books` | AUTHOR | Returns author's own books and aggregate royalty earnings. |
| `GET` | `/authors/me/books/:bookId` | AUTHOR | Returns author's single book record (returns 404 if not owned). |
| `POST` | `/tickets` | AUTHOR | Submits a support query; returns 201 immediately and triggers async AI triage. |
| `GET` | `/tickets` | AUTHOR | Lists author's tickets with status filtering and pagination. |
| `GET` | `/tickets/:id` | AUTHOR | Retrieves ticket thread conversation (strictly excludes internal notes and AI triage). |
| `POST` | `/tickets/:id/messages` | AUTHOR | Adds an author reply to the thread (re-opens resolved tickets to OPEN). |
| `GET` | `/admin/tickets` | ADMIN | Filterable operations queue with urgency sorting, search, and SLA breach indicators. |
| `GET` | `/admin/tickets/:id` | ADMIN | Retrieves full ticket details including internal notes, live context, and audit logs. |
| `PATCH` | `/admin/tickets/:id` | ADMIN | Overrides ticket `status`, `category`, `priority`, or `assignedToId`. |
| `POST` | `/admin/tickets/:id/assign-to-me` | ADMIN | Assigns ticket to authenticated operations specialist. |
| `POST` | `/admin/tickets/:id/notes` | ADMIN | Records private internal note (never returned to authors). |
| `POST` | `/admin/tickets/:id/ai/classify` | ADMIN | Manually re-runs classification and priority analysis. |
| `POST` | `/admin/tickets/:id/ai/draft` | ADMIN | Generates or fetches cached AI response draft (`?force=true` bypasses cache). |
| `POST` | `/admin/tickets/:id/replies` | ADMIN | Sends official BookLeaf reply to author (advances OPEN tickets to IN_PROGRESS). |
| `GET` | `/admin/stats` | ADMIN | Aggregates queue counts, unassigned volumes, SLA breaches, and AI usage metrics. |
| `GET` | `/events/stream` | Any | Server-Sent Events (SSE) connection stream with role-filtered push events. |
| `GET` | `/health` | Public | Liveness check reporting database connectivity and AI config status. |
