import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const template = fs.readFileSync(path.join(__dirname, '../n8n/nodes/build-facts.js'), 'utf8');
const bubblePayload = {
  logId: 'init_test_001',
  authorId: 'AUTH001',
  authorCode: 'AUTH001',
  authorName: 'Priya Sharma',
  authorEmail: 'priya.sharma@email.com',
  city: 'Mumbai',
  totalEarned: 19908,
  totalPaid: 16338,
  totalPending: 35,
  payoutStatus: 'Pending',
  triggerType: 'Single',
  triggeredByEmail: 'admin@bookleafpub.in',
  requestedAt: '2026-11-06T10:00:00Z'
};

const fn = new Function('$json', '$node', template);
const res = fn(bubblePayload, { 'Validate Webhook Payload': { json: bubblePayload } });
console.log('Valid amounts without SAMPLE_DATASET:', res.json.factCheckReference.validAmounts);
console.log('Facts totals:', res.json.facts.totals);
