/**
 * Node: Set Error Details
 * Extracts error message, failed step name, and prepares payload for updating Bubble log to Failed.
 */

const errorItem = $json.error || $json;
const errorMessage = errorItem.message || errorItem.description || 'Unknown automation failure';
const errorStep = errorItem.node || errorItem.name || 'n8n Automation Flow';
const logId = $json.logId || ($node['Validate Webhook Payload'] && $node['Validate Webhook Payload'].json.logId) || null;

return {
  json: {
    logId,
    status: 'Failed',
    errorMessage: errorMessage.substring(0, 500),
    errorStep: errorStep.substring(0, 100),
    completedAt: new Date().toISOString()
  }
};
