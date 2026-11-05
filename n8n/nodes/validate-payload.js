/**
 * Node: Validate Webhook Payload
 * Validates that required identifiers are present in the incoming webhook call.
 */
const payload = $json.body || $json;

const logId = payload.logId || payload.log_id;
const authorId = payload.authorId || payload.author_id;
const triggerType = payload.triggerType || payload.trigger_type || 'Single';
const authorCode = payload.authorCode || payload.author_code || '';
const requestedAt = payload.requestedAt || payload.requested_at || new Date().toISOString();
const triggeredByEmail = payload.triggeredByEmail || payload.triggered_by_email || 'admin@bookleafpub.in';

if (!logId || typeof logId !== 'string' || logId.trim().length === 0) {
  throw new Error('Malformed webhook payload: missing or empty logId');
}

if (!authorId || typeof authorId !== 'string' || authorId.trim().length === 0) {
  throw new Error('Malformed webhook payload: missing or empty authorId');
}

return {
  json: {
    logId: logId.trim(),
    authorId: authorId.trim(),
    authorCode: authorCode.trim(),
    triggerType: triggerType.trim(),
    triggeredByEmail: triggeredByEmail.trim(),
    requestedAt,
    isValid: true
  }
};
