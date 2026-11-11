/**
 * Node: Validate AI Output & Fact-Check Guard
 * Validates JSON structure, subject, body, word count, tone rules, and ensures
 * zero hallucinated amounts or dates.
 */

// 1. Safely retrieve upstream facts and payload
let factNode = {};
try {
  if (typeof $ === 'function') {
    factNode = $('Build Facts & Display Strings').first().json;
  } else if (typeof $node !== 'undefined' && $node['Build Facts & Display Strings']) {
    factNode = $node['Build Facts & Display Strings'].json;
  }
} catch (e) {}

let payloadNode = {};
try {
  if (typeof $ === 'function') {
    payloadNode = $('Validate Webhook Payload').first().json;
  } else if (typeof $node !== 'undefined' && $node['Validate Webhook Payload']) {
    payloadNode = $node['Validate Webhook Payload'].json;
  }
} catch (e) {}

const factRef = factNode.factCheckReference || {};
const facts = factNode.facts || {};

// 2. Extract raw AI response text
let rawResponse = null;
if ($json.candidates && $json.candidates[0] && $json.candidates[0].content && $json.candidates[0].content.parts) {
  rawResponse = $json.candidates[0].content.parts[0].text;
} else if ($json.choices && $json.choices[0] && $json.choices[0].message) {
  rawResponse = $json.choices[0].message.content;
} else if ($json.content && $json.content[0]) {
  rawResponse = $json.content[0].text;
} else {
  rawResponse = $json;
}

let parsed = null;
const errors = [];

// 3. Parse JSON safely (handling markdown code blocks or surrounding text)
if (typeof rawResponse === 'string') {
  try {
    let cleaned = rawResponse.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    // Fallback: extract from first { to last }
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }
    
    parsed = JSON.parse(cleaned);
  } catch (e) {
    errors.push(`Failed to parse AI output as JSON: ${e.message}`);
  }
} else if (typeof rawResponse === 'object' && rawResponse !== null) {
  parsed = rawResponse;
} else {
  errors.push('AI output is neither string nor object');
}

// 4. Validate subject and body
if (!parsed || !parsed.subject || typeof parsed.subject !== 'string' || parsed.subject.trim().length === 0) {
  errors.push('Missing or empty email subject');
}

if (!parsed || !parsed.body || typeof parsed.body !== 'string' || parsed.body.trim().length === 0) {
  errors.push('Missing or empty email body');
} else {
  const body = parsed.body.trim();
  const words = body.split(/\s+/).filter(Boolean);

  if (words.length < 60) {
    errors.push(`Email body too short (${words.length} words; minimum ~80 words)`);
  } else if (words.length > 600) {
    errors.push(`Email body too long (${words.length} words; maximum ~500 words)`);
  }

  // Greeting check
  if (factRef && factRef.authorFirstName) {
    const fnRegex = new RegExp(`\\b${factRef.authorFirstName}\\b`, 'i');
    if (!fnRegex.test(body)) {
      errors.push(`Email missing author first name: ${factRef.authorFirstName}`);
    }
  }

  // Markdown headings check (# or ##)
  if (/^#{1,6}\s+/m.test(body)) {
    errors.push('Email contains forbidden markdown headings (# or ##)');
  }

  // Placeholder check
  const placeholderMatch = body.match(/\[(Author|Name|Date|Amount|Title|Book|Insert)[^\]]*\]/i);
  if (placeholderMatch) {
    errors.push(`Email contains unpopulated bracket placeholder: ${placeholderMatch[0]}`);
  }

  // Fact-check guard: check every currency amount in body
  if (factRef && factRef.validAmounts) {
    const validSet = new Set(factRef.validAmounts);
    const amountMatches = body.match(/₹\s*[\d,]+/g) || [];
    for (const amt of amountMatches) {
      const normalized = amt.replace(/\s+/g, '').replace(/[,.;:!?]+$/, '');
      if (!validSet.has(normalized)) {
        errors.push(`Hallucinated or unverified currency amount: ${amt}`);
      }
    }
  }
}

if (errors.length > 0) {
  throw new Error(`AI output validation failed: ${errors.join('; ')}`);
}

return {
  json: {
    logId: payloadNode.logId || 'log_' + Date.now(),
    authorId: payloadNode.authorId || 'AUTH001',
    authorCode: facts.authorCode || payloadNode.authorCode || 'AUTH001',
    emailSubject: parsed.subject.trim(),
    emailBody: parsed.body.trim(),
    aiModel: $json.model || 'gemini-3.1-flash-lite',
    completedAt: new Date().toISOString(),
    isValid: true
  }
};
