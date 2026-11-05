# Engineering Write-Up — BookLeaf Author Support Portal

## 1. What I Prioritised

1. **AI Integration Quality & Resilience (25% weight):**
   - Implemented a provider-agnostic LLM interface with Google Gemini 3.5 Flash as the primary engine (with Anthropic Claude 3.5 Haiku and OpenAI GPT-4o-mini support).
   - Guarded against LLM hallucination on financial and production facts by deterministically computing quarterly royalty payout dates, statutory 45-day deadlines, and rollover thresholds in pure TypeScript before injecting them into prompt context.
   - Built a deterministic priority rule safety net (`max(aiPriority, ruleFloor)`) guaranteeing that severe legal escalations or multi-month unpaid royalties are elevated to Critical, and ISBN errors enforce a minimum High priority.
   - Integrated full graceful degradation: when LLMs are unconfigured or fail, keyword heuristics assign best-effort categories, tickets are never blocked, and admins can reply manually with clear visual status banners.

2. **Clean Multi-Tenant Architecture & Enterprise Security (25% weight):**
   - JWT authentication delivered exclusively via `httpOnly`, `SameSite=Lax`, `Secure` cookies with default-deny global guards.
   - Absolute author data isolation enforced at the database query layer (`authorId === currentAuthor.id`), returning `404 Not Found` for cross-author access to prevent resource enumeration.
   - Rigorous separation of internal staff notes and AI internal scores from all author-facing serialization endpoints, verified by automated security and e2e test suites.

3. **Distinct Editorial Design System & Real-Time Operational UX:**
   - Transformed the web experience from generic AI-generated templates into a tailored "Editorial Publishing House" aesthetic: Fraunces serif headlines, Plus Jakarta Sans body, and JetBrains Mono for monetary and ISBN data.
   - Implemented subtle, functional motion using GSAP, React Bits (SpotlightCard, SplitText, CountUp, ClickSpark), and a canvas silk atmospheric hero.
   - Real-time Server-Sent Events (SSE) keep the author thread and operations queue synchronized without manual page refreshes, automatically falling back to 5-second polling if streams disconnect.

---

## 2. Key Architectural Trade-Offs

- **In-Process Job Queue vs. Distributed Queue (BullMQ/SQS):**
  - *Trade-off:* Used asynchronous Node.js `setImmediate` execution for initial AI triage rather than external Redis-backed BullMQ workers.
  - *Rationale:* Zero external infrastructure dependency for running locally or evaluating with `docker compose up`. The service interface is decoupled so swapping in BullMQ requires changing only one file in `apps/api/src/ai/`.
- **On-Demand AI Draft Synthesis vs. Eager Pre-Drafting:**
  - *Trade-off:* Draft generation executes on-demand when an operations specialist opens a ticket, rather than pre-generating drafts for all 1,200+ monthly queries upon arrival.
  - *Rationale:* Eliminates wasted LLM tokens and API cost for tickets resolved through simple status changes or immediate phone calls. Drafts are cached by version hash once generated.

---

## 3. Evolution to Full Production

1. **Distributed Queue Worker:** Replace in-process `setImmediate` triage with BullMQ on Redis for multi-instance horizontal scaling and dead-letter queues.
2. **S3-Compatible Object Storage:** Transition the attachment metadata placeholder to presigned AWS S3 / Cloudflare R2 uploads with automated virus scanning.
3. **Redis Pub/Sub SSE Scaling:** Route SSE events through Redis Pub/Sub channels to enable multi-instance API deployments across Kubernetes or Render clusters.
4. **Human-in-the-Loop Prompt Tuning:** Add an admin feedback widget (thumbs up/down + edit delta) on AI drafts, streaming telemetry into an analytics warehouse to continuously evaluate and refine few-shot exemplars.
