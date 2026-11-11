/**
 * Node: Set Error Details
 * Extracts error message, failed step name, and prepares payload for updating Bubble log or responding to webhook.
 */

let rawError = null;
let errorMessage = '';
let errorStep = '';

// 1. Inspect $input item and its attached error property
try {
  if (typeof $input !== 'undefined' && typeof $input.first === 'function' && $input.first()) {
    const item = $input.first();
    if (item.error) {
      rawError = item.error;
    } else if (item.json && item.json.error) {
      rawError = item.json.error;
    } else if (item.json && item.json.executionError) {
      rawError = item.json.executionError;
    }
  }
} catch (e) {}

// 2. Check $error variable
if (!rawError && typeof $error !== 'undefined') {
  rawError = $error;
}

// 3. Check $json object
if (!rawError && typeof $json !== 'undefined' && $json) {
  if ($json.error) rawError = $json.error;
  else if ($json.executionError) rawError = $json.executionError;
  else if ($json.message) rawError = $json;
}

// 4. Extract message and step from rawError
if (rawError) {
  if (typeof rawError === 'string') {
    errorMessage = rawError;
  } else if (typeof rawError === 'object') {
    errorMessage = rawError.message || rawError.description || rawError.errorMessage || '';
    if (!errorMessage && rawError.cause && rawError.cause.message) {
      errorMessage = rawError.cause.message;
    }
    if (rawError.context && rawError.context.node) {
      errorStep = rawError.context.node;
    } else if (rawError.node) {
      errorStep = rawError.node;
    } else if (rawError.name) {
      errorStep = rawError.name;
    }
  }
}

// 5. Inspect upstream nodes directly if still empty
if (!errorMessage) {
  try {
    const aiItem = typeof $ === 'function' ? $('AI Royalty Summary Generation').first() : ($node['AI Royalty Summary Generation'] || null);
    if (aiItem && aiItem.error) {
      errorMessage = 'AI Call Failed: ' + (aiItem.error.message || JSON.stringify(aiItem.error));
      errorStep = 'AI Royalty Summary Generation';
    } else if (aiItem && aiItem.json && aiItem.json.error) {
      errorMessage = 'AI API Error: ' + (aiItem.json.error.message || JSON.stringify(aiItem.json.error));
      errorStep = 'AI Royalty Summary Generation';
    }
  } catch (e) {}
}

if (!errorMessage) {
  try {
    const valItem = typeof $ === 'function' ? $('Validate AI Output & Fact-Check Guard').first() : ($node['Validate AI Output & Fact-Check Guard'] || null);
    if (valItem && valItem.error) {
      errorMessage = 'Validation Failed: ' + (valItem.error.message || JSON.stringify(valItem.error));
      errorStep = 'Validate AI Output & Fact-Check Guard';
    }
  } catch (e) {}
}

// 6. Last fallback
if (!errorMessage && typeof $json === 'object' && $json && Object.keys($json).length > 0) {
  try {
    errorMessage = JSON.stringify($json);
  } catch (e) {
    errorMessage = String($json);
  }
}

if (!errorMessage || errorMessage === '{}') {
  errorMessage = 'Workflow execution error in automation flow';
}

if (!errorStep) {
  errorStep = 'n8n Automation Flow';
}

// 7. Safely extract logId
let logId = null;
try {
  if (typeof $json !== 'undefined' && $json && $json.logId) {
    logId = $json.logId;
  } else if (typeof $ === 'function') {
    logId = $('Validate Webhook Payload').first().json.logId;
  } else if (typeof $node !== 'undefined' && $node['Validate Webhook Payload']) {
    logId = $node['Validate Webhook Payload'].json.logId;
  }
} catch (e) {}

return {
  json: {
    logId: logId || 'unknown',
    status: 'Failed',
    errorMessage: String(errorMessage).substring(0, 500),
    errorStep: String(errorStep).substring(0, 100),
    completedAt: new Date().toISOString()
  }
};
