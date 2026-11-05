/**
 * Mock Bubble.io Data API Server
 * Provides in-memory emulation of Bubble Data API (v1.1) for local testing and CI.
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { calculateAuthorStats } from '../logic/royalty-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sampleData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/bookleaf_sample_data.json'), 'utf8')
);

export function createMockBubbleApp() {
  const app = express();
  app.use(express.json());

  // In-memory data stores
  let authors = [];
  let books = [];
  let appsettings = [];
  let notificationlogs = [];
  let failureFlags = {
    simulateBubbleDown: false,
    simulatePatchFail: false,
    simulateAuthFail: false
  };

  function seedData() {
    authors = [];
    books = [];
    notificationlogs = [];
    appsettings = [
      {
        _id: 'mock_settings_001',
        as_of_date: '2025-12-15',
        overdue_days: 90,
        min_payout: 1000,
        apply_min_threshold: true,
        n8n_timeout_seconds: 180
      }
    ];

    sampleData.authors.forEach((a) => {
      const authorId = `mock_author_${a.author_id}`;
      const stats = calculateAuthorStats(a.books, { asOfDate: '2025-12-15', applyMinPayoutThreshold: true });

      authors.push({
        _id: authorId,
        author_code: a.author_id,
        name: a.name,
        email: a.email,
        phone: a.phone,
        city: a.city,
        joined_date: a.joined_date,
        total_books: stats.totalBooks,
        total_earned: stats.totalEarned,
        total_paid: stats.totalPaid,
        total_pending: stats.totalPending,
        payout_status: stats.payoutStatus
      });

      a.books.forEach((b) => {
        const isProd = (b.status || '').toLowerCase().startsWith('in production');
        books.push({
          _id: `mock_book_${b.book_id}`,
          book_code: b.book_id,
          author: authorId,
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
        });
      });
    });
  }

  seedData();

  // Middleware for failure simulation & auth check
  app.use((req, res, next) => {
    const authHeader = req.headers.authorization;
    const simFailHeader = req.headers['x-simulate-failure'];

    if (failureFlags.simulateAuthFail || simFailHeader === '401') {
      return res.status(401).json({ status: 'ERROR', message: 'Unauthorized: Invalid Bubble API token' });
    }

    if (failureFlags.simulateBubbleDown || simFailHeader === 'bubble_500') {
      return res.status(500).json({ status: 'ERROR', message: 'Simulated Bubble Service 500 Outage' });
    }

    next();
  });

  // GET /version-test/api/1.1/obj/author/:id
  app.get('/version-test/api/1.1/obj/author/:id', (req, res) => {
    const item = authors.find((a) => a._id === req.params.id || a.author_code === req.params.id);
    if (!item) {
      return res.status(404).json({ status: 'ERROR', message: `Author not found: ${req.params.id}` });
    }
    res.json({ response: item });
  });

  // GET /version-test/api/1.1/obj/author
  app.get('/version-test/api/1.1/obj/author', (req, res) => {
    res.json({
      response: {
        cursor: 0,
        results: authors,
        remaining: 0,
        count: authors.length
      }
    });
  });

  // GET /version-test/api/1.1/obj/book (supports ?constraints=[...])
  app.get('/version-test/api/1.1/obj/book', (req, res) => {
    let results = [...books];
    if (req.query.constraints) {
      try {
        const constraints = JSON.parse(req.query.constraints);
        constraints.forEach((c) => {
          if (c.key === 'author' && c.constraint_type === 'equals') {
            results = results.filter((b) => b.author === c.value || b.author === `mock_author_${c.value}`);
          }
        });
      } catch (e) {
        // Ignore parse error
      }
    }
    res.json({
      response: {
        cursor: 0,
        results,
        remaining: 0,
        count: results.length
      }
    });
  });

  // GET /version-test/api/1.1/obj/appsettings
  app.get('/version-test/api/1.1/obj/appsettings', (req, res) => {
    res.json({
      response: {
        cursor: 0,
        results: appsettings,
        remaining: 0,
        count: appsettings.length
      }
    });
  });

  // GET /version-test/api/1.1/obj/notificationlog/:id
  app.get('/version-test/api/1.1/obj/notificationlog/:id', (req, res) => {
    const item = notificationlogs.find((l) => l._id === req.params.id);
    if (!item) {
      return res.status(404).json({ status: 'ERROR', message: `Notification log not found: ${req.params.id}` });
    }
    res.json({ response: item });
  });

  // POST /version-test/api/1.1/obj/notificationlog
  app.post('/version-test/api/1.1/obj/notificationlog', (req, res) => {
    const logId = req.body._id || `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newRecord = {
      _id: logId,
      ...req.body,
      status: req.body.status || 'Pending',
      requested_at: req.body.requested_at || new Date().toISOString()
    };
    notificationlogs.push(newRecord);
    res.status(201).json({ id: logId, status: 'success' });
  });

  // PATCH /version-test/api/1.1/obj/notificationlog/:id
  app.patch('/version-test/api/1.1/obj/notificationlog/:id', (req, res) => {
    if (failureFlags.simulatePatchFail || req.headers['x-simulate-failure'] === 'patch_500') {
      return res.status(500).json({ status: 'ERROR', message: 'Simulated Bubble PATCH Failure' });
    }

    const idx = notificationlogs.findIndex((l) => l._id === req.params.id);
    if (idx === -1) {
      // Create if not found for testing convenience
      const newRecord = { _id: req.params.id, ...req.body };
      notificationlogs.push(newRecord);
      return res.status(200).json({ status: 'success', id: req.params.id });
    }

    notificationlogs[idx] = {
      ...notificationlogs[idx],
      ...req.body,
      'Modified Date': new Date().toISOString()
    };
    res.status(200).json({ status: 'success', id: req.params.id });
  });

  // Management endpoints for tests
  app.post('/mock/reset', (req, res) => {
    seedData();
    failureFlags = {
      simulateBubbleDown: false,
      simulatePatchFail: false,
      simulateAuthFail: false
    };
    res.json({ status: 'reset_ok' });
  });

  app.post('/mock/set-failure', (req, res) => {
    failureFlags = { ...failureFlags, ...req.body };
    res.json({ status: 'flags_updated', flags: failureFlags });
  });

  app.get('/mock/state', (req, res) => {
    res.json({
      authorsCount: authors.length,
      booksCount: books.length,
      logsCount: notificationlogs.length,
      logs: notificationlogs
    });
  });

  return { app, seedData, failureFlags, getLogs: () => notificationlogs };
}

// Standalone execution when run directly
if (process.argv[1] && process.argv[1].endsWith('mock-bubble-api.mjs')) {
  const PORT = process.env.MOCK_BUBBLE_PORT || 3001;
  const { app } = createMockBubbleApp();
  app.listen(PORT, () => {
    console.log(`Mock Bubble.io Data API listening on port ${PORT}`);
    console.log(`Endpoint: http://localhost:${PORT}/version-test/api/1.1`);
  });
}
