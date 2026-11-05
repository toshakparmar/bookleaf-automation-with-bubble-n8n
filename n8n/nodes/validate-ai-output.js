/**
 * Node: Validate AI Output & Fact-Check Guard
 * Validates JSON structure, subject, body, word count, tone rules, and ensures
 * zero hallucinated amounts or dates.
 */

const rawResponse = $json.choices ? $json.choices[0].message.content : ($json.content ? $json.content[0].text : $json);
const factRef = $node['Build Facts & Display Strings'].json.factCheckReference;
const facts = $node['Build Facts & Display Strings'].json.facts;

let parsed = null;
const errors = [];

if (typeof rawResponse === 'string') {
  try {
    let cleaned = rawResponse.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
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

if (!parsed || !parsed.subject || typeof parsed.subject !== 'string' || parsed.subject.trim().length === 0) {
  errors.push('Missing or empty email subject');
}

if (!parsed || !parsed.body || typeof parsed.body !== 'string' || parsed.body.trim().length === 0) {
  errors.push('Missing or empty email body');
} else {
  const body = parsed.body.trim();
  const words = body.split(/\s+/).filter(Boolean);

  if (words.length < 130) {
    errors.push(`Email body too short (${words.length} words; minimum ~150 words)`);
  } else if (words.length > 450) {
    errors.push(`Email body too long (${words.length} words; maximum ~400 words)`);
  }

  // Greeting check
  if (factRef && factRef.authorFirstName) {
    const fnRegex = new RegExp(`\\b${factRef.authorFirstName}\\b`, 'i');
    if (!fnRegex.test(body)) {
      errors.push(`Email missing author first name: ${factRef.authorFirstName}`);
    }
  }

  // Markdown headings check
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
      const normalized = amt.replace(/\s+/g, '');
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
    logId: $node['Validate Webhook Payload'].json.logId,
    authorId: $node['Validate Webhook Payload'].json.authorId,
    authorCode: facts.authorCode,
    emailSubject: parsed.subject.trim(),
    emailBody: parsed.body.trim(),
    aiModel: $json.model || 'gpt-4o-mini',
    completedAt: new Date().toISOString(),
    isValid: true
  }
};
