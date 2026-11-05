# BookLeaf Portal — Frontend Design System & UX Architecture (v2 Master Overhaul)

> **Design Direction:** *Editorial Publishing House* — Authentic craftsmanship meets modern, high-throughput publishing operations. Real imagery, procedural book covers, and purpose-driven motion.

---

## 1. Diagnosis: Why the Previous UI Looked "AI-Generated"

Before the v2 overhaul, the interface suffered from hallmarks of AI-generated web designs:
1. **Total Absence of Real Imagery:** Screens relied solely on colored boxes, text, and flat icon badges. No physical books, printing presses, or publishing atmosphere existed.
2. **Uniform Card Grids:** Every screen was laid out as identical `rounded-2xl` cards with identical paddings and borders, creating visual monotony.
3. **Flat, Repetitive Book Representations:** Books were represented by text labels and a generic 2px colored line rather than authentic book covers with jackets, spines, and depth.
4. **Centred-Everything Marketing Tropes:** Hero areas and forms were horizontally centered with uniform margins, lacking editorial asymmetry, overlapping elements, or magazine-like layout structure.
5. **No Sense of Physicality or Brand Craft:** The interface felt like an abstract SaaS database rather than a 22,000+ title literary publishing house with physical inventory, printing presses, and global distribution channels.
6. **Timid, Disjointed Motion:** Animations were either entirely absent or consisted of arbitrary fades with no physical weight or purpose.
7. **Generic Empty & Feedback States:** Success confirmations and empty inboxes were static text alerts rather than crafted, delightful micro-animations.
8. **Missing Public Brand Presence:** Visitors had no public entry point showcasing BookLeaf's scale, publishing pipeline, and author service guarantees before logging in.
9. **Uninspired Backgrounds:** Screens had flat solid colors with no paper texture, atmospheric depth, or tactile warmth.
10. **Lacked Authentic Channel Badges:** Retail distribution was represented by plain text bullets rather than real global retail channels (Amazon IN, Flipkart, Amazon US, UK, BookLeaf Direct).

---

## 2. Multi-Library Roles & Separation of Concerns

To avoid conflicting animations and bundle bloat, each library has a strictly defined role. **No single element is ever animated by two libraries simultaneously.**

| Library | Role & Boundaries | Where It Is Used |
|---|---|---|
| **shadcn/ui & Radix UI** | Accessible base primitives styled with custom tokens (never default zinc/slate). | Buttons, cards, badges, dialogs, forms, accordion FAQ, tooltips, toast notifications (`sonner`), command palette (`cmdk`). |
| **React Bits** | Copy-pasted, tailored interactive components in `components/reactbits/`. | `SplitText` (headline reveal), `CountUp` (tabular financials and metrics), `SpotlightCard` (interactive book card lighting), `Magnet` (cursor attraction on primary CTAs), `Marquee` (infinite retail channel ticker), `AtmosphericBackground` (canvas silk threads). |
| **Framer Motion (`framer-motion`)** | State-driven UI transitions and 3D physics. | 3D perspective mouse-tilt on `<BookCover />`, `AnimatePresence` cross-fades on dynamic category photography, floating book stack bobbing (`repeatType: mirror`), drawer animations. |
| **GSAP & `@gsap/react`** | High-performance timelines and scroll-linked reveals. | Stepper line draw, input error shake (`formCardRef`), number tickers, hero entrance sequences via scoped `useGSAP`. |
| **Lottie (`@lottiefiles/dotlottie-react`)** | Purposeful micro-animations (< 60KB). | Success checkmark draw (`success`), orbital AI draft synthesis (`ai-thinking`), empty states (`empty-inbox`), reconnection badge (`reconnecting`). |
| **Lenis (`lenis`)** | Smooth momentum scrolling on the public landing page only. | Strictly scoped to `/` (`SmoothScroll.tsx`); disabled for author/admin dashboards and `prefers-reduced-motion`. |

---

## 3. Brand Tokens & Visual Hierarchy

All tokens are defined in `app/globals.css` via CSS variables and mapped into Tailwind:

### Paper & Ink Color System
- **Light Theme (Editorial Paper):**
  - Background: `#F7F3EA` (warm unbleached paper)
  - Card: `#FFFDF8` (clean cream page)
  - Foreground: `#1B1A17` (rich ink black)
  - Muted Foreground: `#6B675D` (warm charcoal)
  - Border: `#E4DDCC` (1px hairline bookbinding rule)
  - Primary: `#1F5F4A` (deep leaf green) · Hover: `#17493A`
  - Accent: `#E0A526` (warm saffron for rollovers and pending royalties)
- **Dark Theme (Night Library):**
  - Background: `#0F1411`
  - Card: `#161D18`
  - Foreground: `#ECE8DC`
  - Border: `#26302A`
  - Primary: `#5FBF99`
  - Accent: `#E8B84A`

### Typography Hierarchy
- **Display Headings:** **Fraunces** (Google Fonts variable serif with soft optical sizing).
- **Body & UI:** **Plus Jakarta Sans** (clean, modern legibility).
- **Tabular Data, IDs & ISBNs:** **JetBrains Mono** with `tabular-nums` for precise alignment of financial ledgers (₹) and timestamps.

### Strict Anti-"AI Look" Design Rules
- ❌ No purple/blue/pink neon gradient glows.
- ❌ No uniform grids of identical cards.
- ❌ No emoji icons (all icons are stroke-width 1.5 Lucide icons).
- ❌ No centered-everything layouts — asymmetric compositions, photo overlays, and varied bento spans throughout.
- ❌ No fabricated customer testimonials or fake stats — all metrics are real facts from the brief:
  - **22,000+** published titles
  - **1,200+** monthly releases
  - **48-hour** response guarantee
  - **80/20** author profit split
  - **₹1,000** quarterly rollover threshold
  - **5–7 day** replacement reprint turnaround
  - **24–48h** catalogue re-sync window

---

## 4. Imagery & Asset Architecture

All assets are stored locally, optimized in WebP/AVIF format under 250KB, and served via `next/image` with blur placeholders and descriptive `alt` tags.

### 4.1 Photography Pipeline (`apps/web/public/images/`)
1. `hero-book-desk.jpg` (186KB) — Warm editorial desk with open notebook and natural window light.
2. `author-writing.jpg` (248KB) — Close-up of author fountain pen on cream paper (used for royalty accounting desk).
3. `stacked-books.jpg` (152KB) — Stacked paperbacks with deckled edges.
4. `bookstore-library.jpg` (289KB) — Bookshop shelves with warm incandescent lighting.
5. `printing-binding.jpg` (248KB) — Commercial printshop binding and cutting machinery.
6. `distribution-warehouse.jpg` (248KB) — Distribution logistics and boxed book shipments.
7. `hands-holding-book.jpg` (248KB) — Hands holding a freshly bound volume.
8. `reading-nook.jpg` (248KB) — Quiet reading armchair with warm lighting.
9. `printing-press.jpg` (248KB) — Traditional Heidelberg press in action.

*Full licensing and attribution documented in [`docs/ASSETS.md`](file:///d:/Assignments/BookLeaf/docs/ASSETS.md).*

### 4.2 Procedural 3D Book Cover Component (`<BookCover />`)
To prevent copyright infringement while providing studio-grade realism, `<BookCover />` procedurally generates typographic jackets based on genre:
- **Fiction / Literary:** Deep forest green with undulating wave geometries.
- **Poetry:** Soft plum & lavender with delicate floral motifs.
- **Non-Fiction:** Classic navy & slate with structured rule lines.
- **Memoir:** Amber & warm bronze with sunburst flourishes.
- **Thriller / Mystery:** Crimson & charcoal with bold geometric diagonals.
- **Romance:** Rose & terracotta with soft curves.
- **Depth & Physicality:** Built-in spine fold shadows, page-block depth on right/bottom edges, and real-time 3D mouse tilt driven by Framer Motion springs (`rotateX`, `rotateY`).

---

## 5. Screen Breakdown & Visual Highlights

### 5.1 Public Landing Page (`/`)
- **Hero:** Asymmetric split composition. Left: Fraunces headline animated character-by-character via `SplitText`, 48-hour SLA badge, Magnet primary CTA. Right: Organic photo mask with floating procedural 3D book cover stack (`repeatType: mirror`) and an interactive mini ticket status preview.
- **Trust Marquee:** Real count-ups (`22,000+` titles, `1,200+` monthly books) and an infinite marquee of global retail partners (Amazon India, Flipkart, Amazon US, UK, BookLeaf Store).
- **4-Step Pipeline Stepper:** Step-by-step resolution flow with GSAP-inspired connection line and Lucide iconography.
- **Bento Grid:** Mixed media tiles combining physical print photography, royalty ledger previews, live ticket notification badges, and distribution metrics with `SpotlightCard` cursor illumination.
- **9-Stage Production Track:** Visual strip representing all 9 publishing stages from Manuscript Received to Global Distribution.
- **Policy FAQ:** Expandable accordion covering 45-day payment cycles, reprint guarantees, and metadata sync windows.
- **Lenis Smooth Scroll:** Momentum scrolling active strictly on `/`.

### 5.2 Redesigned Split Login (`/login`)
- **Left Editorial Panel:** Full-height photograph with duotone leaf-green multiply overlay, subtle Ken Burns scale, atmospheric silk thread canvas, Fraunces serif headline, and a pair of floating 3D book covers.
- **Right Form:** Clean card with hairline border, show/hide password toggle, GSAP error shake on invalid credentials, Lottie loading/success state, and collapsible 1-click demo account switcher.

### 5.3 Author Catalog (`/author/books`)
- **3D Book Covers:** Every registered book features a genre-coded 3D `<BookCover />` with realistic spine shadow and depth.
- **Royalty Ledger Summary:** Tabular mono metrics for Total Earned, Paid to Date, and Pending Payout with a dynamic stacked progress bar.
- **Production Status:** In-production titles feature the 9-stage `ProductionStepper` with an animated progress line.
- **Zero / Rollover Alerts:** Balances under ₹1,000 clearly display the saffron rollover notification.
- **Empty State:** Smooth Lottie `empty-inbox` animation with direct editorial desk link.

### 5.4 Author New Query (`/author/tickets/new`)
- **Two-Column Layout:** Query form on left with drag-and-drop file upload zone.
- **Sticky Dynamic Context Panel:** Right column features an active `<BookCover />` preview when a book is selected, plus a photo card that cross-fades via Framer Motion `AnimatePresence` depending on query topic (Print Quality, Warehousing, Royalty, or Editorial).
- **Submission Success:** Dialog morphs into a full Lottie checkmark animation with large mono ticket ID and `ClickSpark` celebration.

### 5.5 Author Thread (`/author/tickets/[id]`)
- **Header:** Features a miniature `<BookCover />` thumbnail alongside ticket details.
- **Thread:** Chat-style timeline separating author entries from "Team BookLeaf" official replies with brand avatars.

### 5.6 Admin Queue (`/admin/tickets`)
- **High-Density Dashboard:** Stat cards with tabular `CountUp`, prominent Breached SLA terracotta indicator, and sticky multi-select filter bar.
- **Table:** 1px hairline rules, vertical priority bars, mono IDs, category tags with quiet icons, and live arrival animations.

### 5.7 Admin Ticket Detail (`/admin/tickets/[id]`)
- **Live Database Context:** Displays author history and a miniature 3D `<BookCover />` alongside real-time sales, MRP, and royalty ledger data.
- **AI Draft Hero Panel:** Leaf-green accent bar, editable draft textarea, word counter, policy verification flags, and an orbital `ai-thinking` Lottie animation during generation.

---

## 6. Verification & Screenshot Evidence

Full verification screenshots at both 1440px desktop and 375px mobile viewports have been archived:

| Screen | 1440px Desktop File | 375px Mobile File |
|---|---|---|
| **Public Landing Hero** | [`docs/design/after-v2/landing_hero_1440.png`](file:///d:/Assignments/BookLeaf/docs/design/after-v2/landing_hero_1440.png) | [`docs/design/after-v2/landing_hero_375.png`](file:///d:/Assignments/BookLeaf/docs/design/after-v2/landing_hero_375.png) |
| **Landing Bento Grid** | [`docs/design/after-v2/landing_bento_1440.png`](file:///d:/Assignments/BookLeaf/docs/design/after-v2/landing_bento_1440.png) | Included in responsive flow |
| **Split Login Screen** | [`docs/design/after-v2/login_1440.png`](file:///d:/Assignments/BookLeaf/docs/design/after-v2/login_1440.png) | Responsive compact header |
| **Author Catalog** | [`docs/design/after-v2/author_books_1440.png`](file:///d:/Assignments/BookLeaf/docs/design/after-v2/author_books_1440.png) | [`docs/design/after-v2/author_books_375.png`](file:///d:/Assignments/BookLeaf/docs/design/after-v2/author_books_375.png) |
| **Author New Ticket** | [`docs/design/after-v2/author_ticket_new_1440.png`](file:///d:/Assignments/BookLeaf/docs/design/after-v2/author_ticket_new_1440.png) | Responsive form stack |
| **Author Support List** | [`docs/design/after-v2/author_tickets_1440.png`](file:///d:/Assignments/BookLeaf/docs/design/after-v2/author_tickets_1440.png) | Responsive card list |
| **Admin Operations Queue** | [`docs/design/after-v2/admin_tickets_1440.png`](file:///d:/Assignments/BookLeaf/docs/design/after-v2/admin_tickets_1440.png) | Scrollable dense view |
| **Admin Ticket Detail** | [`docs/design/after-v2/admin_ticket_detail_1440.png`](file:///d:/Assignments/BookLeaf/docs/design/after-v2/admin_ticket_detail_1440.png) | Stacked 2-column pane |

*Before-v2 screenshots are similarly archived in `docs/design/before-v2/`.*
