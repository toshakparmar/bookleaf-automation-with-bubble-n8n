/**
 * Mock LLM API Server
 * Emulates OpenAI Chat Completions endpoint (`POST /v1/chat/completions`) for offline testing.
 */

import express from 'express';
import { validateAiOutput } from '../logic/royalty-engine.js';

export function createMockLlmApp() {
  const app = express();
  app.use(express.json());

  let failureFlags = {
    simulate500: false,
    simulateBadJson: false,
    simulateHallucination: false,
    simulateTimeout: false
  };

  app.post('/v1/chat/completions', (req, res) => {
    if (failureFlags.simulate500 || req.headers['x-simulate-llm'] === '500') {
      return res.status(500).json({
        error: { message: 'Simulated LLM Service Outage (500)', type: 'server_error' }
      });
    }

    if (failureFlags.simulateTimeout || req.headers['x-simulate-llm'] === 'timeout') {
      // Simulate timeout by not responding (or responding after a delay)
      return setTimeout(() => {
        res.status(504).json({ error: { message: 'Gateway Timeout' } });
      }, 5000);
    }

    // Extract facts from user prompt
    const messages = req.body.messages || [];
    const userMsg = messages.find((m) => m.role === 'user')?.content || '';
    
    // Parse facts from <facts> block in prompt if present
    let facts = null;
    const factsMatch = userMsg.match(/<facts>([\s\S]*?)<\/facts>/);
    if (factsMatch) {
      try {
        facts = JSON.parse(factsMatch[1].trim());
      } catch (e) {
        // fallback
      }
    }

    if (!facts) {
      facts = {
        authorFirstName: 'Author',
        asOfDate: '15 Dec 2025',
        totals: { totalEarnedDisplay: '₹0', totalPaidDisplay: '₹0', totalPendingDisplay: '₹0' },
        books: [],
        inProduction: [],
        nextPayout: { explanation: 'Royalties are calculated quarterly and paid within 45 days.' },
        flags: {}
      };
    }

    if (failureFlags.simulateBadJson || req.headers['x-simulate-llm'] === 'bad_json') {
      return res.json({
        id: 'chatcmpl-mock-bad',
        object: 'chat.completion',
        created: Date.now(),
        model: req.body.model || 'gpt-4o-mini',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Dear author, your royalties are ready but this is not JSON!'
            },
            finish_reason: 'stop'
          }
        ]
      });
    }

    if (failureFlags.simulateHallucination || req.headers['x-simulate-llm'] === 'hallucination') {
      return res.json({
        id: 'chatcmpl-mock-hallucinate',
        object: 'chat.completion',
        created: Date.now(),
        model: req.body.model || 'gpt-4o-mini',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: JSON.stringify({
                subject: 'Your Royalty Summary',
                body: `Dear ${facts.authorFirstName},\n\nYou have an extra pending bonus of ₹99,999. Thank you!`
              })
            },
            finish_reason: 'stop'
          }
        ]
      });
    }

    // Generate high quality, compliant royalty summary adhering to all rules
    const fn = facts.authorFirstName;
    const totals = facts.totals;
    const books = facts.books || [];
    const inProd = facts.inProduction || [];
    const nextPayout = facts.nextPayout || {};
    const flags = facts.flags || {};

    let bookBreakdownLines = '';
    if (books.length > 0) {
      bookBreakdownLines = books.map((b) => {
        return `- ${b.title}: ${b.copiesSoldDisplay} copies sold, generating ${b.royaltyEarnedDisplay} in total royalties, with ${b.royaltyPaidDisplay} paid to date and ${b.royaltyPendingDisplay} currently pending (${b.lastPayoutDateDisplay === 'No payout yet' ? 'no payout yet' : 'last payout on ' + b.lastPayoutDateDisplay}).`;
      }).join('\n');
    }

    let scenarioParagraph = '';
    if (flags.allPaid) {
      scenarioParagraph = 'We are pleased to confirm that all accrued royalties across your published titles are fully settled up to date. Thank you for your continued partnership with BookLeaf Publishing.';
    } else if (flags.belowThreshold) {
      scenarioParagraph = `Your current pending royalty balance of ${totals.totalPendingDisplay} is below the ₹1,000 minimum threshold. As per BookLeaf policy, balances under ₹1,000 automatically roll over to accumulate with the upcoming quarter rather than being held up, and will be disbursed once the threshold is reached.`;
    } else if (flags.isOverdue) {
      scenarioParagraph = `We sincerely apologise for the delay in processing your pending payout of ${totals.totalPendingDisplay}. We recognize that this disbursement has exceeded our standard cycle. Our author relations team has formally escalated this record directly to finance, and we will follow up with a resolution update within 48 hours.`;
    } else {
      scenarioParagraph = `Regarding upcoming disbursements: ${nextPayout.explanation} All payments are processed automatically via direct bank transfer to the account registered on your author dashboard.`;
    }

    let inProdSection = '';
    if (inProd.length > 0) {
      const prodTitles = inProd.map((p) => `"${p.title}" (currently at the ${p.stage} stage)`).join(', ');
      inProdSection = `\n\nProduction Update: We are also actively working on your upcoming title(s): ${prodTitles}. Our production team is reviewing your files with care, and you will receive automated email notifications as your project advances through each subsequent stage to publication.`;
    }

    const bodyText = `Dear ${fn},

I hope this message finds you well. It is a genuine pleasure partnering with you on your literary journey at BookLeaf Publishing. Below is your verified royalty summary and account statement as of ${facts.asOfDate}.

Published Books Performance:
${bookBreakdownLines}

Account Summary:
Across your published titles, your books have generated ${totals.totalEarnedDisplay} in total royalties, of which ${totals.totalPaidDisplay} has been disbursed to date, leaving a pending balance of ${totals.totalPendingDisplay}.

${scenarioParagraph}${inProdSection}

You can explore your detailed platform-by-platform sales breakdown anytime on your BookLeaf author dashboard. Please do not hesitate to contact our author support team if you have any questions.

Warm regards,
Team BookLeaf`;

    res.json({
      id: `chatcmpl-mock-${Date.now()}`,
      object: 'chat.completion',
      created: Date.now(),
      model: req.body.model || 'gpt-4o-mini',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: JSON.stringify({
              subject: `Your BookLeaf Royalty Summary & Account Update — ${facts.asOfDate}`,
              body: bodyText
            })
          },
          finish_reason: 'stop'
        }
      ],
      usage: {
        prompt_tokens: 650,
        completion_tokens: 280,
        total_tokens: 930
      }
    });
  });

  app.post('/mock/set-failure', (req, res) => {
    failureFlags = { ...failureFlags, ...req.body };
    res.json({ status: 'llm_flags_updated', flags: failureFlags });
  });

  return { app, failureFlags };
}

if (process.argv[1] && process.argv[1].endsWith('mock-llm.mjs')) {
  const PORT = process.env.MOCK_LLM_PORT || 3002;
  const { app } = createMockLlmApp();
  app.listen(PORT, () => {
    console.log(`Mock LLM API listening on port ${PORT}`);
    console.log(`Endpoint: http://localhost:${PORT}/v1/chat/completions`);
  });
}
