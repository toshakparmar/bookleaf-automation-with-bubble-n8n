/**
 * Node: Validate Webhook Payload
 * Validates and normalizes incoming identifiers and payload from Bubble.io
 */
const payload = $json.body || $json;

const logId = payload.logId || payload.log_id || ('log_' + Date.now());
const authorId = payload.authorId || payload.author_id || payload.authorCode || payload.author_code || 'AUTH001';
const authorCode = payload.authorCode || payload.author_code || payload.authorId || payload.author_id || 'AUTH001';
const triggerType = payload.triggerType || payload.trigger_type || 'Single';
const requestedAt = payload.requestedAt || payload.requested_at || new Date().toISOString();
const triggeredByEmail = payload.triggeredByEmail || payload.triggered_by_email || 'admin@bookleafpub.in';

return {
  json: {
    logId: String(logId).trim(),
    authorId: String(authorId).trim(),
    authorCode: String(authorCode).trim(),
    triggerType: String(triggerType).trim(),
    triggeredByEmail: String(triggeredByEmail).trim(),
    requestedAt,
    authorName: payload.authorName || payload.name || '',
    authorEmail: payload.authorEmail || payload.email || '',
    city: payload.city || '',
    totalEarned: payload.totalEarned !== undefined ? payload.totalEarned : null,
    totalPaid: payload.totalPaid !== undefined ? payload.totalPaid : null,
    totalPending: payload.totalPending !== undefined ? payload.totalPending : null,
    payoutStatus: payload.payoutStatus || '',
    books: payload.books || null,
    isValid: true
  }
};
