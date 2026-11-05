const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const sampleData = require('../data/bookleaf_sample_data.json');
const {
  formatIndianCurrency,
  formatDateDisplay,
  parseUtcDate,
  calculateBookRoyaltyStatus,
  calculateAuthorStats,
  calculateNextPayoutDate,
  buildAuthorFacts,
  validateAiOutput
} = require('./royalty-engine.js');

test('Currency Formatting (Indian grouping)', () => {
  assert.strictEqual(formatIndianCurrency(0), '₹0');
  assert.strictEqual(formatIndianCurrency(850), '₹850');
  assert.strictEqual(formatIndianCurrency(2546), '₹2,546');
  assert.strictEqual(formatIndianCurrency(19908), '₹19,908');
  assert.strictEqual(formatIndianCurrency(84024), '₹84,024');
  assert.strictEqual(formatIndianCurrency(1234567), '₹12,34,567');
  assert.strictEqual(formatIndianCurrency(null), '₹0');
});

test('Date Formatting (D MMM YYYY)', () => {
  assert.strictEqual(formatDateDisplay('2025-10-15'), '15 Oct 2025');
  assert.strictEqual(formatDateDisplay('2026-11-04'), '4 Nov 2026');
  assert.strictEqual(formatDateDisplay(null), 'Not yet set');
  assert.strictEqual(formatDateDisplay(''), 'Not yet set');
});

test('Next Payout Date Logic (Quarterly + 45-day cycle)', () => {
  // Case A: 2026-11-04 -> prevQEnd: 2026-09-30, prevDeadline: 2026-11-14.
  // Since 2026-11-04 <= 2026-11-14, due by 14 Nov 2026
  const nov2026 = calculateNextPayoutDate('2026-11-04', 3570, '2025-10-15');
  assert.strictEqual(nov2026.prevQEnd, '2026-09-30');
  assert.strictEqual(nov2026.prevDeadline, '2026-11-14');
  assert.strictEqual(nov2026.targetDeadlineDisplay, '14 Nov 2026');
  assert.strictEqual(nov2026.isBeforeOrOnPrevDeadline, true);
  assert.strictEqual(nov2026.explanation, 'Payout for the quarter ended 30 Sep 2026 is due by 14 Nov 2026.');

  // Case B: 2025-12-15 -> prevQEnd: 2025-09-30, prevDeadline: 2025-11-14 passed.
  // Next: quarter ending 31 Dec 2025, due by 14 Feb 2026
  const dec2025 = calculateNextPayoutDate('2025-12-15', 3570, '2025-10-15');
  assert.strictEqual(dec2025.prevQEnd, '2025-09-30');
  assert.strictEqual(dec2025.prevDeadline, '2025-11-14');
  assert.strictEqual(dec2025.isBeforeOrOnPrevDeadline, false);
  assert.strictEqual(dec2025.curQEnd, '2025-12-31');
  assert.strictEqual(dec2025.targetDeadlineDisplay, '14 Feb 2026');
  assert.strictEqual(dec2025.explanation, 'Next payout is for the quarter ending 31 Dec 2025, due by 14 Feb 2026.');

  // Quarter edge cases:
  // Jan 1: previous quarter was Q4 of previous year (31 Dec), deadline is Feb 14
  const jan1 = calculateNextPayoutDate('2026-01-01', 1000);
  assert.strictEqual(jan1.prevQEnd, '2025-12-31');
  assert.strictEqual(jan1.prevDeadline, '2026-02-14');
  assert.strictEqual(jan1.targetDeadlineDisplay, '14 Feb 2026');

  // Jul 1: previous quarter was Q2 (30 Jun), deadline is Aug 14
  const jul1 = calculateNextPayoutDate('2026-07-01', 1000);
  assert.strictEqual(jul1.prevQEnd, '2026-06-30');
  assert.strictEqual(jul1.prevDeadline, '2026-08-14');
  assert.strictEqual(jul1.targetDeadlineDisplay, '14 Aug 2026');
});

test('Dataset Invariants and Expected Author Totals (§2 Table)', () => {
  const expectedTotals = {
    AUTH001: { name: 'Priya Sharma', books: 2, earned: 19908, paid: 16338, pending: 3570 },
    AUTH002: { name: 'Rohit Kapoor', books: 2, earned: 84024, paid: 71000, pending: 13024 },
    AUTH003: { name: 'Ananya Reddy', books: 1, earned: 2546, paid: 0, pending: 2546 },
    AUTH004: { name: 'Vikram Joshi', books: 2, earned: 15195, paid: 11845, pending: 3350 },
    AUTH005: { name: 'Meera Nair', books: 2, earned: 25295, paid: 22240, pending: 3055 },
    AUTH006: { name: 'Arjun Malhotra', books: 1, earned: 2464, paid: 0, pending: 2464 },
    AUTH007: { name: 'Sneha Kulkarni', books: 3, earned: 60865, paid: 53000, pending: 7865 },
    AUTH008: { name: 'Farhan Sheikh', books: 1, earned: 3120, paid: 3120, pending: 0 },
    AUTH009: { name: 'Kavita Deshmukh', books: 2, earned: 850, paid: 0, pending: 850 },
    AUTH010: { name: 'Diya Chatterjee', books: 2, earned: 29115, paid: 25000, pending: 4115 }
  };

  assert.strictEqual(sampleData.authors.length, 10);
  let totalBooksCount = 0;
  let inProdCount = 0;

  sampleData.authors.forEach((author) => {
    const exp = expectedTotals[author.author_id];
    assert.ok(exp, `Author ${author.author_id} found in expected table`);
    assert.strictEqual(author.name, exp.name);
    assert.strictEqual(author.books.length, exp.books);
    totalBooksCount += author.books.length;

    let earned = 0;
    let paid = 0;
    let pending = 0;

    author.books.forEach((b) => {
      if ((b.status || '').toLowerCase().startsWith('in production')) {
        inProdCount++;
        assert.strictEqual(b.publication_date, null);
        assert.strictEqual(b.mrp, null);
        assert.strictEqual(b.author_royalty_per_copy, null);
      } else {
        // Assert invariants
        assert.strictEqual(
          b.total_copies_sold * b.author_royalty_per_copy,
          b.total_royalty_earned,
          `Inconsistent earned calculation in book ${b.book_id}`
        );
        assert.strictEqual(
          b.royalty_paid + b.royalty_pending,
          b.total_royalty_earned,
          `Inconsistent paid + pending sum in book ${b.book_id}`
        );
        earned += b.total_royalty_earned;
        paid += b.royalty_paid;
        pending += b.royalty_pending;
      }
    });

    assert.strictEqual(earned, exp.earned, `Earned mismatch for ${author.name}`);
    assert.strictEqual(paid, exp.paid, `Paid mismatch for ${author.name}`);
    assert.strictEqual(pending, exp.pending, `Pending mismatch for ${author.name}`);
  });

  assert.strictEqual(totalBooksCount, 18);
  assert.strictEqual(inProdCount, 2);
});

test('Author Payout Status as of 2025-12-15 (threshold ON)', () => {
  const asOfDate = '2025-12-15';
  const expectedStatuses = {
    AUTH001: 'Pending',
    AUTH002: 'Overdue', // BK003 last payout was 2025-09-01 (105 days ago)
    AUTH003: 'Overdue', // BK005 never paid, published 2024-06-18
    AUTH004: 'Overdue', // BK006 last payout was 2025-08-20 (117 days ago)
    AUTH005: 'Pending',
    AUTH006: 'Overdue', // BK010 never paid, published 2024-09-05
    AUTH007: 'Pending',
    AUTH008: 'Fully paid',
    AUTH009: 'Pending', // BK016 pending 850 < 1000 threshold (rolls over)
    AUTH010: 'Overdue'  // BK018 never paid, published 2025-01-20
  };

  const counts = { 'Fully paid': 0, 'Pending': 0, 'Overdue': 0 };

  sampleData.authors.forEach((author) => {
    const stats = calculateAuthorStats(author.books, { asOfDate, applyMinPayoutThreshold: true });
    assert.strictEqual(
      stats.payoutStatus,
      expectedStatuses[author.author_id],
      `Status mismatch for ${author.name} (${author.author_id})`
    );
    counts[stats.payoutStatus]++;
  });

  assert.strictEqual(counts['Fully paid'], 1);
  assert.strictEqual(counts['Pending'], 4);
  assert.strictEqual(counts['Overdue'], 5);
});

test('Author Payout Status as of 2026-11-04 (Real current date)', () => {
  const asOfDate = '2026-11-04';
  sampleData.authors.forEach((author) => {
    const stats = calculateAuthorStats(author.books, { asOfDate, applyMinPayoutThreshold: true });
    if (author.author_id === 'AUTH008') {
      assert.strictEqual(stats.payoutStatus, 'Fully paid');
    } else if (author.author_id === 'AUTH009') {
      assert.strictEqual(stats.payoutStatus, 'Pending'); // ₹850 rolls over
    } else {
      assert.strictEqual(stats.payoutStatus, 'Overdue');
    }
  });
});

test('Kavita Deshmukh Threshold Toggle (₹850 Edge Case)', () => {
  const kavita = sampleData.authors.find((a) => a.author_id === 'AUTH009');
  
  // With threshold ON as of 2025-12-15 -> Pending (rolls over)
  const onStats = calculateAuthorStats(kavita.books, { asOfDate: '2025-12-15', applyMinPayoutThreshold: true });
  assert.strictEqual(onStats.payoutStatus, 'Pending');
  const bk016On = onStats.bookStatuses.find((b) => b.book.book_id === 'BK016');
  assert.strictEqual(bk016On.status.code, 'ROLLS_OVER');
  assert.strictEqual(bk016On.status.color, 'yellow');

  // With threshold OFF as of 2025-12-15 -> BK016 published 2024-11-12 never paid > 90d -> Overdue
  const offStats = calculateAuthorStats(kavita.books, { asOfDate: '2025-12-15', applyMinPayoutThreshold: false });
  assert.strictEqual(offStats.payoutStatus, 'Overdue');
  const bk016Off = offStats.bookStatuses.find((b) => b.book.book_id === 'BK016');
  assert.strictEqual(bk016Off.status.code, 'OVERDUE_NO_PAYOUT');
  assert.strictEqual(bk016Off.status.color, 'red');
});

test('AI Output Validation', () => {
  const priya = sampleData.authors[0];
  const factsObj = buildAuthorFacts(priya, priya.books, { asOfDate: '2025-12-15' });

  // Valid output
  const validEmail = {
    subject: 'Your BookLeaf Royalty Summary — December 2025',
    body: `Dear Priya,

I hope you are doing well. It is an absolute pleasure partnering with you at BookLeaf Publishing. Here is an update on your published books and accrued royalties as of 15 Dec 2025.

Your books performance summary:
- Whispers of the Ganges: 342 copies sold, earning ₹11,970 in royalties, with ₹8,400 paid and ₹3,570 currently pending. Last payout was on 15 Oct 2025.
- The Saffron Diaries: 189 copies sold, earning ₹7,938 in total royalties, fully paid up with ₹0 pending as of 1 Dec 2025.

In total, your published titles have generated ₹19,908 in royalties, of which ₹16,338 has been disbursed to date, leaving a pending balance of ₹3,570.

Regarding payout timelines: royalties are calculated quarterly and disbursed within 45 days of quarter end. Next payout is for the quarter ending 31 Dec 2025, due by 14 Feb 2026 directly to your verified bank account.

You can also view a comprehensive sales breakdown by platform in your author dashboard. If you need any assistance, please reach out to us at support@bookleafpub.in.

Warm regards,
Team BookLeaf`
  };

  const validation = validateAiOutput(validEmail, factsObj.factCheckReference);
  assert.strictEqual(validation.isValid, true);
  assert.strictEqual(validation.errors.length, 0);

  // Invalid output: hallucinated amount
  const badAmountEmail = {
    subject: 'Royalty Summary',
    body: `Dear Priya, your pending royalty is ₹99,999. Next payout is soon.`
  };
  const valBadAmount = validateAiOutput(badAmountEmail, factsObj.factCheckReference);
  assert.strictEqual(valBadAmount.isValid, false);
  assert.ok(valBadAmount.errors.some((e) => e.includes('Hallucinated or unverified currency amount')));

  // Invalid output: markdown heading
  const badHeadingEmail = {
    subject: 'Royalty Summary',
    body: `### Dear Priya,\nYour royalties are ₹3,570.`
  };
  const valBadHeading = validateAiOutput(badHeadingEmail, factsObj.factCheckReference);
  assert.strictEqual(valBadHeading.isValid, false);
  assert.ok(valBadHeading.errors.some((e) => e.includes('markdown headings')));

  // Invalid output: bracket placeholder
  const badPlaceholderEmail = {
    subject: 'Royalty Summary',
    body: `Dear [Author Name], your pending royalty is ₹3,570.`
  };
  const valBadPlaceholder = validateAiOutput(badPlaceholderEmail, factsObj.factCheckReference);
  assert.strictEqual(valBadPlaceholder.isValid, false);
  assert.ok(valBadPlaceholder.errors.some((e) => e.includes('unresolved placeholder')));
});
