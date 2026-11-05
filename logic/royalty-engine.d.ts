export interface Book {
  book_id?: string;
  book_code?: string;
  title: string;
  isbn?: string;
  genre?: string;
  publication_date?: string | null;
  status?: string;
  status_text?: string;
  mrp?: number | null;
  author_royalty_per_copy?: number | null;
  total_copies_sold?: number;
  total_royalty_earned?: number;
  royalty_paid?: number;
  royalty_pending?: number;
  last_royalty_payout_date?: string | null;
  last_payout_date?: string | null;
  print_partner?: string;
  available_on?: string[];
  platforms?: string[];
}

export interface Author {
  author_id?: string;
  author_code?: string;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  joined_date?: string;
  books?: Book[];
}

export interface RoyaltyStatus {
  code: string;
  color: 'green' | 'yellow' | 'red' | 'grey';
  badge: 'Green' | 'Yellow' | 'Red' | 'Grey';
  label: string;
  description: string;
  daysSince?: number;
  isOverdue: boolean;
  isProduction: boolean;
  pending: number;
}

export interface AuthorStats {
  totalBooks: number;
  totalEarned: number;
  totalPaid: number;
  totalPending: number;
  payoutStatus: 'Fully paid' | 'Pending' | 'Overdue';
  bookStatuses: Array<{ book: Book; status: RoyaltyStatus }>;
}

export interface NextPayoutInfo {
  asOfDateIso: string;
  asOfDateDisplay: string;
  prevQEnd: string;
  prevQEndDisplay: string;
  prevDeadline: string;
  prevDeadlineDisplay: string;
  curQEnd: string;
  curQEndDisplay: string;
  curDeadline: string;
  curDeadlineDisplay: string;
  isBeforeOrOnPrevDeadline: boolean;
  targetQuarterEnd: string;
  targetQuarterEndDisplay: string;
  targetDeadline: string;
  targetDeadlineDisplay: string;
  explanation: string;
  overdueByCycle: boolean;
}

export interface AuthorFactsResult {
  facts: {
    authorCode: string;
    authorName: string;
    authorFirstName: string;
    city: string;
    asOfDate: string;
    totals: {
      totalBooks: number;
      publishedCount: number;
      inProductionCount: number;
      totalEarned: number;
      totalEarnedDisplay: string;
      totalPaid: number;
      totalPaidDisplay: string;
      totalPending: number;
      totalPendingDisplay: string;
    };
    payoutStatus: string;
    books: Array<{
      bookCode: string;
      title: string;
      genre: string;
      copiesSold: number;
      copiesSoldDisplay: string;
      royaltyEarned: number;
      royaltyEarnedDisplay: string;
      royaltyPaid: number;
      royaltyPaidDisplay: string;
      royaltyPending: number;
      royaltyPendingDisplay: string;
      lastPayoutDate: string | null;
      lastPayoutDateDisplay: string;
      royaltyStatus: string;
      statusColor: string;
      isOverdue: boolean;
    }>;
    inProduction: Array<{
      bookCode: string;
      title: string;
      stage: string;
      printPartner: string;
    }>;
    nextPayout: {
      explanation: string;
      targetQuarterEnd: string;
      targetDeadline: string;
      overdueByCycle: boolean;
    };
    flags: {
      allPaid: boolean;
      hasPending: boolean;
      neverPaid: boolean;
      belowThreshold: boolean;
      hasInProduction: boolean;
      isOverdue: boolean;
    };
  };
  scenarioDirectives: string[];
  factCheckReference: {
    validAmounts: string[];
    validDates: string[];
    authorFirstName: string;
    publishedBookTitles: string[];
    inProductionBookTitles: string[];
  };
}

export function formatIndianCurrency(amount: number | null | undefined): string;
export function formatDateDisplay(dateVal: string | Date | null | undefined): string;
export function parseUtcDate(val: string | Date): Date;
export function addDaysUtc(date: Date, days: number): Date;
export function toIsoDate(date: Date): string;
export function calculateBookRoyaltyStatus(book: Book, options?: { asOfDate?: string | Date; overdueDays?: number; minPayout?: number; applyMinPayoutThreshold?: boolean }): RoyaltyStatus;
export function calculateAuthorStats(books: Book[], options?: { asOfDate?: string | Date; overdueDays?: number; minPayout?: number; applyMinPayoutThreshold?: boolean }): AuthorStats;
export function calculateNextPayoutDate(asOfDate?: string | Date, totalPending?: number, lastPayoutDate?: string | Date | null, minThreshold?: number): NextPayoutInfo;
export function buildAuthorFacts(author: Author, books?: Book[], options?: { asOfDate?: string | Date; overdueDays?: number; minPayout?: number; applyMinPayoutThreshold?: boolean }): AuthorFactsResult;
export function validateAiOutput(rawOutput: string | object, factCheckReference?: { validAmounts?: string[]; validDates?: string[]; authorFirstName?: string }): { isValid: boolean; parsed: { subject: string; body: string } | null; errors: string[] };
