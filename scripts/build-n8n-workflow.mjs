import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const n8nDir = path.join(__dirname, '../n8n');
const nodesDir = path.join(n8nDir, 'nodes');

const validatePayloadCode = fs.readFileSync(path.join(nodesDir, 'validate-payload.js'), 'utf8');
const dedupeGuardCode = fs.readFileSync(path.join(nodesDir, 'dedupe-guard.js'), 'utf8');
const buildFactsCode = fs.readFileSync(path.join(nodesDir, 'build-facts.js'), 'utf8');
const validateAiOutputCode = fs.readFileSync(path.join(nodesDir, 'validate-ai-output.js'), 'utf8');
const setErrorDetailsCode = fs.readFileSync(path.join(nodesDir, 'set-error-details.js'), 'utf8');
const systemPrompt = fs.readFileSync(path.join(n8nDir, 'prompts/system.md'), 'utf8');

// Build main workflow JSON
const mainWorkflow = {
  name: 'BookLeaf Royalty Summary & Notification Workflow',
  nodes: [
    {
      parameters: {
        content: '## 📚 BookLeaf Royalty Summary Workflow\n\n**Flow:**\n1. Webhook receives `logId`, `authorId`.\n2. In-flight guard checks duplicates (409).\n3. Webhook responds 202 Accepted immediately (Pattern A).\n4. PATCH log -> `Processing`.\n5. Fetch author, books, appsettings via Bubble Data API.\n6. Code Node constructs deterministic facts & display strings.\n7. AI call generates email JSON (`subject`, `body`).\n8. Fact-check guard validates zero hallucinated amounts/dates.\n9. PATCH log -> `Success` (+ email subject/body).\n10. Error branch -> PATCH log -> `Failed` (+ error/step).',
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
            { name: 'BUBBLE_BASE_URL', value: '={{ $env.BUBBLE_BASE_URL || "https://bookleaf-portal.bubbleapps.io/version-test/api/1.1" }}' },
            { name: 'CALLBACK_MODE', value: 'A' },
            { name: 'AI_MODEL', value: 'gpt-4o-mini' },
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
        responseBody: '={{ JSON.stringify({ accepted: false, reason: $json.duplicateReason, existingLogId: $json.existingLogId, elapsedMs: $json.elapsedMs }) }}',
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
        respondWith: 'json',
        responseBody: '={{ JSON.stringify({ accepted: true, logId: $json.logId, executionId: $execution.id }) }}',
        options: {
          responseCode: 202
        }
      },
      id: 'node-respond-202',
      name: 'Respond 202 Accepted',
      type: 'n8n-nodes-base.respondToWebhook',
      typeVersion: 1.1,
      position: [1020, 320]
    },
    {
      parameters: {
        method: 'PATCH',
        url: '={{ $node["Configuration"].json.BUBBLE_BASE_URL }}/obj/notificationlog/{{ $node["Validate Webhook Payload"].json.logId }}',
        authentication: 'headerAuth',
        sendBody: true,
        specifyBody: 'json',
        jsonBody: '={{ JSON.stringify({ status: "Processing", n8n_execution_id: $execution.id }) }}',
        options: {
          retryOnFail: true,
          maxTries: 3,
          waitBetweenTries: 1000
        }
      },
      id: 'node-patch-processing',
      name: 'PATCH Log to Processing',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2,
      position: [1260, 320],
      credentials: {
        headerAuth: {
          id: 'cred-bubble-token',
          name: 'Bubble Admin Token'
        }
      },
      onError: 'continueErrorOutput'
    },
    {
      parameters: {
        method: 'GET',
        url: '={{ $node["Configuration"].json.BUBBLE_BASE_URL }}/obj/author/{{ $node["Validate Webhook Payload"].json.authorId }}',
        authentication: 'headerAuth',
        options: {
          retryOnFail: true,
          maxTries: 3
        }
      },
      id: 'node-fetch-author',
      name: 'Fetch Author Data',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2,
      position: [1500, 320],
      credentials: {
        headerAuth: {
          id: 'cred-bubble-token',
          name: 'Bubble Admin Token'
        }
      },
      onError: 'continueErrorOutput'
    },
    {
      parameters: {
        method: 'GET',
        url: '={{ $node["Configuration"].json.BUBBLE_BASE_URL }}/obj/book',
        authentication: 'headerAuth',
        sendQuery: true,
        queryParameters: {
          parameters: [
            {
              name: 'constraints',
              value: '={{ JSON.stringify([{ key: "author", constraint_type: "equals", value: $node["Validate Webhook Payload"].json.authorId }]) }}'
            }
          ]
        },
        options: {
          retryOnFail: true,
          maxTries: 3
        }
      },
      id: 'node-fetch-books',
      name: 'Fetch Books Data',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2,
      position: [1740, 320],
      credentials: {
        headerAuth: {
          id: 'cred-bubble-token',
          name: 'Bubble Admin Token'
        }
      },
      onError: 'continueErrorOutput'
    },
    {
      parameters: {
        method: 'GET',
        url: '={{ $node["Configuration"].json.BUBBLE_BASE_URL }}/obj/appsettings',
        authentication: 'headerAuth',
        options: {
          retryOnFail: true,
          maxTries: 3
        }
      },
      id: 'node-fetch-settings',
      name: 'Fetch Settings',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2,
      position: [1980, 320],
      credentials: {
        headerAuth: {
          id: 'cred-bubble-token',
          name: 'Bubble Admin Token'
        }
      },
      onError: 'continueErrorOutput'
    },
    {
      parameters: {
        jsCode: buildFactsCode
      },
      id: 'node-build-facts',
      name: 'Build Facts & Display Strings',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [2220, 320]
    },
    {
      parameters: {
        method: 'POST',
        url: 'https://api.openai.com/v1/chat/completions',
        authentication: 'headerAuth',
        sendBody: true,
        specifyBody: 'json',
        jsonBody: `={{ JSON.stringify({
          model: $node["Configuration"].json.AI_MODEL || "gpt-4o-mini",
          temperature: 0.3,
          max_tokens: 800,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: ${JSON.stringify(systemPrompt)}
            },
            {
              role: "user",
              content: "Write a royalty summary email to " + $json.facts.authorFirstName + " based on the following verified operational data:\\n\\n<facts>\\n" + JSON.stringify($json.facts, null, 2) + "\\n</facts>\\n\\n<scenario_directives>\\n" + $json.scenarioDirectives.join("\\n") + "\\n</scenario_directives>\\n\\nRequired JSON format: {\\"subject\\": \\"...\\", \\"body\\": \\"...\\"}"
            }
          ]
        }) }}`,
        options: {
          timeout: 60000,
          retryOnFail: true,
          maxTries: 3,
          waitBetweenTries: 2000
        }
      },
      id: 'node-ai-call',
      name: 'AI Royalty Summary Generation',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2,
      position: [2460, 320],
      credentials: {
        headerAuth: {
          id: 'cred-llm-key',
          name: 'LLM API Key'
        }
      },
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
      position: [2700, 320]
    },
    {
      parameters: {
        method: 'PATCH',
        url: '={{ $node["Configuration"].json.BUBBLE_BASE_URL }}/obj/notificationlog/{{ $json.logId }}',
        authentication: 'headerAuth',
        sendBody: true,
        specifyBody: 'json',
        jsonBody: '={{ JSON.stringify({ status: "Success", email_subject: $json.emailSubject, email_body: $json.emailBody, completed_at: $json.completedAt, ai_model: $json.aiModel, n8n_execution_id: $execution.id }) }}',
        options: {
          retryOnFail: true,
          maxTries: 3
        }
      },
      id: 'node-patch-success',
      name: 'PATCH Log to Success',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2,
      position: [2940, 320],
      credentials: {
        headerAuth: {
          id: 'cred-bubble-token',
          name: 'Bubble Admin Token'
        }
      }
    },
    {
      parameters: {
        conditions: {
          boolean: [
            {
              value1: '={{ $node["Configuration"].json.SEND_REAL_EMAIL === "true" }}',
              value2: true
            }
          ]
        }
      },
      id: 'node-if-smtp',
      name: 'Check If Send Test SMTP',
      type: 'n8n-nodes-base.if',
      typeVersion: 1,
      position: [3180, 320]
    },
    {
      parameters: {
        fromEmail: 'noreply@bookleafpub.in',
        toEmail: '={{ $node["Configuration"].json.TEST_RECIPIENT }}',
        subject: '={{ "[TEST] " + $node["Validate AI Output & Fact-Check Guard"].json.emailSubject }}',
        text: '={{ $node["Validate AI Output & Fact-Check Guard"].json.emailBody }}',
        options: {}
      },
      id: 'node-send-email-test',
      name: 'Send Test Email (SMTP)',
      type: 'n8n-nodes-base.emailSend',
      typeVersion: 2.1,
      position: [3420, 220],
      credentials: {
        smtp: {
          id: 'cred-smtp',
          name: 'BookLeaf Test SMTP'
        }
      }
    },
    {
      parameters: {
        jsCode: setErrorDetailsCode
      },
      id: 'node-set-error-details',
      name: 'Set Error Details',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [2460, 600]
    },
    {
      parameters: {
        method: 'PATCH',
        url: '={{ $node["Configuration"].json.BUBBLE_BASE_URL }}/obj/notificationlog/{{ $json.logId }}',
        authentication: 'headerAuth',
        sendBody: true,
        specifyBody: 'json',
        jsonBody: '={{ JSON.stringify({ status: "Failed", error_message: $json.errorMessage, error_step: $json.errorStep, completed_at: $json.completedAt }) }}',
        options: {
          retryOnFail: true,
          maxTries: 3
        }
      },
      id: 'node-patch-failed',
      name: 'PATCH Log to Failed',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2,
      position: [2700, 600],
      credentials: {
        headerAuth: {
          id: 'cred-bubble-token',
          name: 'Bubble Admin Token'
        }
      }
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
        [{ node: 'Respond 202 Accepted', type: 'main', index: 0 }]
      ]
    },
    'Respond 202 Accepted': {
      main: [
        [{ node: 'PATCH Log to Processing', type: 'main', index: 0 }]
      ]
    },
    'PATCH Log to Processing': {
      main: [
        [{ node: 'Fetch Author Data', type: 'main', index: 0 }],
        [{ node: 'Set Error Details', type: 'main', index: 0 }]
      ]
    },
    'Fetch Author Data': {
      main: [
        [{ node: 'Fetch Books Data', type: 'main', index: 0 }],
        [{ node: 'Set Error Details', type: 'main', index: 0 }]
      ]
    },
    'Fetch Books Data': {
      main: [
        [{ node: 'Fetch Settings', type: 'main', index: 0 }],
        [{ node: 'Set Error Details', type: 'main', index: 0 }]
      ]
    },
    'Fetch Settings': {
      main: [
        [{ node: 'Build Facts & Display Strings', type: 'main', index: 0 }],
        [{ node: 'Set Error Details', type: 'main', index: 0 }]
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
        [{ node: 'PATCH Log to Success', type: 'main', index: 0 }]
      ]
    },
    'PATCH Log to Success': {
      main: [
        [{ node: 'Check If Send Test SMTP', type: 'main', index: 0 }]
      ]
    },
    'Check If Send Test SMTP': {
      main: [
        [{ node: 'Send Test Email (SMTP)', type: 'main', index: 0 }],
        []
      ]
    },
    'Set Error Details': {
      main: [
        [{ node: 'PATCH Log to Failed', type: 'main', index: 0 }]
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
