import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { calculateAuthorStats } from '../logic/royalty-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sampleData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/bookleaf_sample_data.json'), 'utf8')
);

const outDir = path.join(__dirname, '../bubble/import');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// 1. Authors CSV
const authorRows = [
  'author_code,name,email,phone,city,joined_date,total_books,total_earned,total_paid,total_pending,payout_status'
];

sampleData.authors.forEach((a) => {
  const stats = calculateAuthorStats(a.books, { asOfDate: '2025-12-15' });
  authorRows.push(
    [
      a.author_id,
      `"${a.name}"`,
      a.email,
      `"${a.phone}"`,
      a.city,
      a.joined_date,
      stats.totalBooks,
      stats.totalEarned,
      stats.totalPaid,
      stats.totalPending,
      stats.payoutStatus
    ].join(',')
  );
});

fs.writeFileSync(path.join(outDir, 'authors.csv'), authorRows.join('\n'), 'utf8');

// 2. Books CSV
const bookRows = [
  'book_code,author_code,title,isbn,genre,publication_date,status_text,book_state,mrp,royalty_per_copy,copies_sold,royalty_earned,royalty_paid,royalty_pending,last_payout_date,print_partner,platforms'
];

sampleData.authors.forEach((a) => {
  a.books.forEach((b) => {
    const isProd = (b.status || '').toLowerCase().startsWith('in production');
    const state = isProd ? 'In production' : 'Published';
    const platformsJson = `"[${(b.available_on || []).map((p) => `""${p}""`).join(',')}]"`;
    bookRows.push(
      [
        b.book_id,
        a.author_id,
        `"${b.title.replace(/"/g, '""')}"`,
        b.isbn || '',
        `"${(b.genre || '').replace(/"/g, '""')}"`,
        b.publication_date || '',
        `"${(b.status || '').replace(/"/g, '""')}"`,
        state,
        b.mrp !== null && b.mrp !== undefined ? b.mrp : '',
        b.author_royalty_per_copy !== null && b.author_royalty_per_copy !== undefined
          ? b.author_royalty_per_copy
          : '',
        b.total_copies_sold !== null && b.total_copies_sold !== undefined ? b.total_copies_sold : 0,
        b.total_royalty_earned !== null && b.total_royalty_earned !== undefined
          ? b.total_royalty_earned
          : 0,
        b.royalty_paid !== null && b.royalty_paid !== undefined ? b.royalty_paid : 0,
        b.royalty_pending !== null && b.royalty_pending !== undefined ? b.royalty_pending : 0,
        b.last_royalty_payout_date || '',
        b.print_partner || '',
        platformsJson
      ].join(',')
    );
  });
});

fs.writeFileSync(path.join(outDir, 'books.csv'), bookRows.join('\n'), 'utf8');

// 3. Payouts CSV
const payoutRows = ['author_code,book_code,amount,payout_date,is_cumulative,notes'];

sampleData.authors.forEach((a) => {
  a.books.forEach((b) => {
    if ((b.royalty_paid || 0) > 0) {
      payoutRows.push(
        [
          a.author_id,
          b.book_id,
          b.royalty_paid,
          b.last_royalty_payout_date,
          'yes',
          `"Total paid to date (last payout on ${b.last_royalty_payout_date})"`
        ].join(',')
      );
    }
  });
});

fs.writeFileSync(path.join(outDir, 'payouts.csv'), payoutRows.join('\n'), 'utf8');

// 4. AppSettings CSV
const settingsRows = [
  'as_of_date,overdue_days,min_payout,apply_min_threshold,n8n_timeout_seconds',
  '2025-12-15,90,1000,yes,180'
];

fs.writeFileSync(path.join(outDir, 'appsettings.csv'), settingsRows.join('\n'), 'utf8');

console.log('✅ Generated 4 CSV files in bubble/import/: authors.csv, books.csv, payouts.csv, appsettings.csv');
