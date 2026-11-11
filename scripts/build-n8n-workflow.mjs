import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const n8nDir = path.join(__dirname, '../n8n');
const nodesDir = path.join(n8nDir, 'nodes');

const sampleDataJson = fs.readFileSync(path.join(__dirname, '../data/bookleaf_sample_data.json'), 'utf8');
const validatePayloadCode = fs.readFileSync(path.join(nodesDir, 'validate-payload.js'), 'utf8');
const dedupeGuardCode = fs.readFileSync(path.join(nodesDir, 'dedupe-guard.js'), 'utf8');
const buildFactsTemplate = fs.readFileSync(path.join(nodesDir, 'build-facts.js'), 'utf8');
const buildFactsCode = `const SAMPLE_DATASET = ${sampleDataJson};\n\n${buildFactsTemplate}`;
const validateAiOutputCode = fs.readFileSync(path.join(nodesDir, 'validate-ai-output.js'), 'utf8');
const setErrorDetailsCode = fs.readFileSync(path.join(nodesDir, 'set-error-details.js'), 'utf8');
const systemPrompt = fs.readFileSync(path.join(n8nDir, 'prompts/system.md'), 'utf8');

// Build main workflow JSON
const mainWorkflow = {
  name: 'BookLeaf Royalty Summary & Notification Workflow',
  nodes: [
    {
      parameters: {
        content: '## 📚 BookLeaf Royalty Summary Workflow\n\n**Flow:**\n1. Webhook receives `logId`, `authorCode`, etc.\n2. In-flight guard checks duplicates (409 Conflict).\n3. Deterministic code constructs verified facts & display strings.\n4. AI call generates professional email JSON (`subject`, `body`).\n5. Fact-check guard validates zero hallucinated amounts/dates.\n6. Responds HTTP 200 with `{ status: "Success", emailSubject, emailBody }`.\n7. Bubble updates `notificationlog` directly from API Connector response.\n8. Error branch returns `{ status: "Failed", errorMessage, errorStep }`.',
        height: 480,
        width: 380,
        color: 4
      },
      id: 'sticky-legend',
      name: 'Workflow Legend',
      type: 'n8n-nodes-base.stickyNote',
      typeVersion: 1,
      position: [-500, 20]
    },
    {
      parameters: {
        values: {
          string: [
            { name: 'BUBBLE_BASE_URL', value: '={{ $env.BUBBLE_BASE_URL || "https://bookleaf-author-portal-40243.bubbleapps.io/version-test/api/1.1" }}' },
            { name: 'AI_MODEL', value: 'gemini-3.1-flash-lite' },
            { name: 'GEMINI_API_KEY', value: 'AQ.Ab8RN6IOhSTyJ4i5CXLXIGzVz4s54W-Xj6vTdr9KBMN0Eyd4jw' },
            { name: 'SEND_REAL_EMAIL', value: 'false' },
            { name: 'TEST_RECIPIENT', value: 'test-reviewer@bookleafpub.in' }
          ]
        },
        options: {}
      },
      id: 'node-config',
      name: 'Configuration',
      type: 'n8n-nodes-base.set',
      typeVersion: 2,
      position: [-80, 200]
    },
    {
      parameters: {
        httpMethod: 'POST',
        path: 'royalty-summary',
        authentication: 'headerAuth',
        responseMode: 'responseNode',
        options: {}
      },
      id: 'node-webhook',
      name: 'Webhook Trigger',
      type: 'n8n-nodes-base.webhook',
      typeVersion: 2,
      position: [140, 200],
      webhookId: 'bookleaf-royalty-summary-webhook',
      credentials: {
        headerAuth: {
          id: 'cred-webhook-key',
          name: 'BookLeaf Webhook Key'
        }
      }
    },
    {
      parameters: {
        jsCode: validatePayloadCode
      },
      id: 'node-validate-payload',
      name: 'Validate Webhook Payload',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [360, 200]
    },
    {
      parameters: {
        jsCode: dedupeGuardCode
      },
      id: 'node-dedupe',
      name: 'Dedupe & In-Flight Guard',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [580, 200]
    },
    {
      parameters: {
        conditions: {
          boolean: [
            {
              value1: '={{ $json.isDuplicate }}',
              value2: true
            }
          ]
        }
      },
      id: 'node-if-duplicate',
      name: 'Check If Duplicate',
      type: 'n8n-nodes-base.if',
      typeVersion: 1,
      position: [800, 200]
    },
    {
      parameters: {
        respondWith: 'json',
        responseBody: '={{ JSON.stringify({ status: "Duplicate", accepted: false, reason: $json.duplicateReason, existingLogId: $json.existingLogId, elapsedMs: $json.elapsedMs }) }}',
        options: {
          responseCode: 409
        }
      },
      id: 'node-respond-409',
      name: 'Respond 409 Conflict',
      type: 'n8n-nodes-base.respondToWebhook',
      typeVersion: 1.1,
      position: [1020, 80]
    },
    {
      parameters: {
        jsCode: buildFactsCode
      },
      id: 'node-build-facts',
      name: 'Build Facts & Display Strings',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [1020, 320]
    },
    {
      parameters: {
        method: 'POST',
        url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=AQ.Ab8RN6IOhSTyJ4i5CXLXIGzVz4s54W-Xj6vTdr9KBMN0Eyd4jw',
        sendHeaders: true,
        headerParameters: {
          parameters: [
            {
              name: 'Content-Type',
              value: 'application/json'
            },
            {
              name: 'x-goog-api-key',
              value: 'AQ.Ab8RN6IOhSTyJ4i5CXLXIGzVz4s54W-Xj6vTdr9KBMN0Eyd4jw'
            }
          ]
        },
        sendBody: true,
        specifyBody: 'json',
        jsonBody: '={{ JSON.stringify($json.geminiPayload) }}',
        options: {
          timeout: 60000,
          retryOnFail: true,
          maxTries: 2,
          waitBetweenTries: 1500
        }
      },
      id: 'node-ai-call',
      name: 'AI Royalty Summary Generation',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2,
      position: [1260, 320],
      onError: 'continueErrorOutput'
    },
    {
      parameters: {
        jsCode: validateAiOutputCode
      },
      id: 'node-validate-ai',
      name: 'Validate AI Output & Fact-Check Guard',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [1500, 320],
      onError: 'continueErrorOutput'
    },
    {
      parameters: {
        respondWith: 'json',
        responseBody: '={{ JSON.stringify({ status: "Success", emailSubject: $json.emailSubject, emailBody: $json.emailBody, aiModel: $json.aiModel, executionId: $execution.id, completedAt: $json.completedAt }) }}',
        options: {
          responseCode: 200
        }
      },
      id: 'node-respond-success',
      name: 'Respond to Webhook (Success)',
      type: 'n8n-nodes-base.respondToWebhook',
      typeVersion: 1.1,
      position: [1740, 320]
    },
    {
      parameters: {
        jsCode: setErrorDetailsCode
      },
      id: 'node-set-error-details',
      name: 'Set Error Details',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [1500, 560]
    },
    {
      parameters: {
        respondWith: 'json',
        responseBody: '={{ JSON.stringify({ status: "Failed", errorMessage: $json.errorMessage, errorStep: $json.errorStep, completedAt: $json.completedAt }) }}',
        options: {
          responseCode: 200
        }
      },
      id: 'node-respond-failed',
      name: 'Respond to Webhook (Failed)',
      type: 'n8n-nodes-base.respondToWebhook',
      typeVersion: 1.1,
      position: [1740, 560]
    }
  ],
  connections: {
    Configuration: {
      main: [
        [{ node: 'Webhook Trigger', type: 'main', index: 0 }]
      ]
    },
    'Webhook Trigger': {
      main: [
        [{ node: 'Validate Webhook Payload', type: 'main', index: 0 }]
      ]
    },
    'Validate Webhook Payload': {
      main: [
        [{ node: 'Dedupe & In-Flight Guard', type: 'main', index: 0 }]
      ]
    },
    'Dedupe & In-Flight Guard': {
      main: [
        [{ node: 'Check If Duplicate', type: 'main', index: 0 }]
      ]
    },
    'Check If Duplicate': {
      main: [
        [{ node: 'Respond 409 Conflict', type: 'main', index: 0 }],
        [{ node: 'Build Facts & Display Strings', type: 'main', index: 0 }]
      ]
    },
    'Build Facts & Display Strings': {
      main: [
        [{ node: 'AI Royalty Summary Generation', type: 'main', index: 0 }]
      ]
    },
    'AI Royalty Summary Generation': {
      main: [
        [{ node: 'Validate AI Output & Fact-Check Guard', type: 'main', index: 0 }],
        [{ node: 'Set Error Details', type: 'main', index: 0 }]
      ]
    },
    'Validate AI Output & Fact-Check Guard': {
      main: [
        [{ node: 'Respond to Webhook (Success)', type: 'main', index: 0 }],
        [{ node: 'Set Error Details', type: 'main', index: 0 }]
      ]
    },
    'Set Error Details': {
      main: [
        [{ node: 'Respond to Webhook (Failed)', type: 'main', index: 0 }]
      ]
    }
  },
  settings: {
    executionOrder: 'v1',
    saveDataErrorExecution: 'all',
    saveDataSuccessExecution: 'all',
    saveManualExecutions: true,
    callerPolicy: 'workflowsFromSameOwner',
    errorWorkflow: 'error-handler-workflow'
  },
  active: true
};

fs.writeFileSync(
  path.join(n8nDir, 'royalty-summary-workflow.json'),
  JSON.stringify(mainWorkflow, null, 2),
  'utf8'
);

// Build Error Handler workflow JSON
const errorHandlerWorkflow = {
  name: 'BookLeaf Error Handler Workflow',
  nodes: [
    {
      parameters: {
        content: '## 🚨 Global Error Handler\nCatches unhandled errors across workflows and alerts the team via log/notification.',
        height: 200,
        width: 320,
        color: 7
      },
      id: 'sticky-err',
      name: 'Error Handler Legend',
      type: 'n8n-nodes-base.stickyNote',
      typeVersion: 1,
      position: [0, 0]
    },
    {
      parameters: {},
      id: 'node-error-trigger',
      name: 'Error Trigger',
      type: 'n8n-nodes-base.errorTrigger',
      typeVersion: 1,
      position: [120, 200]
    },
    {
      parameters: {
        jsCode: `
const execution = $json.execution || {};
const workflow = $json.workflow || {};
console.error('[CRITICAL] Unhandled workflow error caught in ' + workflow.name + ' (Execution ID: ' + execution.id + ')');
console.error('Error Details:', JSON.stringify($json, null, 2));
return {
  json: {
    workflowName: workflow.name,
    executionId: execution.id,
    errorMessage: execution.error ? execution.error.message : 'Unknown error',
    timestamp: new Date().toISOString()
  }
};
`
      },
      id: 'node-log-error',
      name: 'Log Critical Error',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [360, 200]
    }
  ],
  connections: {
    'Error Trigger': {
      main: [
        [{ node: 'Log Critical Error', type: 'main', index: 0 }]
      ]
    }
  },
  settings: {
    executionOrder: 'v1'
  },
  active: true
};

fs.writeFileSync(
  path.join(n8nDir, 'error-handler-workflow.json'),
  JSON.stringify(errorHandlerWorkflow, null, 2),
  'utf8'
);

console.log('✅ Generated n8n workflows:');
console.log('   - n8n/royalty-summary-workflow.json');
console.log('   - n8n/error-handler-workflow.json');
