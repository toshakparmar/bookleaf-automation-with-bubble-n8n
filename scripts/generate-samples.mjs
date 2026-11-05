import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildAuthorFacts, validateAiOutput, formatIndianCurrency } from '../logic/royalty-engine.js';
import { createMockLlmApp } from '../harness/mock-llm.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sampleData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/bookleaf_sample_data.json'), 'utf8')
);

const samplesDir = path.join(__dirname, '../docs/samples');
if (!fs.existsSync(samplesDir)) {
  fs.mkdirSync(samplesDir, { recursive: true });
}

const mockLlm = createMockLlmApp();
const PORT = 3199;
const server = mockLlm.app.listen(PORT);

async function generateAllSamples() {
  console.log('Generating sample emails for all 10 authors...');

  for (const author of sampleData.authors) {
    const factsObj = buildAuthorFacts(author, author.books, {
      asOfDate: '2025-12-15',
      applyMinPayoutThreshold: true
    });

    const res = await fetch(`http://localhost:${PORT}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are BookLeaf author relations.' },
          {
            role: 'user',
            content: `<facts>\n${JSON.stringify(factsObj.facts, null, 2)}\n</facts>\n<scenario_directives>\n${factsObj.scenarioDirectives.join('\n')}\n</scenario_directives>`
          }
        ]
      })
    });

    const data = await res.json();
    const rawContent = data.choices[0].message.content;
    const validation = validateAiOutput(rawContent, factsObj.factCheckReference);

    if (!validation.isValid) {
      throw new Error(`Validation failed for ${author.name}: ${validation.errors.join(', ')}`);
    }

    const { subject, body } = validation.parsed;
    const wordCount = body.split(/\s+/).filter(Boolean).length;

    const sampleMd = `# Royalty Summary Email Sample: ${author.name} (${author.author_id})

> **Provenance**: Generated via BookLeaf Reference Engine + GPT-4o-Mini Mock Generator  
> **Simulation Reference Date**: 15 Dec 2025  
> **Author Payout Status**: ${factsObj.facts.payoutStatus}  
> **Word Count**: ${wordCount} words  
> **Factual Validation**: Verified (0 unverified numbers, 0 markdown headings, 0 unresolved placeholders)

---

## Operational Facts Snapshot
- **Total Published Books**: ${factsObj.facts.totals.publishedCount}
- **In-Production Titles**: ${factsObj.facts.totals.inProductionCount}
- **Total Royalty Earned**: ${factsObj.facts.totals.totalEarnedDisplay}
- **Total Royalty Disbursed**: ${factsObj.facts.totals.totalPaidDisplay}
- **Current Pending Balance**: ${factsObj.facts.totals.totalPendingDisplay}
- **Next Payout Cycle**: ${factsObj.facts.nextPayout.explanation}
- **Active Scenario Directives**:
${factsObj.scenarioDirectives.map((d) => `  - \`${d}\``).join('\n')}

---

## Generated Subject Line
\`\`\`
${subject}
\`\`\`

## Generated Email Body
\`\`\`
${body}
\`\`\`
`;

    fs.writeFileSync(path.join(samplesDir, `${author.author_id}_${author.name.replace(/\s+/g, '_')}.md`), sampleMd, 'utf8');
    console.log(`  ✓ Generated sample for ${author.author_id} (${author.name}) -> ${wordCount} words`);
  }

  server.close();
  console.log('✅ All 10 sample emails written to docs/samples/');
}

generateAllSamples().catch((err) => {
  console.error('Error generating samples:', err);
  server.close();
  process.exit(1);
});
