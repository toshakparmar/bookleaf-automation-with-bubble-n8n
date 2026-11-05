Write a royalty summary email to {{ $json.facts.authorFirstName }} based on the following verified operational data.

<facts>
{{ JSON.stringify($json.facts, null, 2) }}
</facts>

<scenario_directives>
{{ $json.scenarioDirectives.join('\n') }}
</scenario_directives>

Required email structure:
1. Warm personal greeting addressing {{ $json.facts.authorFirstName }} by name.
2. One concise introductory sentence confirming their author partnership.
3. Book breakdown: one concise sentence per published title showing copies sold, total royalty earned, royalty already paid, pending amount, and last payout date (or "no payout yet").
4. Consolidated totals: clearly state total earned, total paid, and total pending.
5. Payout timing explanation: strictly convey the timing from nextPayout.explanation.
6. In-production update (if any in-production titles exist in facts): brief reassuring status update on the current production stage and reminder that email notifications arrive at each milestone.
7. Next step & warm sign-off: invite them to check their author dashboard and sign off warmly as "Team BookLeaf".

Remember: Output valid JSON only:
{"subject": "...", "body": "..."}
