/**
 * BookLeaf Royalty Logic Reference Implementation
 * Implements deterministic royalty status, next payout calculations, Indian currency/date formatting,
 * and AI output validation.
 *
 * Used by:
 * - n8n Code Nodes (Royalty Summary Workflow)
 * - Bubble.io expressions & workflows specification
 * - Unit test suite & local test harness
 */

/**
 * Format number in Indian currency style (e.g., 1,23,456)
 * @param {number} amount
 * @returns {string}
 */
function formatIndianCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
  const isNegative = amount < 0;
  const absAmount = Math.round(Math.abs(amount));
  const s = absAmount.toString();
  if (s.length <= 3) {
    return (isNegative ? '-₹' : '₹') + s;
  }
  const lastThree = s.substring(s.length - 3);
  const rest = s.substring(0, s.length - 3);
  const formattedRest = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return (isNegative ? '-₹' : '₹') + formattedRest + ',' + lastThree;
}

/**
 * Format ISO date string (YYYY-MM-DD) to 'D MMM YYYY' (e.g. '14 Nov 2025')
 * @param {string|Date|null} dateVal
 * @returns {string}
 */
function formatDateDisplay(dateVal) {
  if (!dateVal) return 'Not yet set';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return 'Not yet set';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = d.getUTCDate();
  const month = months[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Parse date safely to UTC midnight Date object
 * @param {string|Date} val
 * @returns {Date}
 */
function parseUtcDate(val) {
  if (val instanceof Date) {
    return new Date(Date.UTC(val.getUTCFullYear(), val.getUTCMonth(), val.getUTCDate()));
  }
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
    const [y, m, d] = val.split('T')[0].split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }
  const parsed = new Date(val);
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
}

/**
 * Add days to UTC date
 * @param {Date} date
 * @param {number} days
 * @returns {Date}
 */
function addDaysUtc(date, days) {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/**
 * Format UTC Date to YYYY-MM-DD
 * @param {Date} date
 * @returns {string}
 */
function toIsoDate(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Calculate royalty status for a single book
 * 
 * Rules:
 * 1. Book in production (status starts with "In Production") -> Grey 'In production' (no royalty badge)
 * 2. pending = 0 -> Green 'Paid up'
 * 3. pending > 0 and threshold ON and pending < minPayout -> Yellow 'Below ₹1,000 minimum — rolls over'
 * 4. pending > 0 and has lastPayoutDate:
 *      if lastPayoutDate < cut -> Red 'Overdue'
 *      else -> Yellow 'Pending — within normal cycle'
 * 5. pending > 0 and no payout ever:
 *      if publicationDate < cut -> Red 'Overdue — no payout yet'
 *      else -> Yellow 'Pending — within normal cycle'
 *
 * @param {Object} book
 * @param {Object} options
 * @param {string|Date} [options.asOfDate] Reference date, defaults to current date
 * @param {number} [options.overdueDays=90] Cutoff days for overdue
 * @param {number} [options.minPayout=1000] Minimum payout threshold
 * @param {boolean} [options.applyMinPayoutThreshold=true]
 * @returns {Object} status object with code, color, label, isOverdue, isProduction
 */
function calculateBookRoyaltyStatus(book, options = {}) {
  const statusText = (book.status || book.status_text || '').trim();
  const isProduction = statusText.toLowerCase().startsWith('in production');
  if (isProduction) {
    return {
      code: 'IN_PRODUCTION',
      color: 'grey',
      badge: 'Grey',
      label: 'In production',
      description: statusText || 'In Production',
      isOverdue: false,
      isProduction: true,
      pending: 0
    };
  }

  const pending = Number(book.royalty_pending || 0);
  if (pending <= 0) {
    return {
      code: 'PAID_UP',
      color: 'green',
      badge: 'Green',
      label: 'Paid up',
      description: 'Royalties fully paid up',
      isOverdue: false,
      isProduction: false,
      pending: 0
    };
  }

  const asOf = options.asOfDate ? parseUtcDate(options.asOfDate) : parseUtcDate(new Date());
  const overdueDays = options.overdueDays !== undefined ? options.overdueDays : 90;
  const minPayout = options.minPayout !== undefined ? options.minPayout : 1000;
  const applyMinThreshold = options.applyMinPayoutThreshold !== undefined ? Boolean(options.applyMinPayoutThreshold) : true;
  const cut = addDaysUtc(asOf, -overdueDays);

  // Check rollover threshold
  if (applyMinThreshold && pending < minPayout) {
    return {
      code: 'ROLLS_OVER',
      color: 'yellow',
      badge: 'Yellow',
      label: 'Below ₹1,000 minimum — rolls over',
      description: `Pending amount (${formatIndianCurrency(pending)}) is below the ₹1,000 minimum payout threshold and rolls over to next quarter`,
      isOverdue: false,
      isProduction: false,
      pending
    };
  }

  // Check last payout date or publication date against cutoff
  const lastPayoutDate = book.last_royalty_payout_date || book.last_payout_date;
  if (lastPayoutDate) {
    const payoutDateUtc = parseUtcDate(lastPayoutDate);
    if (payoutDateUtc.getTime() < cut.getTime()) {
      const daysSince = Math.floor((asOf.getTime() - payoutDateUtc.getTime()) / (1000 * 60 * 60 * 24));
      return {
        code: 'OVERDUE',
        color: 'red',
        badge: 'Red',
        label: 'Overdue',
        description: `Last payout was ${daysSince} days ago (exceeds ${overdueDays}-day cycle)`,
        daysSince,
        isOverdue: true,
        isProduction: false,
        pending
      };
    } else {
      return {
        code: 'PENDING_CYCLE',
        color: 'yellow',
        badge: 'Yellow',
        label: 'Pending — within normal cycle',
        description: 'Pending amount is within normal quarterly payout cycle',
        isOverdue: false,
        isProduction: false,
        pending
      };
    }
  }

  // No payout ever made
  const pubDate = book.publication_date;
  if (pubDate) {
    const pubDateUtc = parseUtcDate(pubDate);
    if (pubDateUtc.getTime() < cut.getTime()) {
      const daysSince = Math.floor((asOf.getTime() - pubDateUtc.getTime()) / (1000 * 60 * 60 * 24));
      return {
        code: 'OVERDUE_NO_PAYOUT',
        color: 'red',
        badge: 'Red',
        label: 'Overdue — no payout yet',
        description: `Published on ${formatDateDisplay(pubDate)} (${daysSince} days ago) with no payout yet`,
        daysSince,
        isOverdue: true,
        isProduction: false,
        pending
      };
    }
  }

  return {
    code: 'PENDING_CYCLE',
    color: 'yellow',
    badge: 'Yellow',
    label: 'Pending — within normal cycle',
    description: 'Pending amount is within normal quarterly payout cycle',
    isOverdue: false,
    isProduction: false,
    pending
  };
}

/**
 * Calculate author aggregate totals and payout filter status
 * 
 * Author-level payout status:
 * - Any book Red -> Overdue
 * - Else any book pending > 0 -> Pending
 * - Else -> Fully paid
 *
 * @param {Array<Object>} books
 * @param {Object} options
 * @returns {Object} { totalBooks, totalEarned, totalPaid, totalPending, payoutStatus, bookStatuses }
 */
function calculateAuthorStats(books, options = {}) {
  const list = books || [];
  let totalEarned = 0;
  let totalPaid = 0;
  let totalPending = 0;
  let hasRed = false;
  let hasPending = false;

  const bookStatuses = list.map((book) => {
    const status = calculateBookRoyaltyStatus(book, options);
    if (!status.isProduction) {
      totalEarned += Number(book.total_royalty_earned || 0);
      totalPaid += Number(book.royalty_paid || 0);
      totalPending += Number(book.royalty_pending || 0);
    }
    if (status.color === 'red') {
      hasRed = true;
    }
    if (status.pending > 0) {
      hasPending = true;
    }
    return { book, status };
  });

  let payoutStatus = 'Fully paid';
  if (hasRed) {
    payoutStatus = 'Overdue';
  } else if (hasPending) {
    payoutStatus = 'Pending';
  }

  return {
    totalBooks: list.length,
    totalEarned,
    totalPaid,
    totalPending,
    payoutStatus,
    bookStatuses
  };
}

/**
 * Calculate next payout cycle information according to BookLeaf Knowledge Base:
 * Calendar quarters:
 * Q1: 1 Jan - 31 Mar (end: 31 Mar)
 * Q2: 1 Apr - 30 Jun (end: 30 Jun)
 * Q3: 1 Jul - 30 Sep (end: 30 Sep)
 * Q4: 1 Oct - 31 Dec (end: 31 Dec)
 * 
 * Let prevQEnd = end of last completed quarter before asOf
 * prevDeadline = prevQEnd + 45 days
 * curQEnd = end of current quarter
 * 
 * If asOf <= prevDeadline:
 *   "payout for the quarter ended prevQEnd is due by prevDeadline"
 * Else:
 *   "next payout is for the quarter ending curQEnd, due by curQEnd + 45 days"
 *
 * Overdue by cycle flag:
 * pending >= threshold AND asOf > prevDeadline AND (no payout ever OR lastPayoutDate <= prevQEnd)
 *
 * @param {string|Date} asOfDate
 * @param {number} totalPending
 * @param {string|Date|null} lastPayoutDate
 * @param {number} [minThreshold=1000]
 * @returns {Object} next payout explanation details and flags
 */
function calculateNextPayoutDate(asOfDate, totalPending = 0, lastPayoutDate = null, minThreshold = 1000) {
  const asOf = asOfDate ? parseUtcDate(asOfDate) : parseUtcDate(new Date());
  const year = asOf.getUTCFullYear();
  const month = asOf.getUTCMonth(); // 0 to 11

  // Current quarter determination (0-based quarter: 0, 1, 2, 3)
  const curQ = Math.floor(month / 3);
  const curQEnds = [
    new Date(Date.UTC(year, 2, 31)), // 31 Mar
    new Date(Date.UTC(year, 5, 30)), // 30 Jun
    new Date(Date.UTC(year, 8, 30)), // 30 Sep
    new Date(Date.UTC(year, 11, 31)) // 31 Dec
  ];
  const curQEnd = curQEnds[curQ];

  // Previous quarter end determination
  let prevQEnd;
  if (curQ === 0) {
    prevQEnd = new Date(Date.UTC(year - 1, 11, 31)); // 31 Dec previous year
  } else {
    prevQEnd = curQEnds[curQ - 1];
  }

  const prevDeadline = addDaysUtc(prevQEnd, 45);
  const curDeadline = addDaysUtc(curQEnd, 45);

  const prevQEndIso = toIsoDate(prevQEnd);
  const prevDeadlineIso = toIsoDate(prevDeadline);
  const curQEndIso = toIsoDate(curQEnd);
  const curDeadlineIso = toIsoDate(curDeadline);

  const prevQEndDisplay = formatDateDisplay(prevQEndIso);
  const prevDeadlineDisplay = formatDateDisplay(prevDeadlineIso);
  const curQEndDisplay = formatDateDisplay(curQEndIso);
  const curDeadlineDisplay = formatDateDisplay(curDeadlineIso);

  const isBeforeOrOnPrevDeadline = asOf.getTime() <= prevDeadline.getTime();

  let explanation = '';
  let targetQuarterEnd = '';
  let targetDeadline = '';
  let targetQuarterEndDisplay = '';
  let targetDeadlineDisplay = '';

  if (isBeforeOrOnPrevDeadline) {
    targetQuarterEnd = prevQEndIso;
    targetDeadline = prevDeadlineIso;
    targetQuarterEndDisplay = prevQEndDisplay;
    targetDeadlineDisplay = prevDeadlineDisplay;
    explanation = `Payout for the quarter ended ${prevQEndDisplay} is due by ${prevDeadlineDisplay}.`;
  } else {
    targetQuarterEnd = curQEndIso;
    targetDeadline = curDeadlineIso;
    targetQuarterEndDisplay = curQEndDisplay;
    targetDeadlineDisplay = curDeadlineDisplay;
    explanation = `Next payout is for the quarter ending ${curQEndDisplay}, due by ${curDeadlineDisplay}.`;
  }

  // Check overdueByCycle flag
  let overdueByCycle = false;
  if (totalPending >= minThreshold && asOf.getTime() > prevDeadline.getTime()) {
    if (!lastPayoutDate) {
      overdueByCycle = true;
    } else {
      const lp = parseUtcDate(lastPayoutDate);
      if (lp.getTime() <= prevQEnd.getTime()) {
        overdueByCycle = true;
      }
    }
  }

  return {
    asOfDateIso: toIsoDate(asOf),
    asOfDateDisplay: formatDateDisplay(toIsoDate(asOf)),
    prevQEnd: prevQEndIso,
    prevQEndDisplay,
    prevDeadline: prevDeadlineIso,
    prevDeadlineDisplay,
    curQEnd: curQEndIso,
    curQEndDisplay,
    curDeadline: curDeadlineIso,
    curDeadlineDisplay,
    isBeforeOrOnPrevDeadline,
    targetQuarterEnd,
    targetQuarterEndDisplay,
    targetDeadline,
    targetDeadlineDisplay,
    explanation,
    overdueByCycle
  };
}

/**
 * Build consolidated facts object for an author, formatted for n8n AI consumption.
 * Pre-formats every currency and date string so the LLM copies directly without computing.
 *
 * @param {Object} author
 * @param {Array<Object>} books
 * @param {Object} options
 * @returns {Object} facts object + scenario directives
 */
function buildAuthorFacts(author, books = [], options = {}) {
  const authorName = (author.name || '').trim();
  const authorFirstName = authorName.split(' ')[0] || authorName;
  const stats = calculateAuthorStats(books, options);
  const minThreshold = options.minPayout !== undefined ? options.minPayout : 1000;

  // Find most recent payout date among published books
  let latestPayoutDate = null;
  books.forEach((b) => {
    const lp = b.last_royalty_payout_date || b.last_payout_date;
    if (lp) {
      if (!latestPayoutDate || new Date(lp).getTime() > new Date(latestPayoutDate).getTime()) {
        latestPayoutDate = lp;
      }
    }
  });

  const nextPayout = calculateNextPayoutDate(
    options.asOfDate,
    stats.totalPending,
    latestPayoutDate,
    minThreshold
  );

  const publishedBooks = [];
  const inProductionBooks = [];

  stats.bookStatuses.forEach(({ book, status }) => {
    if (status.isProduction) {
      inProductionBooks.push({
        bookCode: book.book_id || book.book_code || '',
        title: book.title || '',
        stage: status.description || 'In Production',
        printPartner: book.print_partner || 'Not yet set'
      });
    } else {
      const earned = Number(book.total_royalty_earned || 0);
      const paid = Number(book.royalty_paid || 0);
      const pending = Number(book.royalty_pending || 0);
      const copies = Number(book.total_copies_sold || 0);
      const lastPayout = book.last_royalty_payout_date || book.last_payout_date;

      publishedBooks.push({
        bookCode: book.book_id || book.book_code || '',
        title: book.title || '',
        genre: book.genre || '',
        copiesSold: copies,
        copiesSoldDisplay: copies.toLocaleString('en-IN'),
        royaltyEarned: earned,
        royaltyEarnedDisplay: formatIndianCurrency(earned),
        royaltyPaid: paid,
        royaltyPaidDisplay: formatIndianCurrency(paid),
        royaltyPending: pending,
        royaltyPendingDisplay: formatIndianCurrency(pending),
        lastPayoutDate: lastPayout || null,
        lastPayoutDateDisplay: lastPayout ? formatDateDisplay(lastPayout) : 'No payout yet',
        royaltyStatus: status.label,
        statusColor: status.color,
        isOverdue: status.isOverdue
      });
    }
  });

  // Determine scenario flags
  const allPaid = stats.totalPending === 0 && publishedBooks.length > 0;
  const hasPending = stats.totalPending > 0;
  const neverPaid = publishedBooks.length > 0 && stats.totalPaid === 0;
  const belowThreshold = hasPending && (options.applyMinPayoutThreshold !== false) && stats.totalPending < minThreshold;
  const hasInProduction = inProductionBooks.length > 0;
  const isOverdue = stats.payoutStatus === 'Overdue' || nextPayout.overdueByCycle;

  // Directives for LLM based on scenarios
  const scenarioDirectives = [];
  if (allPaid) {
    scenarioDirectives.push('ALL_PAID: Confirm warmly that all royalties are fully settled up to date. Express gratitude for their partnership.');
  }
  if (belowThreshold) {
    scenarioDirectives.push(`BELOW_THRESHOLD: Explain that the current pending balance (${formatIndianCurrency(stats.totalPending)}) is below the ₹1,000 threshold and rolls over to the next quarterly payout cycle as per policy. Clearly clarify this is standard policy, not a delay.`);
  } else if (isOverdue) {
    scenarioDirectives.push(`OVERDUE: Acknowledge the payout delay directly with empathy and zero corporate deflection. State that the author relations team has escalated the pending payment to finance and will respond with an update within 48 hours.`);
  } else if (hasPending) {
    scenarioDirectives.push(`PENDING_NORMAL: Explain the upcoming quarterly payout timeline clearly based on the 45-day window: ${nextPayout.explanation}`);
  }
  if (neverPaid && !allPaid) {
    scenarioDirectives.push('NEVER_PAID: Acknowledge that this will be their first royalty payout and provide reassurance on the bank transfer process.');
  }
  if (hasInProduction) {
    scenarioDirectives.push('HAS_IN_PRODUCTION: Provide a brief reassuring status update for books in production. Mention the current stage (e.g. Cover Design or Typesetting) and note that typical review turnaround takes place here, reassuring them they will receive an email notification as each stage completes.');
  }

  // Pre-compiled list of all valid currency and date strings for fact-checking
  const validAmounts = new Set();
  const validDates = new Set();

  [stats.totalEarned, stats.totalPaid, stats.totalPending, minThreshold].forEach((amt) => {
    validAmounts.add(formatIndianCurrency(amt));
  });

  publishedBooks.forEach((b) => {
    validAmounts.add(b.royaltyEarnedDisplay);
    validAmounts.add(b.royaltyPaidDisplay);
    validAmounts.add(b.royaltyPendingDisplay);
    if (b.lastPayoutDate) {
      validDates.add(b.lastPayoutDateDisplay);
    }
  });

  [nextPayout.prevDeadlineDisplay, nextPayout.curDeadlineDisplay, nextPayout.targetDeadlineDisplay, nextPayout.asOfDateDisplay].forEach((d) => {
    if (d && d !== 'Not yet set') validDates.add(d);
  });

  return {
    facts: {
      authorCode: author.author_id || author.author_code || '',
      authorName,
      authorFirstName,
      city: author.city || '',
      asOfDate: nextPayout.asOfDateDisplay,
      totals: {
        totalBooks: stats.totalBooks,
        publishedCount: publishedBooks.length,
        inProductionCount: inProductionBooks.length,
        totalEarned: stats.totalEarned,
        totalEarnedDisplay: formatIndianCurrency(stats.totalEarned),
        totalPaid: stats.totalPaid,
        totalPaidDisplay: formatIndianCurrency(stats.totalPaid),
        totalPending: stats.totalPending,
        totalPendingDisplay: formatIndianCurrency(stats.totalPending)
      },
      payoutStatus: stats.payoutStatus,
      books: publishedBooks,
      inProduction: inProductionBooks,
      nextPayout: {
        explanation: nextPayout.explanation,
        targetQuarterEnd: nextPayout.targetQuarterEndDisplay,
        targetDeadline: nextPayout.targetDeadlineDisplay,
        overdueByCycle: nextPayout.overdueByCycle
      },
      flags: {
        allPaid,
        hasPending,
        neverPaid,
        belowThreshold,
        hasInProduction,
        isOverdue
      }
    },
    scenarioDirectives,
    factCheckReference: {
      validAmounts: Array.from(validAmounts),
      validDates: Array.from(validDates),
      authorFirstName,
      publishedBookTitles: publishedBooks.map((b) => b.title),
      inProductionBookTitles: inProductionBooks.map((b) => b.title)
    }
  };
}

/**
 * Validate LLM Output for format, tone and factual accuracy
 * 
 * Rules:
 * - Valid JSON with 'subject' and 'body'
 * - Body contains author's first name
 * - Word count between 150 and 400 words
 * - No markdown headings ('#')
 * - No template placeholders like '[Author Name]' or '[Date]'
 * - Every rupee amount in body (matching /₹[\d,]+/) must be in validAmounts set
 *
 * @param {string|Object} rawOutput
 * @param {Object} factCheckReference
 * @returns {Object} { isValid: boolean, parsed: Object|null, errors: string[] }
 */
function validateAiOutput(rawOutput, factCheckReference) {
  const errors = [];
  let parsed = null;

  if (typeof rawOutput === 'string') {
    try {
      // Clean possible markdown code fences
      let cleaned = rawOutput.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      parsed = JSON.parse(cleaned);
    } catch (e) {
      return {
        isValid: false,
        parsed: null,
        errors: [`Invalid JSON output: ${e.message}`]
      };
    }
  } else if (typeof rawOutput === 'object' && rawOutput !== null) {
    parsed = rawOutput;
  } else {
    return {
      isValid: false,
      parsed: null,
      errors: ['Output is not an object or valid JSON string']
    };
  }

  if (!parsed.subject || typeof parsed.subject !== 'string' || parsed.subject.trim().length === 0) {
    errors.push('Missing or empty email subject');
  }

  if (!parsed.body || typeof parsed.body !== 'string' || parsed.body.trim().length === 0) {
    errors.push('Missing or empty email body');
    return { isValid: false, parsed, errors };
  }

  const body = parsed.body.trim();

  // Word count check (150 - 400 words)
  const words = body.split(/\s+/).filter(Boolean);
  if (words.length < 130) {
    errors.push(`Email body is too brief (${words.length} words; minimum expected is ~150 words)`);
  } else if (words.length > 450) {
    errors.push(`Email body is too lengthy (${words.length} words; maximum expected is ~400 words)`);
  }

  // Check author's first name in greeting
  if (factCheckReference && factCheckReference.authorFirstName) {
    const fnRegex = new RegExp(`\\b${factCheckReference.authorFirstName}\\b`, 'i');
    if (!fnRegex.test(body)) {
      errors.push(`Email body missing author's first name: ${factCheckReference.authorFirstName}`);
    }
  }

  // Check for forbidden markdown headings
  if (/^#{1,6}\s+/m.test(body)) {
    errors.push('Email body contains markdown headings (# or ##), which violates plain text formatting');
  }

  // Check for unresolved placeholders like [Name], [Amount], [Date]
  const placeholderMatch = body.match(/\[(Author|Name|Date|Amount|Title|Book|Insert)[^\]]*\]/i);
  if (placeholderMatch) {
    errors.push(`Email body contains unresolved placeholder: ${placeholderMatch[0]}`);
  }

  // Fact check: extract all rupee amounts in body and verify they exist in factCheckReference
  if (factCheckReference && factCheckReference.validAmounts) {
    const validSet = new Set(factCheckReference.validAmounts);
    const amountMatches = body.match(/₹\s*[\d,]+/g) || [];
    for (const amt of amountMatches) {
      const normalized = amt.replace(/\s+/g, '');
      if (!validSet.has(normalized)) {
        errors.push(`Hallucinated or unverified currency amount in body: ${amt} (allowed: ${Array.from(validSet).join(', ')})`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    parsed,
    errors
  };
}

// Module exports for CommonJS & ESM
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    formatIndianCurrency,
    formatDateDisplay,
    parseUtcDate,
    addDaysUtc,
    toIsoDate,
    calculateBookRoyaltyStatus,
    calculateAuthorStats,
    calculateNextPayoutDate,
    buildAuthorFacts,
    validateAiOutput
  };
}
