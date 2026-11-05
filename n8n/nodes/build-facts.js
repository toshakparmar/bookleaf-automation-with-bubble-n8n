/**
 * Node: Build Facts & Display Strings
 * Processes Bubble records into deterministic facts with Indian currency and date display strings.
 */

// Helper functions embedded directly for standalone n8n execution
function formatIndianCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
  const isNegative = amount < 0;
  const absAmount = Math.round(Math.abs(amount));
  const s = absAmount.toString();
  if (s.length <= 3) return (isNegative ? '-₹' : '₹') + s;
  const lastThree = s.substring(s.length - 3);
  const rest = s.substring(0, s.length - 3);
  const formattedRest = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return (isNegative ? '-₹' : '₹') + formattedRest + ',' + lastThree;
}

function formatDateDisplay(dateVal) {
  if (!dateVal) return 'Not yet set';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return 'Not yet set';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function parseUtcDate(val) {
  if (val instanceof Date) return new Date(Date.UTC(val.getUTCFullYear(), val.getUTCMonth(), val.getUTCDate()));
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
    const [y, m, d] = val.split('T')[0].split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }
  const parsed = new Date(val);
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
}

function addDaysUtc(date, days) {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function toIsoDate(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const authorData = $node['Fetch Author Data'].json.response || $node['Fetch Author Data'].json;
const booksData = ($node['Fetch Books Data'].json.response && $node['Fetch Books Data'].json.response.results)
  ? $node['Fetch Books Data'].json.response.results
  : ($node['Fetch Books Data'].json.results || []);
const settingsData = ($node['Fetch Settings'].json.response && $node['Fetch Settings'].json.response.results && $node['Fetch Settings'].json.response.results[0])
  ? $node['Fetch Settings'].json.response.results[0]
  : ($node['Fetch Settings'].json || {});

const asOfDate = settingsData.as_of_date || '2025-12-15';
const overdueDays = settingsData.overdue_days !== undefined ? Number(settingsData.overdue_days) : 90;
const minPayout = settingsData.min_payout !== undefined ? Number(settingsData.min_payout) : 1000;
const applyMinThreshold = settingsData.apply_min_threshold !== undefined ? Boolean(settingsData.apply_min_threshold) : true;

const asOf = parseUtcDate(asOfDate);
const cut = addDaysUtc(asOf, -overdueDays);

let totalEarned = 0;
let totalPaid = 0;
let totalPending = 0;
let hasRed = false;
let latestPayoutDate = null;

const publishedBooks = [];
const inProductionBooks = [];

booksData.forEach((b) => {
  const statusText = (b.status_text || b.status || '').trim();
  const isProduction = statusText.toLowerCase().startsWith('in production');

  if (isProduction) {
    inProductionBooks.push({
      bookCode: b.book_code || b.book_id || '',
      title: b.title || '',
      stage: statusText || 'In Production',
      printPartner: b.print_partner || 'Not yet set'
    });
  } else {
    const earned = Number(b.royalty_earned || b.total_royalty_earned || 0);
    const paid = Number(b.royalty_paid || 0);
    const pending = Number(b.royalty_pending || 0);
    const copies = Number(b.copies_sold || b.total_copies_sold || 0);
    const lastPayout = b.last_payout_date || b.last_royalty_payout_date || null;

    totalEarned += earned;
    totalPaid += paid;
    totalPending += pending;

    if (lastPayout && (!latestPayoutDate || new Date(lastPayout).getTime() > new Date(latestPayoutDate).getTime())) {
      latestPayoutDate = lastPayout;
    }

    let statusLabel = 'Pending — within normal cycle';
    let statusColor = 'yellow';
    let isOverdue = false;

    if (pending <= 0) {
      statusLabel = 'Paid up';
      statusColor = 'green';
    } else if (applyMinThreshold && pending < minPayout) {
      statusLabel = 'Below ₹1,000 minimum — rolls over';
      statusColor = 'yellow';
    } else if (lastPayout) {
      const lpUtc = parseUtcDate(lastPayout);
      if (lpUtc.getTime() < cut.getTime()) {
        statusLabel = 'Overdue';
        statusColor = 'red';
        isOverdue = true;
        hasRed = true;
      }
    } else if (b.publication_date) {
      const pubUtc = parseUtcDate(b.publication_date);
      if (pubUtc.getTime() < cut.getTime()) {
        statusLabel = 'Overdue — no payout yet';
        statusColor = 'red';
        isOverdue = true;
        hasRed = true;
      }
    }

    publishedBooks.push({
      bookCode: b.book_code || b.book_id || '',
      title: b.title || '',
      genre: b.genre || '',
      copiesSold: copies,
      copiesSoldDisplay: copies.toLocaleString('en-IN'),
      royaltyEarned: earned,
      royaltyEarnedDisplay: formatIndianCurrency(earned),
      royaltyPaid: paid,
      royaltyPaidDisplay: formatIndianCurrency(paid),
      royaltyPending: pending,
      royaltyPendingDisplay: formatIndianCurrency(pending),
      lastPayoutDate: lastPayout,
      lastPayoutDateDisplay: lastPayout ? formatDateDisplay(lastPayout) : 'No payout yet',
      royaltyStatus: statusLabel,
      statusColor,
      isOverdue
    });
  }
});

// Payout status
let payoutStatus = 'Fully paid';
if (hasRed) payoutStatus = 'Overdue';
else if (totalPending > 0) payoutStatus = 'Pending';

// Next payout date calculation
const year = asOf.getUTCFullYear();
const month = asOf.getUTCMonth();
const curQ = Math.floor(month / 3);
const curQEnds = [
  new Date(Date.UTC(year, 2, 31)),
  new Date(Date.UTC(year, 5, 30)),
  new Date(Date.UTC(year, 8, 30)),
  new Date(Date.UTC(year, 11, 31))
];
const curQEnd = curQEnds[curQ];
const prevQEnd = curQ === 0 ? new Date(Date.UTC(year - 1, 11, 31)) : curQEnds[curQ - 1];
const prevDeadline = addDaysUtc(prevQEnd, 45);
const curDeadline = addDaysUtc(curQEnd, 45);

const isBeforeOrOnPrevDeadline = asOf.getTime() <= prevDeadline.getTime();
const nextExplanation = isBeforeOrOnPrevDeadline
  ? `Payout for the quarter ended ${formatDateDisplay(toIsoDate(prevQEnd))} is due by ${formatDateDisplay(toIsoDate(prevDeadline))}.`
  : `Next payout is for the quarter ending ${formatDateDisplay(toIsoDate(curQEnd))}, due by ${formatDateDisplay(toIsoDate(curDeadline))}.`;

let overdueByCycle = false;
if (totalPending >= minPayout && asOf.getTime() > prevDeadline.getTime()) {
  if (!latestPayoutDate || parseUtcDate(latestPayoutDate).getTime() <= prevQEnd.getTime()) {
    overdueByCycle = true;
  }
}

const allPaid = totalPending === 0 && publishedBooks.length > 0;
const hasPending = totalPending > 0;
const neverPaid = publishedBooks.length > 0 && totalPaid === 0;
const belowThreshold = hasPending && applyMinThreshold && totalPending < minPayout;
const hasInProduction = inProductionBooks.length > 0;
const isOverdue = payoutStatus === 'Overdue' || overdueByCycle;

const scenarioDirectives = [];
if (allPaid) {
  scenarioDirectives.push('ALL_PAID: Confirm warmly that all royalties are fully settled up to date. Express gratitude for their partnership.');
}
if (belowThreshold) {
  scenarioDirectives.push(`BELOW_THRESHOLD: Explain that the current pending balance (${formatIndianCurrency(totalPending)}) is below the ₹1,000 threshold and rolls over to the next quarterly payout cycle as per policy. Clearly clarify this is standard policy, not a delay.`);
} else if (isOverdue) {
  scenarioDirectives.push('OVERDUE: Acknowledge the payout delay directly with empathy and zero corporate deflection. State that the author relations team has escalated the pending payment to finance and will respond with an update within 48 hours.');
} else if (hasPending) {
  scenarioDirectives.push(`PENDING_NORMAL: Explain the upcoming quarterly payout timeline clearly based on the 45-day window: ${nextExplanation}`);
}
if (neverPaid && !allPaid) {
  scenarioDirectives.push('NEVER_PAID: Acknowledge that this will be their first royalty payout and provide reassurance on the bank transfer process.');
}
if (hasInProduction) {
  scenarioDirectives.push('HAS_IN_PRODUCTION: Provide a brief reassuring status update for books in production. Mention the current stage (e.g. Cover Design or Typesetting) and note that typical review turnaround takes place here, reassuring them they will receive an email notification as each stage completes.');
}

const validAmounts = new Set();
const validDates = new Set();
[totalEarned, totalPaid, totalPending, minPayout].forEach(amt => validAmounts.add(formatIndianCurrency(amt)));
publishedBooks.forEach(b => {
  validAmounts.add(b.royaltyEarnedDisplay);
  validAmounts.add(b.royaltyPaidDisplay);
  validAmounts.add(b.royaltyPendingDisplay);
  if (b.lastPayoutDate) validDates.add(b.lastPayoutDateDisplay);
});
validDates.add(formatDateDisplay(toIsoDate(prevDeadline)));
validDates.add(formatDateDisplay(toIsoDate(curDeadline)));
validDates.add(formatDateDisplay(toIsoDate(asOf)));

const authorName = (authorData.name || '').trim();
const authorFirstName = authorName.split(' ')[0] || authorName;

return {
  json: {
    logId: $json.logId,
    authorId: $json.authorId,
    authorCode: authorData.author_code || $json.authorCode,
    triggerType: $json.triggerType,
    triggeredByEmail: $json.triggeredByEmail,
    requestedAt: $json.requestedAt,
    facts: {
      authorCode: authorData.author_code || $json.authorCode,
      authorName,
      authorFirstName,
      city: authorData.city || '',
      asOfDate: formatDateDisplay(toIsoDate(asOf)),
      totals: {
        totalBooks: booksData.length,
        publishedCount: publishedBooks.length,
        inProductionCount: inProductionBooks.length,
        totalEarned,
        totalEarnedDisplay: formatIndianCurrency(totalEarned),
        totalPaid,
        totalPaidDisplay: formatIndianCurrency(totalPaid),
        totalPending,
        totalPendingDisplay: formatIndianCurrency(totalPending)
      },
      payoutStatus,
      books: publishedBooks,
      inProduction: inProductionBooks,
      nextPayout: {
        explanation: nextExplanation,
        targetQuarterEnd: formatDateDisplay(toIsoDate(isBeforeOrOnPrevDeadline ? prevQEnd : curQEnd)),
        targetDeadline: formatDateDisplay(toIsoDate(isBeforeOrOnPrevDeadline ? prevDeadline : curDeadline)),
        overdueByCycle
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
      authorFirstName
    }
  }
};
