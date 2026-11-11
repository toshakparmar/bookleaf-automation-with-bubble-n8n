import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sampleDataJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/bookleaf_sample_data.json'), 'utf8'));
const buildFactsTemplate = fs.readFileSync(path.join(__dirname, '../n8n/nodes/build-facts.js'), 'utf8');
const validateAiOutputCode = fs.readFileSync(path.join(__dirname, '../n8n/nodes/validate-ai-output.js'), 'utf8');
const systemPrompt = fs.readFileSync(path.join(__dirname, '../n8n/prompts/system.md'), 'utf8');

const bubblePayload = {
  logId: "init_test_001",
  authorId: "AUTH001",
  authorCode: "AUTH001",
  authorName: "Priya Sharma",
  authorEmail: "priya.sharma@email.com",
  city: "Mumbai",
  totalEarned: 19908,
  totalPaid: 16338,
  totalPending: 35, // Note the 35 vs 3570!
  payoutStatus: "Pending",
  triggerType: "Single",
  triggeredByEmail: "admin@bookleafpub.in",
  requestedAt: "2026-11-06T10:00:00Z"
};

console.log('--- Step 1: Running Build Facts ---');
const buildFactsFunc = new Function('SAMPLE_DATASET', '$json', '$node', `
  const $env = {};
  ${buildFactsTemplate}
`);

let factsResult;
try {
  const nodeContext = {
    'Validate Webhook Payload': { json: bubblePayload },
    'Fetch Author Data': { json: {} },
    'Fetch Books Data': { json: [] },
    'Fetch Settings': { json: {} }
  };
  factsResult = buildFactsFunc(sampleDataJson, bubblePayload, nodeContext);
  console.log('Build facts succeeded!');
  console.log('Fact check reference amounts:', factsResult.json.factCheckReference.validAmounts);
  console.log('Facts totalPending:', factsResult.json.facts.totalPendingFormatted);
} catch (err) {
  console.error('Build facts failed:', err);
  process.exit(1);
}

console.log('--- Step 2: Calling Gemini API ---');
const requestBody = {
  contents: [
    {
      role: "user",
      parts: [
        {
          text: "System Context & Guidelines:\n" + systemPrompt + "\n\nTask:\nWrite a royalty summary email to " + factsResult.json.facts.authorFirstName + " based on the following verified operational data:\n\n<facts>\n" + JSON.stringify(factsResult.json.facts, null, 2) + "\n</facts>\n\n<scenario_directives>\n" + factsResult.json.scenarioDirectives.join("\n") + "\n</scenario_directives>\n\nRequired JSON format: {\"subject\": \"...\", \"body\": \"...\"}"
        }
      ]
    }
  ],
  generationConfig: {
    responseMimeType: "application/json",
    temperature: 0.3
  }
};

const apiKey = 'AQ.Ab8RN6IOhSTyJ4i5CXLXIGzVz4s54W-Xj6vTdr9KBMN0Eyd4jw';
const model = 'gemini-3.1-flash-lite';
const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

try {
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify(requestBody)
  });

  console.log('Gemini HTTP Status:', resp.status, resp.statusText);
  const data = await resp.json();
  if (!resp.ok) {
    console.error('Gemini error response:', JSON.stringify(data, null, 2));
    process.exit(1);
  }
  console.log('Gemini raw response:', JSON.stringify(data, null, 2).substring(0, 500) + '...');

  console.log('--- Step 3: Running Validate AI Output ---');
  const validateAiFunc = new Function('$json', '$node', `
    ${validateAiOutputCode}
  `);

  const validateNodeContext = {
    'Build Facts & Display Strings': factsResult,
    'Validate Webhook Payload': { json: bubblePayload },
    'Configuration': { json: { AI_MODEL: model } }
  };

  const validationResult = validateAiFunc(data, validateNodeContext);
  console.log('Validation SUCCESS!');
  console.log('Subject:', validationResult.json.emailSubject);
  console.log('Body snippet:\n', validationResult.json.emailBody.substring(0, 300));
} catch (err) {
  console.error('Error during execution:', err.message);
  console.error(err.stack);
}
