#!/usr/bin/env node

/**
 * Seed Bubble.io Data API with BookLeaf Dataset
 *
 * Usage:
 *   node scripts/seed-bubble.mjs [--dry-run] [--as-of YYYY-MM-DD] [--base-url URL]
 *
 * Environment variables:
 *   BUBBLE_APP_NAME    e.g. "bookleaf-portal"
 *   BUBBLE_API_TOKEN   Bubble Admin API Token
 *   BUBBLE_BASE_URL    (optional override, e.g. "http://localhost:3001/version-test/api/1.1")
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  formatIndianCurrency,
  formatDateDisplay,
  calculateAuthorStats
} from '../logic/royalty-engine.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const asOfArgIdx = args.indexOf('--as-of');
const asOfDate = asOfArgIdx !== -1 && args[asOfArgIdx + 1] ? args[asOfArgIdx + 1] : '2025-12-15';
const baseUrlArgIdx = args.indexOf('--base-url');

let baseUrl = baseUrlArgIdx !== -1 && args[baseUrlArgIdx + 1]
  ? args[baseUrlArgIdx + 1]
  : process.env.BUBBLE_BASE_URL;

if (!baseUrl) {
  const appName = process.env.BUBBLE_APP_NAME || 'bookleaf-portal';
  baseUrl = `https://${appName}.bubbleapps.io/version-test/api/1.1`;
}

// Remove trailing slash if present
baseUrl = baseUrl.replace(/\/+$/, '');

const apiToken = process.env.BUBBLE_API_TOKEN || '';

const sampleDataPath = path.join(__dirname, '../data/bookleaf_sample_data.json');
if (!fs.existsSync(sampleDataPath)) {
  console.error(`❌ Sample data file not found at: ${sampleDataPath}`);
  process.exit(1);
}

const sampleData = JSON.parse(fs.readFileSync(sampleDataPath, 'utf8'));

console.log('==================================================================');
console.log('   BookLeaf Publishing — Bubble.io Dataset Seeding & Verifier    ');
console.log('==================================================================');
console.log(`Mode:            ${isDryRun ? 'DRY RUN (No network calls made)' : 'LIVE SEEDING'}`);
console.log(`Reference Date:  ${asOfDate}`);
console.log(`Target Base URL: ${baseUrl}`);
console.log(`Auth Token:      ${apiToken ? 'Set (present)' : 'NOT SET'}`);
console.log('------------------------------------------------------------------\n');

/**
 * Perform authenticated Bubble Data API call
 */
async function bubbleFetch(endpoint, method = 'GET', body = null) {
  const url = `${baseUrl}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {})
  };

  const options = {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {})
  };

  const res = await fetch(url, options);
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Bubble API error [${res.status} ${res.statusText}] at ${url}: ${errorText}`);
  }

  // Handle 204 No Content
  if (res.status === 204) return null;
  return await res.json();
}

/**
 * Query existing records by constraint to avoid duplicates (idempotency)
 */
async function findExistingRecord(type, keyField, keyValue) {
  if (isDryRun) return null;
  try {
    const constraints = JSON.stringify([
      { key: keyField, constraint_type: 'equals', value: keyValue }
    ]);
    const res = await bubbleFetch(`/obj/${type}?constraints=${encodeURIComponent(constraints)}`);
    const results = res.response && res.response.results ? res.response.results : [];
    return results.length > 0 ? results[0] : null;
  } catch (err) {
    // If table is empty or doesn't support constraint yet, proceed with insert
    return null;
  }
}

async function run() {
  console.log('🔍 Phase 1: Verifying Local Dataset Integrity & Computing Stats...');
  let totalBooks = 0;
  let inProdBooks = 0;
  const authorReports = [];

  sampleData.authors.forEach((author) => {
    totalBooks += author.books.length;
    const stats = calculateAuthorStats(author.books, { asOfDate, applyMinPayoutThreshold: true });

    let calculatedEarned = 0;
    let calculatedPaid = 0;
    let calculatedPending = 0;

    author.books.forEach((b) => {
      const isProd = (b.status || '').toLowerCase().startsWith('in production');
      if (isProd) {
        inProdBooks++;
        if (b.mrp !== null || b.publication_date !== null) {
          throw new Error(`Invariant violation: in-production book ${b.book_id} must have null mrp/pubDate`);
        }
      } else {
        const expectedEarned = b.total_copies_sold * b.author_royalty_per_copy;
        if (expectedEarned !== b.total_royalty_earned) {
          throw new Error(`Invariant violation: ${b.book_id} copies * royalty != earned`);
        }
        if (b.royalty_paid + b.royalty_pending !== b.total_royalty_earned) {
          throw new Error(`Invariant violation: ${b.book_id} paid + pending != earned`);
        }
        calculatedEarned += b.total_royalty_earned;
        calculatedPaid += b.royalty_paid;
        calculatedPending += b.royalty_pending;
      }
    });

    authorReports.push({
      authorId: author.author_id,
      name: author.name,
      city: author.city,
      booksCount: author.books.length,
      earned: calculatedEarned,
      paid: calculatedPaid,
      pending: calculatedPending,
      status: stats.payoutStatus
    });
  });

  console.log(`✅ Verified 10 authors, ${totalBooks} books (${inProdBooks} in production, ${totalBooks - inProdBooks} published).`);
  console.log('✅ All dataset invariants hold (copies × royalty = earned; paid + pending = earned).\n');

  console.log('Author Summary (As-Of ' + asOfDate + '):');
  console.table(authorReports.map((r) => ({
    'ID': r.authorId,
    'Author': r.name,
    'City': r.city,
    'Books': r.booksCount,
    'Earned': formatIndianCurrency(r.earned),
    'Paid': formatIndianCurrency(r.paid),
    'Pending': formatIndianCurrency(r.pending),
    'Status': r.status
  })));

  if (isDryRun) {
    console.log('\n[DRY RUN COMPLETE] To seed data into Bubble.io, set BUBBLE_API_TOKEN and run without --dry-run.');
    return;
  }

  if (!apiToken) {
    console.error('❌ Cannot run live seeding without BUBBLE_API_TOKEN. Set it in .env or provide as env variable.');
    process.exit(1);
  }

  console.log('\n🚀 Phase 2: Seeding Bubble.io Data API...');

  // 1. Seed or Update AppSettings
  console.log('  -> Seeding appsettings (as_of_date, overdue_days: 90, min_payout: 1000)...');
  const existingSettings = await findExistingRecord('appsettings', 'overdue_days', 90);
  const settingsPayload = {
    as_of_date: asOfDate,
    overdue_days: 90,
    min_payout: 1000,
    apply_min_threshold: true,
    n8n_timeout_seconds: 180
  };

  if (existingSettings) {
    await bubbleFetch(`/obj/appsettings/${existingSettings._id}`, 'PATCH', settingsPayload);
    console.log(`     Updated existing appsettings (${existingSettings._id})`);
  } else {
    const res = await bubbleFetch('/obj/appsettings', 'POST', settingsPayload);
    console.log(`     Created appsettings (${res.id || 'ok'})`);
  }

  // 2. Seed Authors
  console.log('\n  -> Seeding 10 authors...');
  const authorIdMap = new Map(); // author_code -> Bubble unique _id

  for (const author of sampleData.authors) {
    const stats = calculateAuthorStats(author.books, { asOfDate, applyMinPayoutThreshold: true });
    const existing = await findExistingRecord('author', 'author_code', author.author_id);

    const authorPayload = {
      author_code: author.author_id,
      name: author.name,
      email: author.email,
      phone: author.phone,
      city: author.city,
      joined_date: author.joined_date,
      total_books: stats.totalBooks,
      total_earned: stats.totalEarned,
      total_paid: stats.totalPaid,
      total_pending: stats.totalPending,
      payout_status: stats.payoutStatus
    };

    let bubbleId;
    if (existing) {
      bubbleId = existing._id;
      await bubbleFetch(`/obj/author/${bubbleId}`, 'PATCH', authorPayload);
      console.log(`     Updated author ${author.author_id} (${author.name}) -> ${bubbleId}`);
    } else {
      const res = await bubbleFetch('/obj/author', 'POST', authorPayload);
      bubbleId = res.id;
      console.log(`     Created author ${author.author_id} (${author.name}) -> ${bubbleId}`);
    }
    authorIdMap.set(author.author_id, bubbleId);
  }

  // 3. Seed Books
  console.log('\n  -> Seeding 18 books...');
  const bookIdMap = new Map(); // book_code -> Bubble unique _id

  for (const author of sampleData.authors) {
    const authorBubbleId = authorIdMap.get(author.author_id);

    for (const b of author.books) {
      const isProd = (b.status || '').toLowerCase().startsWith('in production');
      const existing = await findExistingRecord('book', 'book_code', b.book_id);

      const bookPayload = {
        book_code: b.book_id,
        author: authorBubbleId,
        title: b.title,
        isbn: b.isbn || null,
        genre: b.genre || null,
        publication_date: b.publication_date || null,
        status_text: b.status,
        book_state: isProd ? 'In production' : 'Published',
        mrp: b.mrp !== undefined ? b.mrp : null,
        royalty_per_copy: b.author_royalty_per_copy !== undefined ? b.author_royalty_per_copy : null,
        copies_sold: b.total_copies_sold || 0,
        royalty_earned: b.total_royalty_earned || 0,
        royalty_paid: b.royalty_paid || 0,
        royalty_pending: b.royalty_pending || 0,
        last_payout_date: b.last_royalty_payout_date || null,
        print_partner: b.print_partner || null,
        platforms: b.available_on || []
      };

      let bubbleBookId;
      if (existing) {
        bubbleBookId = existing._id;
        await bubbleFetch(`/obj/book/${bubbleBookId}`, 'PATCH', bookPayload);
        console.log(`     Updated book ${b.book_id} ("${b.title}") -> ${bubbleBookId}`);
      } else {
        const res = await bubbleFetch('/obj/book', 'POST', bookPayload);
        bubbleBookId = res.id;
        console.log(`     Created book ${b.book_id} ("${b.title}") -> ${bubbleBookId}`);
      }
      bookIdMap.set(b.book_id, bubbleBookId);
    }
  }

  // 4. Seed Payouts (Cumulative Records)
  console.log('\n  -> Seeding payout history records...');
  for (const author of sampleData.authors) {
    const authorBubbleId = authorIdMap.get(author.author_id);

    for (const b of author.books) {
      if ((b.royalty_paid || 0) > 0) {
        const bookBubbleId = bookIdMap.get(b.book_id);
        const existingPayout = await findExistingRecord('payout', 'notes', `Total paid to date (last payout on ${b.last_royalty_payout_date})`);

        const payoutPayload = {
          author: authorBubbleId,
          book: bookBubbleId,
          amount: b.royalty_paid,
          payout_date: b.last_royalty_payout_date,
          is_cumulative: true,
          notes: `Total paid to date (last payout on ${b.last_royalty_payout_date})`
        };

        if (existingPayout) {
          await bubbleFetch(`/obj/payout/${existingPayout._id}`, 'PATCH', payoutPayload);
          console.log(`     Updated payout record for ${b.book_id} (${formatIndianCurrency(b.royalty_paid)})`);
        } else {
          const res = await bubbleFetch('/obj/payout', 'POST', payoutPayload);
          console.log(`     Created payout record for ${b.book_id} (${formatIndianCurrency(b.royalty_paid)}) -> ${res.id}`);
        }
      }
    }
  }

  console.log('\n==================================================================');
  console.log('   🎉 Live Bubble Seeding Completed Successfully!                ');
  console.log('==================================================================');
}

run().catch((err) => {
  console.error('\n❌ Seeding failed with error:\n', err);
  process.exit(1);
});
